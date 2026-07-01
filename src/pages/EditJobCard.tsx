import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  IndianRupee,
  Calendar,
  MessageCircle,
  Send,
  UserCheck
} from 'lucide-react';
import { openWhatsApp, whatsAppTemplates } from '../utils/whatsapp';
import CopyablePhone from '../components/crm/CopyablePhone';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);
import {
  Button,
  PageLoading,
  Input,
  ClockTimePicker,
} from '../components/ui';

import { useFormValidation, jobCardValidationRules } from '../hooks/useFormValidation';
import { enhancedApiService } from '../services/api.enhanced';
import type { JobCardFormData, JobCard, State, City } from '../types';

import {
  MUMBAI_PRICING_CONFIG,
  buildServiceConfigMap,
  computePerServicePricing,
  deriveServiceCategoryFromItems,
  getServicePackageOptions,
  legacyServiceConfigFromJob,
  parsePackagesFromServiceType,
  priceLinesFromServiceItems,
  serviceItemsToConfigMap,
  supportsAutoPricing,
  syncServiceItemAmountsToTotal,
  validateServiceConfigs,
  type PricingConfig,
  type ServiceConfigMap,
  type ServiceItemConfig,
  type ServicePriceLine,
} from '../utils/jobCardPricing';
import PerServicePricingSection from '../components/crm/PerServicePricingSection';
import { BOOKING_REFERENCE_OPTIONS } from '../constants/references';
import LocationSearchSelect from '../components/forms/LocationSearchSelect';
import GooglePlacesAddressInput from '../components/forms/GooglePlacesAddressInput';
import { applyGooglePlaceToJobForm } from '../utils/applyGooglePlaceToJobForm';
import {
  computeNextServiceDate,
  nextServiceDateHint,
  shouldShowNextServiceField,
} from '../utils/amcNextServiceDate';
import { isSocietyBooking, deriveSocietyContractDuration } from '../constants/bookingPropertyTypes';
import { getErrorMessage, logErrorForDev } from '../utils/errors';
import { showAlert, notify } from '../utils/notify';
import { FormErrorBanner } from '../components/errors';

