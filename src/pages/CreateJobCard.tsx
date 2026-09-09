import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Phone,
  IndianRupee,
  Calendar,
  MessageCircle,
  Building2,
  SprayCan,
  StickyNote
} from 'lucide-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

import {
  Input,
  ClockTimePicker,
} from '../components/ui';

import { useFormValidation, jobCardValidationRules } from '../hooks/useFormValidation';
import { enhancedApiService } from '../services/api.enhanced';
import type { JobCardFormData, State, City } from '../types';
import { useRevenueModelV2 } from '../hooks/useRevenueModelV2';
import {
  fireAndForget,
  sendBookingConfirmationApi,
  sendInquiryReceivedApi,
} from '../services/whatsappPc99Send';

import {
  MUMBAI_PRICING_CONFIG,
  buildServiceConfigMap,
  computeBookingGstSummary,
  computePerServicePricing,
  deriveServiceCategoryFromItems,
  finalizeServiceLinePricing,
  getServicePackageOptions,
  mergeCatalogIntoServiceItems,
  priceLinesFromServiceItems,
  summarizeServicePricing,
  supportsAutoPricing,
  validateServiceConfigs,
  type PricingConfig,
  type ServiceConfigMap,
  type ServiceItemConfig,
  type ServicePriceLine,
} from '../utils/jobCardPricing';
import { groupServiceOptions } from '../utils/serviceGrouping';
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
import { getErrorMessage, logErrorForDev } from '../utils/errors';
import { showAlert, notify } from '../utils/notify';
import { FormErrorBanner } from '../components/errors';
import {
  BOOKING_PROPERTY_TYPES,
  bookingKindFromCommercialType,
  commercialTypeFromPropertyType,
  isSocietyBooking,
  RESIDENTIAL_PROPERTY_TYPE,
  deriveSocietyContractDuration,
} from '../constants/bookingPropertyTypes';

/**
 * Layout tokens for this form. Every section reuses these so the vertical
 * rhythm, column gaps, label offsets and control heights stay identical from
 * the top of the page to the footer. Change a value here rather than on an
 * individual field, otherwise rows stop lining up across sections.
 */
const FORM_STACK = 'space-y-4 sm:space-y-5';
/** Padding/radius only — each section adds its own border and background colour. */
const SECTION_CARD_BASE = 'p-4 sm:p-5 lg:p-6 rounded-xl border shadow-sm';
const SECTION_CARD = `bg-white border-gray-200 ${SECTION_CARD_BASE}`;
/** Spacing/typography only — each section adds its own text and divider colour. */
const SECTION_HEADING =
  'text-[13px] font-extrabold uppercase tracking-widest mb-4 sm:mb-5 flex items-center gap-2 border-b pb-2.5';
/** Three columns on desktop, two on tablet, one on mobile. */
const FIELD_GRID = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 lg:gap-x-5 gap-y-4 sm:gap-y-5';
const FIELD_LABEL = 'text-[13px] font-bold text-gray-700 mb-1.5 block';
const FIELD_HELP = 'text-[10px] text-gray-500 mt-1.5';
const FIELD_ERROR = 'text-[10px] text-red-500 font-bold mt-1.5 uppercase';
const TEXTAREA_CONTROL =
  'w-full min-h-[76px] border border-gray-300 rounded-lg p-3 text-sm font-medium outline-none focus:border-blue-500 shadow-sm resize-y';

const CreateJobCard: React.FC = () => {
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [savingInquiry, setSavingInquiry] = useState(false);
  
  // Pricing selector states
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [serviceConfigs, setServiceConfigs] = useState<ServiceConfigMap>({});
  const [serviceItems, setServiceItems] = useState<ServiceItemConfig[]>([]);
  const serviceItemsRef = useRef<ServiceItemConfig[]>([]);
  serviceItemsRef.current = serviceItems;
  const [serviceConfigErrors, setServiceConfigErrors] = useState<string[]>([]);
  const [priceBreakdown, setPriceBreakdown] = useState<ServicePriceLine[]>([]);
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>(MUMBAI_PRICING_CONFIG);
  const [pricingConfigReady, setPricingConfigReady] = useState(false);
  const [pricingConfigFailed, setPricingConfigFailed] = useState(false);
  const pricingFetchIdRef = useRef(0);

  /**
   * The seeded config is a hardcoded pre-2026 list whose services the rate
   * chart import deactivated, so it must never be offered as a real choice.
   * Only a payload from the API carries `source`.
   */
  const catalogueLoaded = Boolean(pricingConfig.source);

  // Initial form state
  const getInitialFormData = (): JobCardFormData => {
    return {
      client_name: '',
      client_mobile: '',
      client_email: '',
      client_state: '',
      client_city: '',
      client_address: '',
      client_notes: '',
      job_type: 'Customer',
      commercial_type: 'home',
      society_billing_type: 'Paid',
      is_price_estimated: false,
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
      assigned_to: '',
      technician: undefined,
      price: '0.00',
      next_service_date: '',
      reference: '',
      master_location: undefined,
      contract_duration: '',
      notes: '',
      extra_notes: '',
      reminder_date: '',
      reminder_time: '',
      reminder_note: '',
      is_amc_main_booking: false,
      is_followup_visit: false,
      included_in_amc: false,
      is_complaint_call: false,
      package_tier: '',
      payment_model: '',
      technician_share_percent: 40,
      company_share_percent: 60,
      planned_visit_count: null,
      discount_amount: 0,
    };
  };

  const [formData, setFormData] = useState<JobCardFormData>(getInitialFormData());
  const revenueModelEnabled = useRevenueModelV2();

  // When revenue model is enabled, default new bookings to revenue_sharing
  useEffect(() => {
    if (!revenueModelEnabled) return;
    setFormData((prev) =>
      prev.payment_model
        ? prev
        : { ...prev, payment_model: 'revenue_sharing' },
    );
  }, [revenueModelEnabled]);

  const servicePackageOptions = getServicePackageOptions(pricingConfig).filter(
    (service) => service !== 'Hotel / Commercial',
  );
  // Grouped by pest so tiers of the same service sit together, base tier first.
  const serviceGroups = useMemo(
    () => groupServiceOptions(servicePackageOptions),
    [servicePackageOptions.join('|')],
  );

  // Sync service_type from selected packages
  useEffect(() => {
    const label = selectedPackages.join(', ');
    setFormData((prev) => ({ ...prev, service_type: label }));
    if (label) validateField('service_type', label);
  }, [selectedPackages]);

  // Reconcile per-service plan/area when selection or pricing config changes
  useEffect(() => {
    if (selectedPackages.length === 0) {
      setServiceConfigs({});
      setServiceItems([]);
      setPriceBreakdown([]);
      return;
    }
    setServiceConfigs((prev) =>
      buildServiceConfigMap(selectedPackages, prev, pricingConfig, formData.commercial_type),
    );
  }, [selectedPackages.join('|'), pricingConfig, formData.commercial_type]);

  // Per-service pricing total (city-aware via pricingConfig) — preserves discounts.
  useEffect(() => {
    if (
      !pricingConfigReady ||
      selectedPackages.length === 0 ||
      Object.keys(serviceConfigs).length === 0
    ) {
      if (supportsAutoPricing(formData.commercial_type, pricingConfig)) {
        setPriceBreakdown([]);
        setServiceItems([]);
        setServiceConfigErrors([]);
        setFormData((prev) => ({ ...prev, price: '0.00', discount_amount: 0 }));
      }
      return;
    }

    const { lines: catalogLines, items: catalogItems } = computePerServicePricing(
      serviceConfigs,
      pricingConfig,
    );
    const configErrors = validateServiceConfigs(selectedPackages, serviceConfigs, pricingConfig);
    setServiceConfigErrors(configErrors);

    const merged = mergeCatalogIntoServiceItems(catalogItems, serviceItemsRef.current);
    const totals = summarizeServicePricing(merged);
    const category = deriveServiceCategoryFromItems(merged);
    const primaryArea = merged.find((i) => i.area)?.area || '';
    setServiceItems(merged);
    setPriceBreakdown(priceLinesFromServiceItems(merged, catalogLines));
    setFormData((formPrev) => ({
      ...formPrev,
      ...(supportsAutoPricing(formPrev.commercial_type, pricingConfig)
        ? { price: totals.finalAmount.toFixed(2) }
        : {}),
      discount_amount: totals.totalDiscount,
      service_category: category,
      bhk_size: primaryArea || formPrev.bhk_size,
    }));
  }, [
    selectedPackages,
    serviceConfigs,
    formData.commercial_type,
    pricingConfig,
    pricingConfigReady,
  ]);

  const gstSummary = useMemo(
    () => computeBookingGstSummary(serviceConfigs, pricingConfig),
    [serviceConfigs, pricingConfig],
  );

  // Client check state
  const [clientCheckStatus, setClientCheckStatus] = useState<'idle' | 'loading' | 'found' | 'not-found' | 'error'>('idle');
  const [foundClientName, setFoundClientName] = useState<string>('');
  const [lastCheckedMobile, setLastCheckedMobile] = useState<string>('');



  // Master Location States
  const [masterStates, setMasterStates] = useState<State[]>([]);
  const [masterCities, setMasterCities] = useState<City[]>([]);

  const [isNextDateManual, setIsNextDateManual] = useState(false);

  // 1. Initial State Fetch
  useEffect(() => {
    enhancedApiService.getStates()
      .then(res => {
        setMasterStates(res.results);
        const maharashtra = res.results.find(s => s.name.toLowerCase() === 'maharashtra');
        if (maharashtra && !formData.master_state) {
          setFormData(prev => ({ ...prev, master_state: maharashtra.id, state: maharashtra.name }));
        }
      })
      .catch(err => console.error('Error fetching states:', err));
  }, []);

  // 2. Fetch Cities when State changes + Auto-select Mumbai
  useEffect(() => {
    if (formData.master_state) {
      enhancedApiService.getCities({ state: formData.master_state, page_size: 1000 })
        .then(res => {
          setMasterCities(res.results);
          
          // Auto-select Mumbai if this is Maharashtra and no city is selected
          const state = masterStates.find(s => s.id === formData.master_state);
          if (state?.name.toLowerCase() === 'maharashtra' && !formData.master_city) {
            const mumbai = res.results.find(c => c.name.toLowerCase() === 'mumbai');
            if (mumbai) {
              setFormData(prev => ({ ...prev, master_city: mumbai.id, city: mumbai.name }));
            }
          }

          // Reset city if not in results (unless it was just set by auto-select)
          setFormData(prev => {
            if (prev.master_city && res.results.some(c => c.id === prev.master_city)) return prev;
            // If we just auto-selected Mumbai in the block above, the state update is pending,
            // but for safety, we only reset if it's truly invalid.
            return prev; 
          });
        })
        .catch(err => console.error('Error fetching cities:', err));
    } else {
      setMasterCities([]);
    }
  }, [formData.master_state, masterStates.length]); // Added masterStates.length to ensure it runs after states are loaded

  // 3. Load city-specific pricing when Service City changes (ignore stale responses)
  useEffect(() => {
    const cityName = formData.city || masterCities.find((c) => c.id === formData.master_city)?.name;
    const hasCity = Boolean(formData.master_city || cityName);

    const fetchId = ++pricingFetchIdRef.current;
    const controller = new AbortController();
    // With no city yet, load the default region's catalogue anyway so the
    // service list shows the real services. Bailing out here left the form on
    // the hardcoded fallback, which still lists the pre-2026 services that the
    // rate chart import deactivated.
    const params = !hasCity
      ? {}
      : formData.master_city
        ? { master_city: formData.master_city }
        : { city: cityName || 'Mumbai' };

    setPricingConfigReady(false);

    enhancedApiService
      .getPricingConfig(params, controller.signal)
      .then((config) => {
        if (fetchId !== pricingFetchIdRef.current) return;
        setPricingConfig(config);
        setPricingConfigFailed(false);
        // Auto-pricing stays off until a city is chosen: rates differ by region
        // and the default catalogue would quote the wrong one.
        setPricingConfigReady(hasCity);
      })
      .catch((err) => {
        if (fetchId !== pricingFetchIdRef.current) return;
        if (err?.name === 'CanceledError' || err?.name === 'AbortError') return;
        console.error('Error fetching pricing config:', err);
        setPricingConfigReady(false);
        setPricingConfigFailed(true);
      });

    return () => controller.abort();
  }, [formData.master_city, formData.city, masterCities]);

  // Auto-calculate next service date (AMC +4 months, Bed Bug +15 days)
  useEffect(() => {
    if (isNextDateManual) return;

    const nextDateStr = computeNextServiceDate({
      scheduleDate: formData.schedule_datetime,
      selectedPackages,
      serviceCategory: formData.service_category,
      serviceItems,
    });

    if (nextDateStr) {
      setFormData((prev) =>
        prev.next_service_date === nextDateStr
          ? prev
          : { ...prev, next_service_date: nextDateStr },
      );
    } else if (!shouldShowNextServiceField(selectedPackages, '', formData.service_category, serviceItems)) {
      setFormData((prev) =>
        prev.next_service_date === '' ? prev : { ...prev, next_service_date: '' },
      );
    }
  }, [
    selectedPackages,
    serviceItems,
    formData.service_category,
    formData.schedule_datetime,
    isNextDateManual,
  ]);








  // Form validation
  const {
    errors,
    validateField,
    validateForm,
    clearError,
    scrollToFirstError,
    applyServerErrors,
  } = useFormValidation(jobCardValidationRules);

  // Handle input changes with localStorage persistence and validation
  const handleInputChange = (field: keyof JobCardFormData, value: any) => {
    let updatedFormData = {
      ...formData,
      [field]: value
    };

    // Sync legacy fields if master fields are updated
    if (field === 'master_state') {
      const state = masterStates.find(s => s.id === value);
      if (state) {
        updatedFormData.state = state.name;
      }
    } else if (field === 'master_city') {
      const city = masterCities.find(c => c.id === value);
      if (city) {
        updatedFormData.city = city.name;
        updatedFormData.master_location = undefined;
      }
    }

    setFormData(updatedFormData);
    clearError(field);
    
    return updatedFormData;
  };


  const toggleServicePackage = (service: string) => {
    setSelectedPackages((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service],
    );
  };

  const handleServicePlanChange = (service: string, plan: string) => {
    setServiceConfigs((prev) => ({
      ...prev,
      [service]: { ...prev[service], plan, area: prev[service]?.area || '' },
    }));
  };

  const handleServiceAreaChange = (service: string, area: string) => {
    setServiceConfigs((prev) => ({
      ...prev,
      [service]: { ...prev[service], area, plan: prev[service]?.plan || '' },
    }));
  };

  const syncTotalsFromItems = (items: ServiceItemConfig[]) => {
    const totals = summarizeServicePricing(items);
    setPriceBreakdown(priceLinesFromServiceItems(items));
    setFormData((prev) => ({
      ...prev,
      price: totals.finalAmount.toFixed(2),
      discount_amount: totals.totalDiscount,
    }));
  };

  const handleServiceBaseAmountChange = (service: string, baseAmount: number) => {
    setServiceItems((prev) => {
      const next = prev.map((item) => {
        if (item.service !== service) return item;
        return {
          ...item,
          ...finalizeServiceLinePricing(baseAmount, item.discount || 0),
        };
      });
      syncTotalsFromItems(next);
      return next;
    });
  };

  const handleServiceDiscountChange = (service: string, discount: number) => {
    setServiceItems((prev) => {
      const next = prev.map((item) => {
        if (item.service !== service) return item;
        return {
          ...item,
          ...finalizeServiceLinePricing(item.baseAmount ?? item.amount, discount),
        };
      });
      syncTotalsFromItems(next);
      return next;
    });
  };

  // Check if client exists by mobile number
  const checkClientExists = async (mobile: string) => {
    if (mobile.length !== 10) return;
    setClientCheckStatus('loading');
    try {
      const response = await enhancedApiService.checkClientExists(mobile);
      if (response.exists && response.client) {
        const client = response.client;
        setClientCheckFound(client.full_name || 'Unknown Client');
        setFormData(prev => ({
          ...prev,
          client_name: client.full_name || '',
          client_email: client.email || '',
          client_state: client.state || '',
          client_city: client.city || '',
          client_address: client.address || '',
          client_notes: client.notes || ''
        }));
      } else {
        setClientCheckNotFound();
      }
    } catch (error: any) {
      console.error('Error checking client:', error);
    }
  };

  const setClientCheckFound = (clientName: string) => {
    setClientCheckStatus('found');
    setFoundClientName(clientName);
  };

  const setClientCheckNotFound = () => {
    setClientCheckStatus('not-found');
  };

  const resetClientCheckState = () => {
    setClientCheckStatus('idle');
  };

  // Handle mobile number change
  const handleMobileChange = (value: string) => {
    const numericValue = value.replace(/\D/g, '').slice(0, 10);
    if (numericValue !== lastCheckedMobile) {
      resetClientCheckState();
    }
    handleInputChange('client_mobile', numericValue);
    if (numericValue.length === 10 && numericValue !== lastCheckedMobile) {
      setLastCheckedMobile(numericValue);
      checkClientExists(numericValue);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const submitData = {
        ...formData,
        property_type:
          formData.commercial_type === 'home'
            ? RESIDENTIAL_PROPERTY_TYPE
            : formData.property_type,
        job_type: (isSocietyBooking(formData) ? 'Society' : 'Customer') as 'Society' | 'Customer',
        contract_duration: isSocietyBooking(formData)
          ? (formData.contract_duration || deriveSocietyContractDuration(serviceItems))
          : formData.contract_duration,
        society_billing_type: isSocietyBooking(formData)
          ? (formData.society_billing_type || 'Paid')
          : null,
        service_items: serviceItems.map((item) => ({
          service: item.service,
          plan: item.plan,
          area: item.area,
          base_amount: item.baseAmount,
          discount: item.discount,
          amount: item.amount,
        })),
        discount_amount: summarizeServicePricing(serviceItems).totalDiscount,
        ...(supportsAutoPricing(formData.commercial_type, pricingConfig)
          ? { price: summarizeServicePricing(serviceItems).finalAmount.toFixed(2) }
          : {}),
        service_category: deriveServiceCategoryFromItems(serviceItems),
      };
      if (!submitData.next_service_date && submitData.schedule_datetime) {
        const computed = computeNextServiceDate({
          scheduleDate: submitData.schedule_datetime,
          selectedPackages,
          serviceCategory: submitData.service_category,
          serviceItems,
        });
        if (computed) submitData.next_service_date = computed;
      }
      if (submitData.schedule_datetime) {
        // Create a dayjs object from the date part (local time)
        let combined = dayjs(submitData.schedule_datetime);
        
        if (submitData.time_slot) {
          // Robust regex to find the first time (HH:MM) and AM/PM anywhere in the slot
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
        }
        submitData.schedule_datetime = combined.toISOString();
      }
      const created = await enhancedApiService.createJobCard(submitData, clientCheckStatus === 'found');
      fireAndForget(sendBookingConfirmationApi(created));
      navigate('/jobcards');
    } catch (err: unknown) {
      logErrorForDev('CreateJobCard', err);
      const applied = applyServerErrors(err);
      const msg = getErrorMessage(err, 'Failed to create booking. Please check all fields.');
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

  // The app shell (main#crm-app-main) already applies px-4 py-4, so the page
  // root only tops that up on wider screens rather than setting its own padding.
  return (
    <div className="bg-gray-50/10 h-full relative sm:px-2 lg:px-4 pb-10">
      {/* Page Title Area — shares the form's container so it aligns with the cards. */}
      <div className="max-w-6xl mx-auto flex items-center gap-3 pb-4 sm:pb-5">
        <button type="button" onClick={() => navigate('/jobcards')} className="p-1.5 hover:bg-white rounded border border-gray-200 transition-colors shadow-sm bg-white/50">
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </button>
        <div className="flex flex-col">
          <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none">New Booking</h1>
          <span className="text-[11px] font-bold text-gray-500 mt-1">Fill out the details below</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        <form onSubmit={handleSubmit} className={FORM_STACK}>
          <FormErrorBanner message={submitError} />
          
          {/* Section: Client & Location */}
          <div className={SECTION_CARD}>
            <h4 className={`${SECTION_HEADING} text-blue-600 border-gray-100`}>
              <User className="h-4 w-4" /> Client & Service Location
            </h4>

            <div className={FIELD_GRID}>
              <div>
                <label className={FIELD_LABEL}>Mobile Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    name="client_mobile"
                    type="tel"
                    value={formData.client_mobile}
                    onChange={(e) => handleMobileChange(e.target.value)}
                    placeholder="9999999999"
                    className="pl-10 h-10 text-sm font-medium border-gray-300 rounded-lg shadow-sm focus:border-blue-500"
                    required
                  />
                </div>
                {errors.client_mobile && <p className={FIELD_ERROR}>{errors.client_mobile}</p>}
                {clientCheckStatus === 'found' && <p className="text-[10px] text-green-600 font-bold mt-1.5 uppercase">Found: {foundClientName}</p>}
              </div>

              <div>
                <label className={FIELD_LABEL}>Client Name *</label>
                <Input
                  name="client_name"
                  type="text"
                  value={formData.client_name}
                  onChange={(e) => handleInputChange('client_name', e.target.value)}
                  placeholder="Enter Full Name"
                  className="h-10 text-sm font-medium border-gray-300 rounded-lg shadow-sm disabled:bg-gray-50 disabled:text-gray-500 uppercase"
                  disabled={clientCheckStatus === 'found'}
                  required
                />
                {errors.client_name && <p className={FIELD_ERROR}>{errors.client_name}</p>}
              </div>

              <div>
                <label className={FIELD_LABEL}>Email Address</label>
                <Input
                  name="client_email"
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => handleInputChange('client_email', e.target.value)}
                  placeholder="example@mail.com"
                  className="h-10 text-sm font-medium border-gray-300 rounded-lg shadow-sm bg-white"
                />
              </div>

              <div>
                <label className={FIELD_LABEL}>Service State *</label>
                <select
                  value={formData.master_state || ''}
                  onChange={(e) => handleInputChange('master_state', Number(e.target.value))}
                  className="w-full h-10 px-3 text-sm font-medium border border-gray-300 rounded-lg shadow-sm outline-none focus:border-blue-500 bg-white"
                  required
                >
                  <option value="">Select State</option>
                  {masterStates.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className={FIELD_LABEL}>Service City *</label>
                <select
                  value={formData.master_city || ''}
                  onChange={(e) => handleInputChange('master_city', Number(e.target.value))}
                  className="w-full h-10 px-3 text-sm font-medium border border-gray-300 rounded-lg shadow-sm outline-none focus:border-blue-500 bg-white"
                  disabled={!formData.master_state}
                  required
                >
                  <option value="">Select City</option>
                  {masterCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className={FIELD_LABEL}>Service Location *</label>
                <LocationSearchSelect
                  value={formData.master_location}
                  error={errors.master_location}
                  onChange={(locationId, cityId, stateId) => {
                    setFormData(prev => ({
                      ...prev,
                      master_location: locationId,
                      master_city: cityId || prev.master_city,
                      master_state: stateId || prev.master_state,
                    }));
                    clearError('master_location');
                    validateField('master_location', locationId);
                  }}
                />
                {errors.master_location && (
                  <p className={FIELD_ERROR}>{errors.master_location}</p>
                )}
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className={FIELD_LABEL}>Detailed Address *</label>
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

          {/* Section: Property */}
          <div className={SECTION_CARD}>
            <h4 className={`${SECTION_HEADING} text-blue-600 border-gray-100`}>
              <Building2 className="h-4 w-4" /> Property Details
            </h4>

            <div className={FIELD_GRID}>
                  <div>
                    <label className={FIELD_LABEL}>Booking For *</label>
                    <select
                      value={bookingKindFromCommercialType(formData.commercial_type)}
                      onChange={(e) => {
                        const kind = e.target.value as 'home' | 'commercial';
        if (kind === 'home') {
                          setFormData((prev) => ({
                            ...prev,
                            commercial_type: 'home',
                            property_type: RESIDENTIAL_PROPERTY_TYPE,
                            job_type: 'Customer',
                            society_billing_type: 'Paid',
                            is_price_estimated: !supportsAutoPricing('home', pricingConfig),
                            price: supportsAutoPricing('home', pricingConfig) ? prev.price : '0.00',
                          }));
                        } else {
                          setFormData((prev) => ({
                            ...prev,
                            commercial_type: 'other',
                            property_type: '',
                            job_type: 'Customer',
                            society_billing_type: 'Paid',
                            is_price_estimated: true,
                            price: '0.00',
                          }));
                        }
                      }}
                      className="w-full h-10 px-3 text-sm font-medium border border-gray-300 rounded-lg shadow-sm outline-none focus:border-blue-500 bg-white"
                    >
                      <option value="home">Home (Residential)</option>
                      <option value="commercial">Commercial Property</option>
                    </select>
                    <p className={FIELD_HELP}>
                      {formData.commercial_type === 'home'
                        ? 'Flat / home — choose BHK in each service.'
                        : 'Select property type on the right (Society, Hotel, Office, etc.).'}
                    </p>
                  </div>

                  {bookingKindFromCommercialType(formData.commercial_type) === 'commercial' ? (
                    <div>
                      <label className={FIELD_LABEL}>Property Type *</label>
                      <select
                        value={formData.property_type || ''}
                        onChange={(e) => {
                          const propertyType = e.target.value;
                          const commercialType = commercialTypeFromPropertyType(propertyType);
                          const society = propertyType === 'Society';
                          setFormData((prev) => ({
                            ...prev,
                            property_type: propertyType,
                            commercial_type: commercialType,
                            job_type: society ? 'Society' : 'Customer',
                            society_billing_type: society ? (prev.society_billing_type || 'Paid') : 'Paid',
                            is_price_estimated: !supportsAutoPricing(commercialType, pricingConfig),
                            price: supportsAutoPricing(commercialType, pricingConfig) ? prev.price : '0.00',
                          }));
                        }}
                        className="w-full h-10 px-3 text-sm font-medium border border-gray-300 rounded-lg shadow-sm outline-none focus:border-blue-500 bg-white"
                        required
                      >
                        <option value="">Select property type</option>
                        {BOOKING_PROPERTY_TYPES.map((pt) => (
                          <option key={pt} value={pt}>{pt}</option>
                        ))}
                      </select>
                      {errors.property_type && (
                        <p className={FIELD_ERROR}>{errors.property_type}</p>
                      )}
                    </div>
                  ) : null}
            </div>

            {isSocietyBooking(formData) && (
                  <div className="mt-4 sm:mt-5 pt-4 sm:pt-5 border-t border-purple-100">
                    <label className={FIELD_LABEL}>
                      Society Service Billing *
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {(['Paid', 'Free'] as const).map((option) => (
                        <label
                          key={option}
                          className={`inline-flex h-10 items-center gap-2 px-4 rounded-lg border text-sm font-bold cursor-pointer transition-colors ${
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
                    <p className={FIELD_HELP}>
                      Mark whether this society contract is a paid service or a free service for staff reference.
                    </p>
                  </div>
                )}
          </div>

          {/* Section: Assignment & Payment (schedule + booking type + payment) */}
          <div className={SECTION_CARD}>
            <h4 className={`${SECTION_HEADING} text-blue-600 border-gray-100`}>
              <Calendar className="h-4 w-4" /> Assignment & Payment
            </h4>

            <div className={FIELD_GRID}>
              <div>
                <label className={FIELD_LABEL}>Booking Date *</label>
                <Input
                  id="schedule_datetime"
                  name="schedule_datetime"
                  type="date"
                  value={formData.schedule_datetime}
                  onChange={(e) => handleInputChange('schedule_datetime', e.target.value)}
                  className={`w-full h-10 px-3 text-sm font-medium border rounded-lg shadow-sm ${errors.schedule_datetime ? 'border-red-500' : 'border-gray-300'}`}
                  required
                />
                {errors.schedule_datetime && (
                  <p className={FIELD_ERROR}>{errors.schedule_datetime}</p>
                )}
              </div>
              <div>
                <label className={FIELD_LABEL}>Time Slot *</label>
                <ClockTimePicker
                  value={formData.time_slot || ''}
                  onChange={(val) => handleInputChange('time_slot', val)}
                  placeholder="Select Time"
                />
                {errors.time_slot && (
                  <p className={FIELD_ERROR}>{errors.time_slot}</p>
                )}
              </div>
              <div>
                <label className={FIELD_LABEL}>Booking Type *</label>
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
                        service_category: 'AMC',
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
                        service_category: 'AMC',
                      }));
                    } else if (val === 'complaint') {
                      setFormData(prev => ({
                        ...prev,
                        is_amc_main_booking: false,
                        is_followup_visit: false,
                        included_in_amc: false,
                        is_complaint_call: true,
                        price: '0',
                        payment_status: 'Paid',
                      }));
                    } else {
                      setFormData(prev => ({
                        ...prev,
                        is_amc_main_booking: false,
                        is_followup_visit: false,
                        included_in_amc: false,
                        is_complaint_call: false,
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
                <label className={FIELD_LABEL}>Service Price Override</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    className="w-full h-10 pl-9 pr-3 text-sm font-bold border-gray-300 rounded-lg outline-none text-blue-700 bg-white shadow-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>
              {shouldShowNextServiceField(
                selectedPackages,
                '',
                formData.service_category,
                serviceItems,
              ) && (
                <div className="animate-fade-in">
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
                  <p className="text-[10px] text-blue-600 font-bold mt-1.5 uppercase italic">
                    {nextServiceDateHint(selectedPackages, '', formData.service_category, serviceItems)}
                  </p>
                </div>
              )}
              {/* Payment Status and Payment Mode are not collected while creating a
                  booking; payment is recorded once it is actually taken. The fields
                  remain in form state at their defaults (Unpaid / blank), and the
                  AMC follow-up and complaint types still set Paid above. */}
              {/* The 40/60 revenue panel is not shown while creating a booking. New
                  bookings still default to revenue_sharing at 40/60 (see form state
                  and the effect above); the split is reviewed on the edit screen. */}
              <div>
                <label className={FIELD_LABEL}>Reference *</label>
                <select
                  name="reference"
                  value={formData.reference}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleInputChange('reference', value);
                    validateField('reference', value);
                  }}
                  className={`w-full h-10 px-3 text-sm font-medium border rounded-lg shadow-sm outline-none bg-white ${errors.reference ? 'border-red-500' : 'border-gray-300'}`}
                  required
                >
                  <option value="">Select Reference</option>
                  {BOOKING_REFERENCE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {errors.reference && (
                  <p className={FIELD_ERROR}>{errors.reference}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section: Service Selection */}
          <div className={`${SECTION_CARD} relative overflow-hidden`}>
             <div className="absolute inset-0 bg-blue-50/30 pointer-events-none" />
             <div className="relative z-10">
             <h4 className={`${SECTION_HEADING} text-blue-600 border-gray-100`}>
               <SprayCan className="h-4 w-4" /> Service & Pricing
             </h4>
             <div className="flex flex-col lg:flex-row lg:items-start gap-4 sm:gap-5">
                <div className="flex-1 min-w-0 flex flex-col gap-4 sm:gap-5">
                  <div>
                    <label className={FIELD_LABEL}>
                      Select Service * <span className="font-normal text-gray-500">(multi-select)</span>
                    </label>
                    {!catalogueLoaded ? (
                      <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-500">
                        {pricingConfigFailed
                          ? 'Could not load the service list. Refresh the page or check your connection.'
                          : 'Loading services…'}
                      </div>
                    ) : (
                    <div className="rounded-lg border border-gray-200 bg-white p-3 flex flex-col gap-3">
                      {serviceGroups.map((group) => (
                        <div key={group.family}>
                          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                            {group.family}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                            {group.services.map((service) => {
                              const checked = selectedPackages.includes(service);
                              return (
                                <label
                                  key={service}
                                  className={`flex min-h-10 items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
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
                        </div>
                      ))}
                    </div>
                    )}
                    {selectedPackages.length > 0 && (
                      <p className="text-[11px] font-bold text-blue-700 mt-1.5">
                        Selected: {selectedPackages.join(' + ')}
                      </p>
                    )}
                    {errors.service_type && (
                      <p className={FIELD_ERROR}>{errors.service_type}</p>
                    )}
                  </div>

                  <PerServicePricingSection
                    selectedPackages={selectedPackages}
                    serviceConfigs={serviceConfigs}
                    serviceItems={serviceItems}
                    pricingConfig={pricingConfig}
                    commercialType={formData.commercial_type}
                    technicianSharePercent={Number(formData.technician_share_percent ?? 40) || 40}
                    onPlanChange={handleServicePlanChange}
                    onAreaChange={handleServiceAreaChange}
                    onBaseAmountChange={handleServiceBaseAmountChange}
                    onDiscountChange={handleServiceDiscountChange}
                    validationErrors={serviceConfigErrors}
                    scheduleDate={formData.schedule_datetime}
                    showPricingFields={supportsAutoPricing(formData.commercial_type, pricingConfig)}
                  />
                </div>

                <div className="flex flex-col items-start lg:items-end justify-start w-full lg:w-56 lg:shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 lg:pl-5 lg:border-l border-gray-200">
                   <span className="text-[12px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                     {formData.commercial_type === 'home' ? 'Total Price' : 'Estimated Price'}
                   </span>
                   {supportsAutoPricing(formData.commercial_type, pricingConfig) ? (
                     <>
                     <div className="text-4xl font-black text-gray-900 flex items-center">
                        <span className="text-2xl mr-1 text-gray-400">₹</span>
                        {formData.price}
                     </div>
                     {gstSummary.hasGstMeta && (
                       <div className="mt-2 space-y-0.5 text-[10px] font-semibold text-gray-500 text-left lg:text-right">
                         <p>Base ₹{gstSummary.base.toLocaleString('en-IN')}</p>
                         <p>GST ₹{gstSummary.gst.toLocaleString('en-IN')}</p>
                         <p className="text-gray-700">Total ₹{gstSummary.total.toLocaleString('en-IN')}</p>
                       </div>
                     )}
                     {priceBreakdown.length > 0 && (
                       <p className="mt-2 text-[10px] font-bold text-gray-500 text-left lg:text-right">
                         {selectedPackages.length} service{selectedPackages.length > 1 ? 's' : ''} configured
                       </p>
                     )}
                     </>
                   ) : (
                     <div className="flex flex-col items-start lg:items-end">
                       <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-1 rounded-md tracking-tighter uppercase mb-1">To be decided</span>
                       <span className="text-sm font-bold text-gray-400 italic leading-tight">After Visit</span>
                     </div>
                   )}
                </div>
             </div>

             {formData.commercial_type !== 'home' && (
               <div className="mt-4 sm:mt-5 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                 <p className="text-xs font-bold text-amber-700 italic">“Technician visit ke baad final rate diya jayega.”</p>
               </div>
             )}
             </div>
          </div>

          {/* Section: Reminders */}
          <div className={`bg-orange-50/10 border-orange-200 ${SECTION_CARD_BASE}`}>
            <h4 className={`${SECTION_HEADING} text-orange-600 border-orange-100`}>
              <Calendar className="h-4 w-4" /> Set Follow-up Reminder
            </h4>
            <div className={FIELD_GRID}>
              <div>
                <label className={FIELD_LABEL}>Reminder Date</label>
                <Input
                  type="date"
                  value={formData.reminder_date || ''}
                  onChange={(e) => handleInputChange('reminder_date', e.target.value)}
                  className="w-full h-10 px-3 text-sm font-medium border-gray-300 rounded-lg shadow-sm"
                />
              </div>
              <div>
                <label className={FIELD_LABEL}>Reminder Time</label>
                <Input
                  type="time"
                  value={formData.reminder_time || ''}
                  onChange={(e) => handleInputChange('reminder_time', e.target.value)}
                  className="w-full h-10 px-3 text-sm font-medium border-gray-300 rounded-lg shadow-sm"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={FIELD_LABEL}>Reminder Note</label>
                <textarea
                  value={formData.reminder_note || ''}
                  onChange={(e) => handleInputChange('reminder_note', e.target.value)}
                  rows={2}
                  className={TEXTAREA_CONTROL}
                  placeholder="e.g., Call client for feedback..."
                />
              </div>
            </div>
          </div>

          {/* Section: Notes */}
          <div className={SECTION_CARD}>
             <h4 className={`${SECTION_HEADING} text-blue-600 border-gray-100`}>
               <StickyNote className="h-4 w-4" /> Additional Internal Notes
             </h4>
             <textarea
               value={formData.notes || ''}
               onChange={(e) => handleInputChange('notes', e.target.value)}
               rows={3}
               className={TEXTAREA_CONTROL}
               placeholder="Enter any special instructions or customer preferences here..."
             />
          </div>

          {/* Action Footer (Non-Sticky) */}
          <div className={`${SECTION_CARD} flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4`}>
             <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest hidden sm:block">All fields marked with * are required.</p>
             <div className="flex flex-wrap items-center sm:justify-end gap-3 w-full sm:w-auto">
               <button type="button" onClick={() => navigate('/jobcards')} className="flex-1 sm:flex-none h-10 px-5 text-[13px] font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all">Discard</button>

               <button
                  type="button"
                  disabled={savingInquiry || submitting}
                  onClick={async () => {
                    if (!formData.client_mobile || !formData.client_name) {
                      showAlert('Please fill in Client Name and Mobile Number before saving as inquiry.');
                      return;
                    }
                    try {
                      setSavingInquiry(true);
                      const today = new Date().toISOString().split('T')[0];
                      const now   = new Date().toTimeString().slice(0, 5);
                      const bhkLabel = formData.bhk_size || serviceItems[0]?.area || '';
                      const addressBase = formData.client_address || `${formData.city}, ${formData.state}`;
                      await enhancedApiService.createCRMInquiry({
                        name:         formData.client_name,
                        mobile:       formData.client_mobile,
                        location:     bhkLabel
                          ? `${addressBase} · ${bhkLabel}`
                          : addressBase,
                        pest_type:    formData.service_type   || selectedPackages.join(', ') || 'Other',
                        service_frequency: formData.service_category === 'AMC' ? 'amc' : 'one-time',
                        remark:       formData.notes          || formData.client_notes || '',
                        inquiry_date: today,
                        inquiry_time: now,
                        status:       'New',
                        reminder_date: formData.reminder_date || undefined,
                        reminder_time: formData.reminder_time || undefined,
                        reminder_note: formData.reminder_note || undefined
                      } as any);
                      fireAndForget(
                        sendInquiryReceivedApi(formData.client_mobile, {
                          name: formData.client_name,
                          pest_type: formData.service_type || selectedPackages.join(', ') || 'Other',
                          area: bhkLabel || formData.city || formData.state,
                          property_type: formData.property_type || 'Residential',
                        }),
                      );
                      navigate('/crm-inquiries');
                    } catch (err: any) {
                      showAlert(err.message || 'Failed to save inquiry. Please try again.');
                    } finally {
                      setSavingInquiry(false);
                    }
                  }}
                  className="flex-1 sm:flex-none h-10 px-5 text-[13px] font-bold bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {savingInquiry ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-amber-700" /> : <MessageCircle className="h-4 w-4" />}
                  Save as Inquiry
                </button>

               <button type="submit" disabled={submitting} className="flex-1 sm:flex-none h-10 px-8 text-[13px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all">
                 {submitting ? 'Creating...' : 'Create Booking'}
               </button>
             </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateJobCard;