const EditJobCard: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [jobCard, setJobCard] = useState<JobCard | null>(null);
  
  const {
    errors,
    validateForm,
    clearError,
    scrollToFirstError,
    applyServerErrors,
  } = useFormValidation(jobCardValidationRules);
  const isInitialLoad = React.useRef(true);
  const savedPriceOnLoadRef = React.useRef<number | null>(null);
  const prevMasterStateRef = React.useRef<number | undefined>(undefined);
  const [isPriceManuallyEdited, setIsPriceManuallyEdited] = useState(false);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [serviceConfigs, setServiceConfigs] = useState<ServiceConfigMap>({});
  const [serviceItems, setServiceItems] = useState<ServiceItemConfig[]>([]);
  const [serviceConfigErrors, setServiceConfigErrors] = useState<string[]>([]);
  const [priceBreakdown, setPriceBreakdown] = useState<ServicePriceLine[]>([]);
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>(MUMBAI_PRICING_CONFIG);
  const [pricingConfigReady, setPricingConfigReady] = useState(false);
  const pricingFetchIdRef = React.useRef(0);

  const getInitialFormData = (): JobCardFormData => ({
    client_name: '',
    client_mobile: '',
    client_email: '',
    client_city: '',
    client_address: '',
    client_notes: '',
    job_type: 'Customer',
    service_category: 'One-Time Service',
    property_type: 'Home / Flat',
    bhk_size: '',
    is_paused: false,
    service_type: '',
    schedule_datetime: '',
    time_slot: '',
    state: '',
    city: '',
    status: 'Pending',
    payment_status: 'Unpaid',
    payment_mode: undefined,
    assigned_to: '',
    technician: undefined,
    price: '0.00',
    next_service_date: '',
    reference: '',
    extra_notes: '',
    contract_duration: '',
    notes: '',
    commercial_type: 'home',
    society_billing_type: 'Paid',
    is_price_estimated: false,
    cancellation_reason: '',
    reminder_date: '',
    reminder_time: '',
    reminder_note: '',
    is_reminder_done: false,
    is_amc_main_booking: false,
    is_followup_visit: false,
    included_in_amc: false,
    is_complaint_call: false
  });

  const [formData, setFormData] = useState<JobCardFormData>(getInitialFormData());

  useEffect(() => {
    if (loading || isInitialLoad.current || !pricingConfigReady) return;
    if (selectedPackages.length === 0) {
      setServiceConfigs({});
      return;
    }
    setServiceConfigs((prev) =>
      buildServiceConfigMap(selectedPackages, prev, pricingConfig, formData.commercial_type),
    );
  }, [selectedPackages.join('|'), pricingConfig, formData.commercial_type, loading, pricingConfigReady]);

  useEffect(() => {
    if (loading || isInitialLoad.current || !pricingConfigReady) return;
    if (selectedPackages.length === 0 || Object.keys(serviceConfigs).length === 0) return;

    if (
      supportsAutoPricing(formData.commercial_type, pricingConfig) &&
      !isPriceManuallyEdited
    ) {
      const { total, lines, items } = computePerServicePricing(serviceConfigs, pricingConfig);

      // Keep a manually saved price instead of overwriting with Pricing Master rates.
      if (savedPriceOnLoadRef.current !== null) {
        const savedPrice = savedPriceOnLoadRef.current;
        savedPriceOnLoadRef.current = null;
        if (savedPrice > 0 && Math.abs(savedPrice - total) > 0.009) {
          setIsPriceManuallyEdited(true);
          const syncedItems = syncServiceItemAmountsToTotal(
            serviceItems.length ? serviceItems : items,
            savedPrice,
          );
          setServiceItems(syncedItems);
          setPriceBreakdown(priceLinesFromServiceItems(syncedItems, lines));
          setFormData((prev) => ({
            ...prev,
            price: savedPrice.toFixed(2),
            service_category: deriveServiceCategoryFromItems(syncedItems),
          }));
          setServiceConfigErrors(
            validateServiceConfigs(selectedPackages, serviceConfigs, pricingConfig),
          );
          return;
        }
      }

      setPriceBreakdown(lines);
      setServiceItems(items);
      const category = deriveServiceCategoryFromItems(items);
      const primaryArea = items.find((i) => i.area)?.area || '';
      setFormData((prev) => ({
        ...prev,
        price: total.toFixed(2),
        service_category: category,
        bhk_size: primaryArea || prev.bhk_size,
      }));
      setServiceConfigErrors(validateServiceConfigs(selectedPackages, serviceConfigs, pricingConfig));
      return;
    }

    if (!supportsAutoPricing(formData.commercial_type, pricingConfig)) {
      const { items } = computePerServicePricing(serviceConfigs, pricingConfig);
      const primaryArea = items.find((i) => i.area)?.area || '';
      setServiceItems(items);
      setFormData((prev) => ({
        ...prev,
        service_category: deriveServiceCategoryFromItems(items),
        bhk_size: primaryArea || prev.bhk_size,
      }));
      setServiceConfigErrors(
        validateServiceConfigs(selectedPackages, serviceConfigs, pricingConfig),
      );
    }
  }, [
    selectedPackages,
    serviceConfigs,
    loading,
    isPriceManuallyEdited,
    pricingConfig,
    pricingConfigReady,
    formData.commercial_type,
  ]);

  const [isNextDateManual, setIsNextDateManual] = useState(false);

  // Master Location States
  const [masterStates, setMasterStates] = useState<State[]>([]);
  const [masterCities, setMasterCities] = useState<City[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const [data, statesRes] = await Promise.all([
          enhancedApiService.getJobCard(parseInt(id)),
          enhancedApiService.getStates()
        ]);
        
        setJobCard(data);
        setMasterStates(statesRes.results);

        let citiesForState: City[] = [];
        if (data.master_state) {
          const citiesRes = await enhancedApiService.getCities({
            state: data.master_state,
            page_size: 1000,
          });
          citiesForState = citiesRes.results;
          setMasterCities(citiesForState);
        }
        prevMasterStateRef.current = data.master_state ?? undefined;
        
        const formattedDate = data.schedule_datetime ? dayjs(data.schedule_datetime).tz("Asia/Kolkata").format('YYYY-MM-DD') : '';
        const savedPrice = Number.parseFloat(String(data.price ?? '0')) || 0;
        savedPriceOnLoadRef.current = savedPrice;

        setFormData({
          client_name: data.client_name || '',
          client_mobile: data.client_mobile || '',
          client_email: data.client_email || '',
          client_city: data.client_city || '',
          client_address: data.client_address || '',
          client_notes: data.client_notes || '',
          job_type: data.job_type || 'Customer',
          commercial_type: data.commercial_type || 'home',
          society_billing_type: data.society_billing_type || 'Paid',
          is_price_estimated: data.is_price_estimated || false,
          service_category: data.service_category || 'One-Time Service',
          property_type: data.property_type || 'Home / Flat',
          bhk_size: data.bhk_size || '',
          is_paused: data.is_paused || false,
          service_type: data.service_type || '',
          schedule_datetime: formattedDate,
          time_slot: data.time_slot || (data.schedule_datetime ? dayjs(data.schedule_datetime).tz("Asia/Kolkata").format('hh:mm A') : ''),
          state: data.state || data.master_state_name || '',
          city: data.city || data.master_city_name || '',
          master_country: data.master_country,
          master_state: data.master_state,
          master_city: data.master_city,
          master_location: data.master_location,
          full_address: data.full_address,
          status: data.status || 'Pending',
          payment_status: data.payment_status || 'Unpaid',
          payment_mode: data.payment_mode === 'Cash' || data.payment_mode === 'Online' ? data.payment_mode : undefined,
          assigned_to: data.assigned_to || '',
          technician: data.technician,
          price: data.price?.toString() || '0.00',
          next_service_date: data.next_service_date || '',
          reference: data.reference || '',
          notes: data.notes || '',
          extra_notes: data.extra_notes || '',
          contract_duration: data.contract_duration || '',
          cancellation_reason: data.cancellation_reason || '',
          reminder_date: data.reminder_date || '',
          reminder_time: data.reminder_time ? String(data.reminder_time).slice(0, 5) : '',
          reminder_note: data.reminder_note || '',
          is_reminder_done: data.is_reminder_done || false,
          is_amc_main_booking: data.is_amc_main_booking || false,
          is_followup_visit: data.is_followup_visit || false,
          included_in_amc: data.included_in_amc || false,
          is_complaint_call: data.is_complaint_call || false
        });
        
        // If it already has a next service date, mark it as manual/respected
        if (data.next_service_date) {
          setIsNextDateManual(true);
        }
        
        const packages = parsePackagesFromServiceType(data.service_type || '');
        setSelectedPackages(packages);
        if (data.service_items?.length) {
          setServiceConfigs(serviceItemsToConfigMap(data.service_items));
          const itemsSum = data.service_items.reduce(
            (sum, item) => sum + (Number(item.amount) || 0),
            0,
          );
          if (savedPrice > 0 && Math.abs(savedPrice - itemsSum) > 0.009) {
            setIsPriceManuallyEdited(true);
            savedPriceOnLoadRef.current = null;
            const syncedItems = syncServiceItemAmountsToTotal(data.service_items, savedPrice);
            setServiceItems(syncedItems);
            setPriceBreakdown(priceLinesFromServiceItems(syncedItems));
          } else {
            setServiceItems(data.service_items);
          }
        } else {
          let inferredType = data.service_category || '';
          if (inferredType === 'One-Time Service') inferredType = 'One Time Service';
          if (inferredType === 'AMC') inferredType = 'AMC 3 Services';
          setServiceConfigs(
            legacyServiceConfigFromJob(
              packages,
              data.bhk_size || '',
              data.service_category,
              inferredType,
            ),
          );
        }
        
      } catch (err: any) {
        console.error("Error fetching job card:", err);
      } finally {
        setLoading(false);
        // After states are set and loading is false, allow future pricing updates
        // but only after this specific execution block finishes
        setTimeout(() => {
          isInitialLoad.current = false;
        }, 100);
      }
    };
    fetchData();
  }, [id]);

  // Fetch cities when user changes state (not on duplicate effect runs during load)
  useEffect(() => {
    if (loading) return;

    const stateId = formData.master_state;
    if (!stateId) {
      setMasterCities([]);
      prevMasterStateRef.current = undefined;
      return;
    }

    const stateChanged =
      prevMasterStateRef.current !== undefined &&
      prevMasterStateRef.current !== stateId;

    enhancedApiService
      .getCities({ state: stateId, page_size: 1000 })
      .then(res => {
        setMasterCities(res.results);
        prevMasterStateRef.current = stateId;

        if (stateChanged) {
          const stateName = masterStates.find(s => s.id === stateId)?.name || '';
          setFormData(prev => ({
            ...prev,
            master_city: undefined,
            master_location: undefined,
            state: stateName,
            city: '',
          }));
        }
      })
      .catch(err => console.error('Error fetching cities:', err));
  }, [formData.master_state, loading, masterStates]);

  useEffect(() => {
    if (loading) return;
    const cityName = formData.city || masterCities.find((c) => c.id === formData.master_city)?.name;
    if (!formData.master_city && !cityName) {
      setPricingConfigReady(false);
      return;
    }

    const fetchId = ++pricingFetchIdRef.current;
    const controller = new AbortController();
    const params = formData.master_city
      ? { master_city: formData.master_city }
      : { city: cityName || 'Mumbai' };

    setPricingConfigReady(false);

    enhancedApiService
      .getPricingConfig(params, controller.signal)
      .then((config) => {
        if (fetchId !== pricingFetchIdRef.current) return;
        setPricingConfig(config);
        setPricingConfigReady(true);
      })
      .catch((err) => {
        if (fetchId !== pricingFetchIdRef.current) return;
        if (err?.name === 'CanceledError' || err?.name === 'AbortError') return;
        console.error('Error fetching pricing config:', err);
        setPricingConfigReady(false);
      });

    return () => controller.abort();
  }, [formData.master_city, formData.city, loading, masterCities]);

  const servicePackageOptions = getServicePackageOptions(pricingConfig);

  useEffect(() => {
    const label = selectedPackages.join(', ');
    setFormData((prev) => (prev.service_type === label ? prev : { ...prev, service_type: label }));
  }, [selectedPackages]);

  const toggleServicePackage = (service: string) => {
    setSelectedPackages((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service],
    );
    setIsPriceManuallyEdited(false);
  };

  const handleServicePlanChange = (service: string, plan: string) => {
    setServiceConfigs((prev) => ({
      ...prev,
      [service]: { ...prev[service], plan, area: prev[service]?.area || '' },
    }));
    setIsPriceManuallyEdited(false);
  };

  const handleServiceAreaChange = (service: string, area: string) => {
    setServiceConfigs((prev) => ({
      ...prev,
      [service]: { ...prev[service], area, plan: prev[service]?.plan || '' },
    }));
    setIsPriceManuallyEdited(false);
  };

  // Auto-calculate next service date (AMC +4 months, Bed Bug +15 days)
  useEffect(() => {
    if (loading || isNextDateManual) return;

    const nextDateStr = computeNextServiceDate({
      scheduleDate: formData.schedule_datetime,
      selectedPackages,
      serviceCategory: formData.service_category,
      serviceItems,
    });

    if (nextDateStr && nextDateStr !== formData.next_service_date) {
      setFormData((prev) => ({ ...prev, next_service_date: nextDateStr }));
    }
  }, [
    selectedPackages,
    serviceItems,
    formData.service_category,
    formData.schedule_datetime,
    isNextDateManual,
    loading,
  ]);

  const handleInputChange = (field: keyof JobCardFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    clearError(field);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (selectedPackages.length === 0) {
      showAlert('Please select at least one service.');
      return;
    }
    const configErrors = validateServiceConfigs(selectedPackages, serviceConfigs, pricingConfig);
    if (configErrors.length > 0) {
      setServiceConfigErrors(configErrors);
      showAlert(configErrors.join('\n'));
      return;
    }
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      console.error('Validation errors:', validationErrors);
      const errorFields = Object.keys(validationErrors).map(field => field.replace('_', ' ')).join(', ');
      showAlert(`Please fix the following errors: ${errorFields}`);
      setTimeout(() => { scrollToFirstError(); }, 100);
      return;
    }
    try {
      setSubmitting(true);
      setSubmitError('');
      // Ensure schedule_datetime is in ISO format
      const manualPrice = Number.parseFloat(String(formData.price || '0')) || 0;
      const itemsForSubmit = isPriceManuallyEdited
        ? syncServiceItemAmountsToTotal(serviceItems, manualPrice)
        : serviceItems;
      const submitData = {
        ...formData,
        price: manualPrice > 0 ? manualPrice.toFixed(2) : formData.price,
        job_type: (isSocietyBooking(formData) ? 'Society' : 'Customer') as 'Society' | 'Customer',
        contract_duration: isSocietyBooking(formData)
          ? (formData.contract_duration || deriveSocietyContractDuration(itemsForSubmit))
          : formData.contract_duration,
        society_billing_type: isSocietyBooking(formData)
          ? (formData.society_billing_type || 'Paid')
          : null,
        service_items: itemsForSubmit,
        service_category: deriveServiceCategoryFromItems(itemsForSubmit),
      };
      if (submitData.schedule_datetime) {
        // Create a dayjs object from the date part in IST
        let combined = dayjs.tz(submitData.schedule_datetime, "Asia/Kolkata");
        
        if (submitData.time_slot) {
          const timeMatch = submitData.time_slot.match(/(\d+):(\d+)/);
          const ampmMatch = submitData.time_slot.match(/(AM|PM)/i);
          
          if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const ampm = ampmMatch ? ampmMatch[0].toUpperCase() : 'AM';
            
            if (ampm === 'PM' && hours < 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;
            
            combined = combined.hour(hours).minute(minutes).second(0);
          }
        } else {
          // If no time slot is selected, default to a reasonable time (e.g., 10 AM)
          // or keep existing time if available. For now, let's keep midnight if not specified.
          combined = combined.hour(10).minute(0).second(0);
        }
        submitData.schedule_datetime = combined.toISOString();
      }
      // Do not wipe partner-recorded payment mode when the dropdown was never loaded/set
      if (submitData.payment_mode !== 'Cash' && submitData.payment_mode !== 'Online') {
        delete submitData.payment_mode;
      }
      if (!submitData.reminder_date) {
        submitData.reminder_date = '';
        submitData.reminder_time = '';
      }
      await enhancedApiService.updateJobCard(parseInt(id!), submitData);
      navigate('/jobcards');
    } catch (err: unknown) {
      logErrorForDev('EditJobCard', err);
      const applied = applyServerErrors(err);
      const msg = getErrorMessage(err, 'Failed to update booking. Please check all fields.');
      if (applied) {
        notify.warning('Please correct the highlighted fields.');
        setTimeout(() => scrollToFirstError(), 100);
      } else {
        setSubmitError(msg);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoading text="Loading booking..." />;
  if (!jobCard) return <div className="p-10 text-center">Booking Not Found</div>;

  return (
    <div className="space-y-4 px-1 sm:px-0 bg-gray-50/10 h-full pb-10 relative">
      {/* Page Title Area (Simplified) */}
      <div className="flex items-center gap-3 px-4 py-4 -mx-4 sm:mx-0 mb-2">
        <button type="button" onClick={() => navigate(-1)} className="p-1.5 hover:bg-white rounded border border-gray-200 transition-colors shadow-sm bg-white/50">
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </button>
        <div className="flex flex-col">
          <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none">Edit Booking</h1>
          <span className="text-[11px] font-bold text-gray-500 mt-1">{jobCard.code || jobCard.id}</span>
        </div>

        {/* WhatsApp Actions */}
        <div className="flex items-center gap-2 ml-auto bg-white/50 p-1.5 rounded-lg border border-gray-200">
          <button
            onClick={() => openWhatsApp(formData.client_mobile, whatsAppTemplates.bookingConfirmation({
              clientName: formData.client_name,
              bookingId: jobCard.code || jobCard.id.toString(),
              serviceType: formData.service_type,
              area: formData.bhk_size || formData.property_type || '',
              date: dayjs(formData.schedule_datetime).format('DD/MM/YYYY'),
              time: formData.time_slot || dayjs(formData.schedule_datetime).format('hh:mm A'),
              amount: formData.price?.toString() || '0',
              address: formData.client_address || ''
            }))}
            className="p-2 bg-green-50 hover:bg-green-600 text-green-600 hover:text-white rounded-md transition-all shadow-sm"
            title="Send Confirmation"
          >
            <MessageCircle className="h-4 w-4" />
          </button>

          {jobCard.technician_mobile && (
            <>
              <button
                onClick={() => openWhatsApp(jobCard.technician_mobile!, whatsAppTemplates.technicianJobDetails({
                  techName: jobCard.technician_name || jobCard.assigned_to || '',
                  bookingId: jobCard.code || jobCard.id.toString(),
                  clientName: formData.client_name,
                  clientMobile: formData.client_mobile,
                  serviceType: formData.service_type,
                  area: formData.bhk_size || formData.property_type || '',
                  amount: formData.price?.toString() || '0',
                  address: formData.client_address || '',
                  dateTime: `${dayjs(formData.schedule_datetime).format('DD/MM/YYYY')} @ ${formData.time_slot || dayjs(formData.schedule_datetime).format('hh:mm A')}`,
                  instructions: formData.notes || ''
                }))}
                className="p-2 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-md transition-all shadow-sm"
                title="Send to Technician"
              >
                <Send className="h-4 w-4" />
              </button>

              <button
                onClick={() => openWhatsApp(formData.client_mobile, whatsAppTemplates.technicianAssigned({
                  clientName: formData.client_name,
                  bookingId: jobCard.code || jobCard.id.toString(),
                  techName: jobCard.technician_name || jobCard.assigned_to || '',
                  techContact: jobCard.technician_mobile || '',
                  serviceType: formData.service_type,
                  area: formData.bhk_size || formData.property_type || '',
                  dateTime: `${dayjs(formData.schedule_datetime).format('DD/MM/YYYY')} @ ${formData.time_slot || dayjs(formData.schedule_datetime).format('hh:mm A')}`,
                  amount: formData.price?.toString() || '0'
                }))}
                className="p-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-md transition-all shadow-sm"
                title="Notify Client (Tech Assigned)"
              >
                <UserCheck className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {jobCard.service_timeline && jobCard.service_timeline.length > 1 && (
        <div className="max-w-6xl mx-auto bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <h4 className="text-[13px] font-extrabold text-violet-700 uppercase tracking-widest mb-4 border-b border-gray-100 pb-2">
            Service Visit Timeline
          </h4>
          <div className="space-y-4">
            {Object.entries(
              jobCard.service_timeline.reduce<Record<string, typeof jobCard.service_timeline>>((acc, row) => {
                const key = row.service_name || 'Service';
                if (!acc[key]) acc[key] = [];
                acc[key].push(row);
                return acc;
              }, {}),
            ).map(([serviceName, visits]) => (
              <div key={serviceName} className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
                <p className="text-sm font-black text-gray-900 mb-3">{serviceName}</p>
                <ul className="space-y-2">
                  {visits.map((v) => (
                    <li key={v.id} className="flex flex-wrap items-center gap-3 text-[11px]">
                      <span className="font-bold text-gray-700">
                        Visit {v.visit_number}{v.total_visits ? ` of ${v.total_visits}` : ''}
                      </span>
                      {v.visit_type && (
                        <span className="bg-violet-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
                          {v.visit_type}
                        </span>
                      )}
                      <span className="text-gray-600">
                        {v.scheduled_date ? dayjs(v.scheduled_date).format('DD MMM YYYY') : '—'}
                      </span>
                      <span className={`font-black uppercase ${
                        v.status === 'Done' ? 'text-emerald-600' :
                        v.status === 'Upcoming' ? 'text-violet-600' : 'text-orange-600'
                      }`}>
                        {v.status}
                      </span>
                    </li>
                  ))}
                </ul>
                {visits.find((v) => v.status === 'Upcoming')?.scheduled_date && (
                  <p className="mt-3 text-[11px] font-bold text-violet-800">
                    Next scheduled visit:{' '}
                    {dayjs(visits.find((v) => v.status === 'Upcoming')!.scheduled_date).format('DD MMM YYYY')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-5">
          <FormErrorBanner message={submitError} />
          {/* Section: Client & Location */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h4 className="text-[13px] font-extrabold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
              <User className="h-4 w-4" /> Client & Service Location
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-4">
              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Mobile Number</label>
                <div className="flex h-10 items-center rounded-md border border-gray-200 bg-gray-50 px-3 shadow-sm">
                  <CopyablePhone phone={formData.client_mobile} className="text-sm font-medium text-gray-600" />
                </div>
              </div>
              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Client Name</label>
                <Input value={formData.client_name} readOnly disabled className="h-10 text-sm font-medium bg-gray-50 text-gray-500 shadow-sm uppercase" />
              </div>
              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Service State *</label>
                <select
                  value={formData.master_state || ''}
                  onChange={(e) => {
                    const stateId = Number(e.target.value);
                    const stateName = masterStates.find(s => s.id === stateId)?.name || '';
                    setFormData(prev => ({
                      ...prev,
                      master_state: stateId,
                      state: stateName,
                    }));
                    clearError('master_state');
                  }}
                  className="w-full h-10 px-3 text-sm font-medium border border-gray-300 rounded-lg shadow-sm outline-none focus:border-blue-500 bg-white"
                  required
                >
                  <option value="">Select State</option>
                  {masterStates.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Service City *</label>
                <select
                  value={formData.master_city || ''}
                  onChange={(e) => {
                    const cityId = Number(e.target.value);
                    const cityName = masterCities.find(c => c.id === cityId)?.name || '';
                    setFormData(prev => ({
                      ...prev,
                      master_city: cityId,
                      city: cityName,
                      master_location: undefined,
                    }));
                    setIsPriceManuallyEdited(false);
                    clearError('master_city');
                  }}
                  className="w-full h-10 px-3 text-sm font-medium border border-gray-300 rounded-lg shadow-sm outline-none focus:border-blue-500 bg-white"
                  disabled={!formData.master_state}
                  required
                >
                  <option value="">Select City</option>
                  {masterCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Service Location *</label>
                <LocationSearchSelect
                  value={formData.master_location}
                  defaultLabel={
                    formData.master_location
                      ? [jobCard?.master_location_name, formData.city || jobCard?.master_city_name]
                          .filter(Boolean)
                          .join(', ')
                      : undefined
                  }
                  onChange={(locationId, cityId, stateId) => {
                    const cityName = cityId
                      ? masterCities.find(c => c.id === cityId)?.name
                      : undefined;
                    const stateName = stateId
                      ? masterStates.find(s => s.id === stateId)?.name
                      : undefined;
                    setFormData(prev => ({
                      ...prev,
                      master_location: locationId,
                      master_city: cityId ?? prev.master_city,
                      master_state: stateId ?? prev.master_state,
                      city: cityName ?? prev.city,
                      state: stateName ?? prev.state,
                    }));
                  }}
                />
              </div>

              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Commercial Type *</label>
                <select
                  value={formData.commercial_type}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setFormData(prev => ({ 
                      ...prev, 
                      commercial_type: val,
                      society_billing_type: val === 'society' ? (prev.society_billing_type || 'Paid') : 'Paid',
                      is_price_estimated: !supportsAutoPricing(val, pricingConfig),
                      price: supportsAutoPricing(val, pricingConfig) ? prev.price : '0.00'
                    }));
                    clearError('commercial_type');
                  }}
                  className={`w-full h-10 px-3 text-sm font-bold border rounded-lg shadow-sm outline-none focus:border-blue-500 bg-white ${errors.commercial_type ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="home">Home (Residential)</option>
                  <option value="hotel">Hotel</option>
                  <option value="society">Society</option>
                  <option value="villa">Villa</option>
                  <option value="office">Office</option>
                  <option value="other">Other Commercial</option>
                </select>
              </div>

              {isSocietyBooking(formData) && (
                <div className="lg:col-span-2">
                  <label className="text-[13px] font-bold text-gray-700 mb-2 block">
                    Society Service Billing *
                  </label>
                  <div className="flex flex-wrap gap-4">
                    {(['Paid', 'Free'] as const).map((option) => (
                      <label
                        key={option}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-bold cursor-pointer transition-colors ${
                          formData.society_billing_type === option
                            ? option === 'Free'
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                              : 'bg-blue-50 border-blue-300 text-blue-800'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="society_billing_type"
                          value={option}
                          checked={formData.society_billing_type === option}
                          onChange={() =>
                            setFormData((prev) => ({ ...prev, society_billing_type: option }))
                          }
                          className="sr-only"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Booking Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className={`w-full h-10 px-3 text-sm font-bold border rounded-lg shadow-sm outline-none focus:border-blue-500 bg-white ${errors.status ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="Pending">Pending</option>
                  <option value="On Process">On Process</option>
                  <option value="Done">Done</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {formData.status === 'Cancelled' && (
                <div className="lg:col-span-2">
                  <label className="text-[13px] font-bold text-red-700 mb-1.5 block">Cancellation Reason *</label>
                  <Input 
                    value={formData.cancellation_reason || ''} 
                    onChange={(e) => handleInputChange('cancellation_reason', e.target.value)} 
                    error={errors.cancellation_reason}
                    className="h-10 text-sm font-medium text-gray-900 shadow-sm border-red-200 bg-red-50/30" 
                    placeholder="Enter reason for cancellation (min 4 chars)"
                    required 
                  />
                </div>
              )}

              {formData.status === 'Pending' && formData.removal_remarks && (
                <div className="lg:col-span-2">
                  <label className="text-[13px] font-bold text-amber-700 mb-1.5 block">Removal Remarks</label>
                  <Input 
                    value={formData.removal_remarks || ''} 
                    onChange={(e) => handleInputChange('removal_remarks', e.target.value)} 
                    error={errors.removal_remarks}
                    className="h-10 text-sm font-medium text-gray-900 shadow-sm border-amber-200 bg-amber-50/30" 
                    placeholder="Remarks for technician removal"
                  />
                </div>
              )}

              <div className="lg:col-span-4">
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Detailed Address *</label>
                <GooglePlacesAddressInput
                  id="client_address"
                  name="client_address"
                  value={formData.client_address}
                  onChange={(v) => handleInputChange('client_address', v)}
                  onPlaceSelect={async (place) => {
                    const { updates, cities } = await applyGooglePlaceToJobForm(
                      place,
                      masterStates,
                      (stateId) =>
                        enhancedApiService
                          .getCities({ state: stateId, page_size: 1000 })
                          .then((r) => r.results),
                    );
                    if (cities.length > 0) setMasterCities(cities);
                    setFormData((prev) => ({ ...prev, ...updates }));
                    clearError('client_address');
                  }}
                  error={errors.client_address}
                  required
                />
              </div>
            </div>
          </div>

          {/* Section: Service Configuration & Pricing */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
             <div className="absolute inset-0 bg-blue-50/30 pointer-events-none" />
             <div className="relative z-10 flex flex-col lg:flex-row lg:items-start gap-6">
                <div className="flex-1 flex flex-col gap-4">
                   <div>
                      <label className="text-[13px] font-bold text-gray-700 mb-2 block">
                        Select Service * <span className="font-normal text-gray-500">(multi-select)</span>
                      </label>
                      <div className="rounded-lg border border-gray-200 bg-white p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {servicePackageOptions.map((service) => {
                          const checked = selectedPackages.includes(service);
                          return (
                            <label
                              key={service}
                              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                                checked
                                  ? 'border-blue-500 bg-blue-50/80 ring-1 ring-blue-200'
                                  : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                checked={checked}
                                onChange={() => toggleServicePackage(service)}
                              />
                              <span className="text-sm font-semibold text-gray-800">{service}</span>
                            </label>
                          );
                        })}
                      </div>
                      {selectedPackages.length > 0 && (
                        <p className="text-[11px] font-bold text-blue-700 mt-2">
                          Selected: {selectedPackages.join(' + ')}
                        </p>
                      )}
                      {errors.service_type && (
                        <p className="text-[10px] text-red-500 font-bold mt-1 uppercase">{errors.service_type}</p>
                      )}
                   </div>
                   <PerServicePricingSection
                     selectedPackages={selectedPackages}
                     serviceConfigs={serviceConfigs}
                     pricingConfig={pricingConfig}
                     commercialType={formData.commercial_type}
                     onPlanChange={handleServicePlanChange}
                     onAreaChange={handleServiceAreaChange}
                     validationErrors={serviceConfigErrors}
                     scheduleDate={formData.schedule_datetime}
                   />
                </div>

                <div className="flex flex-col items-start lg:items-end justify-center min-w-[140px] pl-4 lg:border-l border-gray-200">
                   <span className="text-[12px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                     {supportsAutoPricing(formData.commercial_type, pricingConfig) ? 'Total Price' : 'Estimated Price'}
                   </span>
                   {supportsAutoPricing(formData.commercial_type, pricingConfig) ? (
                     <div className="text-4xl font-black text-gray-900 flex items-center">
                        <span className="text-2xl mr-1 text-gray-400">₹</span>
                        {formData.price}
                     </div>
                   ) : (
                     <div className="flex flex-col items-start lg:items-end">
                       <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-1 rounded-md tracking-tighter uppercase mb-1">To be decided</span>
                       <span className="text-sm font-bold text-gray-400 italic leading-tight">After Visit</span>
                     </div>
                   )}
                </div>
             </div>
             
             {!supportsAutoPricing(formData.commercial_type, pricingConfig) && (
               <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                 <p className="text-xs font-bold text-amber-700 italic">“Technician visit ke baad final rate diya jayega.”</p>
               </div>
             )}
          </div>

          {/* Section: Schedule & Assignment */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h4 className="text-[13px] font-extrabold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
              <Calendar className="h-4 w-4" /> Schedule & Assignment
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Booking Type *</label>
                <select
                  value={formData.is_amc_main_booking ? 'amc_main' : formData.is_followup_visit ? 'amc_followup' : formData.is_complaint_call ? 'complaint' : 'new'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'amc_main') {
                      setFormData(prev => ({ 
                        ...prev, 
                        is_amc_main_booking: true, 
                        is_followup_visit: false, 
                        included_in_amc: false,
                        is_complaint_call: false,
                        service_category: 'AMC'
                      }));
                    } else if (val === 'amc_followup') {
                      setFormData(prev => ({ 
                        ...prev, 
                        is_amc_main_booking: false, 
                        is_followup_visit: true, 
                        included_in_amc: true,
                        is_complaint_call: false,
                        price: '0',
                        payment_status: 'Paid',
                        service_category: 'AMC'
                      }));
                    } else if (val === 'complaint') {
                      setFormData(prev => ({ 
                        ...prev, 
                        is_amc_main_booking: false, 
                        is_followup_visit: false, 
                        included_in_amc: false,
                        is_complaint_call: true,
                        price: '0',
                        payment_status: 'Paid'
                      }));
                    } else {
                      setFormData(prev => ({ 
                        ...prev, 
                        is_amc_main_booking: false, 
                        is_followup_visit: false, 
                        included_in_amc: false,
                        is_complaint_call: false
                      }));
                    }
                  }}
                  className="w-full h-10 px-3 text-sm font-medium border border-gray-300 rounded-lg shadow-sm outline-none focus:border-blue-500 bg-white"
                  required
                >
                  <option value="new">New Booking</option>
                  <option value="amc_main">AMC Main Booking</option>
                  <option value="amc_followup">AMC Follow-up</option>
                  <option value="complaint">Complaint Call</option>
                </select>
              </div>
              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Schedule Date *</label>
                <Input id="schedule_datetime" name="schedule_datetime" type="date" value={formData.schedule_datetime} onChange={(e) => handleInputChange('schedule_datetime', e.target.value)} className={`w-full h-10 px-3 text-sm font-medium border rounded-lg shadow-sm ${errors.schedule_datetime ? 'border-red-500' : 'border-gray-300'}`} required />
                {errors.schedule_datetime && <p className="text-[10px] text-red-500 font-bold mt-1 uppercase">{errors.schedule_datetime}</p>}
              </div>
              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Available Time Slot *</label>
                <ClockTimePicker
                  value={formData.time_slot || ''}
                  onChange={(val) => handleInputChange('time_slot', val)}
                  placeholder="Select Time"
                />
                {errors.time_slot && <p className="text-[10px] text-red-500 font-bold mt-1 uppercase">{errors.time_slot}</p>}
              </div>
              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Service Price Override</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    type="number" 
                    value={formData.price} 
                    onChange={(e) => {
                      const nextPrice = e.target.value;
                      handleInputChange('price', nextPrice);
                      setIsPriceManuallyEdited(true);
                      const parsed = Number.parseFloat(nextPrice);
                      if (!Number.isNaN(parsed) && serviceItems.length > 0) {
                        const syncedItems = syncServiceItemAmountsToTotal(serviceItems, parsed);
                        setServiceItems(syncedItems);
                        setPriceBreakdown(priceLinesFromServiceItems(syncedItems, priceBreakdown));
                      }
                    }} 
                    className="w-full h-10 pl-9 pr-3 text-sm font-bold border-gray-300 rounded-lg outline-none text-blue-700 bg-white shadow-sm" 
                    required 
                  />
                </div>
              </div>

              {/* Next Service Date Field */}
              {shouldShowNextServiceField(
                selectedPackages,
                '',
                formData.service_category,
                serviceItems,
              ) && (
                <div className="animate-fade-in md:col-span-1">
                  <label className="text-[13px] font-bold text-blue-700 mb-1.5 block">Next Service Date (Auto-calculated)</label>
                  <Input
                    type="date"
                    value={formData.next_service_date}
                    onChange={(e) => {
                      handleInputChange('next_service_date', e.target.value);
                      setIsNextDateManual(true);
                    }}
                    className="w-full h-10 px-3 text-sm font-bold border-blue-200 bg-blue-50/50 rounded-lg shadow-sm focus:border-blue-500"
                  />
                  <p className="text-[10px] text-blue-600 font-bold mt-1 uppercase italic">
                    {nextServiceDateHint(
                      selectedPackages,
                      '',
                      formData.service_category,
                      serviceItems,
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Section: Payment & Reference */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Payment Status</label>
                <select
                  value={formData.payment_status}
                  onChange={(e) => handleInputChange('payment_status', e.target.value)}
                  className="w-full h-10 px-3 text-sm font-medium border border-gray-300 rounded-lg shadow-sm outline-none focus:border-blue-500 bg-white"
                >
                  <option value="Paid">Paid</option>
                  <option value="Unpaid">Unpaid</option>
                </select>
              </div>

              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Payment Mode</label>
                <select
                  value={formData.payment_mode || ''}
                  onChange={(e) => handleInputChange('payment_mode', e.target.value)}
                  className="w-full h-10 px-3 text-sm font-medium border border-gray-300 rounded-lg shadow-sm outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">Select Mode</option>
                  <option value="Cash">Cash</option>
                  <option value="Online">Online</option>
                </select>
              </div>

              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Reference *</label>
                <select
                  value={formData.reference}
                  onChange={(e) => handleInputChange('reference', e.target.value)}
                  className={`w-full h-10 px-3 text-sm font-medium border rounded-lg shadow-sm outline-none bg-white ${errors.reference ? 'border-red-500' : 'border-gray-300'}`}
                  required
                >
                  <option value="">Select Reference</option>
                  {BOOKING_REFERENCE_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {errors.reference && <p className="text-[10px] text-red-500 font-bold mt-1 uppercase">{errors.reference}</p>}
              </div>
            </div>
          </div>

          {/* Section: Reminders */}
          <div className="bg-white p-5 rounded-xl border border-orange-200 shadow-sm bg-orange-50/10">
            <h4 className="text-[13px] font-extrabold text-orange-600 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-orange-100 pb-2">
              <Calendar className="h-4 w-4" /> Set Follow-up Reminder
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Reminder Date</label>
                <Input
                  type="date"
                  value={formData.reminder_date || ''}
                  onChange={(e) => handleInputChange('reminder_date', e.target.value)}
                  className="w-full h-10 px-3 text-sm font-medium border-gray-300 rounded-lg shadow-sm"
                />
              </div>
              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Reminder Time</label>
                <Input
                  type="time"
                  value={formData.reminder_time || ''}
                  onChange={(e) => handleInputChange('reminder_time', e.target.value)}
                  className="w-full h-10 px-3 text-sm font-medium border-gray-300 rounded-lg shadow-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Reminder Note</label>
                <textarea
                  value={formData.reminder_note || ''}
                  onChange={(e) => handleInputChange('reminder_note', e.target.value)}
                  rows={1}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm font-medium outline-none focus:border-blue-500 shadow-sm"
                  placeholder="e.g., Call client for feedback..."
                />
              </div>
            </div>
          </div>

          {/* Section: Notes */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
             <label className="text-[13px] font-bold text-gray-700 mb-2 block">Additional Internal Notes</label>
             <textarea
               value={formData.notes || ''}
               onChange={(e) => handleInputChange('notes', e.target.value)}
               rows={2}
               placeholder="Optional notes or context..."
               className="w-full border border-gray-300 rounded-lg p-3 text-sm font-medium outline-none focus:border-blue-500 shadow-sm"
             />
          </div>

          {/* Action Footer (Non-Sticky) */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm mt-8 flex flex-col sm:flex-row items-center justify-end gap-3">
             <Button type="button" variant="outline" onClick={() => navigate(-1)} className="h-10 px-6 text-[13px] font-bold text-gray-600 hover:bg-gray-50 border-gray-300">Discard Changes</Button>
             <Button type="submit" disabled={submitting} className="h-10 px-8 text-[13px] font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
               {submitting ? 'Saving...' : 'Update Booking'}
             </Button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default EditJobCard;
