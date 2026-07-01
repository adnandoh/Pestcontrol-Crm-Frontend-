import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Calculator,
  Info,
  User,
  Briefcase,
  FileText,
  Eye,
} from 'lucide-react';
import { enhancedApiService } from '../services/api.enhanced';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { cn } from '../utils/cn';
import LocationSearchSelect from '../components/forms/LocationSearchSelect';
import type {
  QuotationItem,
  QuotationFormData,
  QuotationScope,
  QuotationPaymentTerm,
  State,
  City,
} from '../types';
import {
  COMPANY,
  DEFAULT_PAYMENT_TERMS,
  SERVICE_PRESETS,
  FREQUENCY_OPTIONS,
  getQuotationDisplayName,
} from '../constants/quotation';
import {
  QUOTATION_PROPERTY_TYPES,
  propertyTypeToQuotationType,
} from '../constants/quotationTemplates';
import {
  QUOTATION_SELECTABLE_SERVICES,
  type QuotationServicePlanConfig,
  buildItemsFromServicePlans,
  configsFromQuotation,
  defaultPlanForService,
  deriveQuotationFlags,
  getPaymentTermsForServicePlans,
  getQuotationPlanOptions,
  mergeScopesForServicePlans,
  resolveQuotationDisplayScopes,
  quotationSupportsAmc,
  sortItemsByServiceOrder,
} from '../constants/quotationServices';
import { resolveQuotationTotalsFromForm } from '../utils/quotationTotals';
import { formatMoneyInputValue, parseMoneyInput } from '../utils/moneyInput';
import { showAlert } from '../utils/notify';

const defaultExpiry = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
};

const CreateQuotation: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [formData, setFormData] = useState<QuotationFormData>({
    customer_name: '',
    mobile: '',
    email: '',
    address: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '',
    company_name: '',
    contact_person: '',
    quotation_type: 'Residential',
    property_type: '',
    template_service_type: '',
    status: 'Draft',
    is_amc: false,
    visit_count: 1,
    contract_amount: 0,
    total_amount: 0,
    discount: 0,
    tax_amount: 0,
    grand_total: 0,
    license_number: COMPANY.license,
    expiry_date: defaultExpiry(),
    notes: '',
    terms_and_conditions: '',
    master_state: undefined,
    master_city: undefined,
    master_location: undefined,
    items: [{ service_name: '', frequency: 'One Time', quantity: 1, rate: 0, total: 0 }],
    scopes: [],
    payment_terms: [...DEFAULT_PAYMENT_TERMS],
  });

  const [previewAfterSave, setPreviewAfterSave] = useState(false);
  const [servicePlans, setServicePlans] = useState<QuotationServicePlanConfig[]>([]);

  const [masterStates, setMasterStates] = useState<State[]>([]);
  const [masterCities, setMasterCities] = useState<City[]>([]);

  const { data: existingQuotation, isLoading: isFetching } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => enhancedApiService.getQuotation(Number(id)),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingQuotation) {
      const configs = configsFromQuotation(
        existingQuotation.template_service_type,
        existingQuotation.items || [],
      );
      setServicePlans(configs);
      const resolvedScopes = resolveQuotationDisplayScopes(existingQuotation);
      const sortedItems = sortItemsByServiceOrder(
        existingQuotation.items || [],
        existingQuotation.template_service_type,
      );
      setFormData({
        ...existingQuotation,
        items: sortedItems,
        scopes: resolvedScopes,
      } as QuotationFormData);
    }
  }, [existingQuotation]);

  const applyQuotationFromConfigs = (
    propertyType: string,
    configs: QuotationServicePlanConfig[],
    existingItems?: QuotationItem[],
  ) => {
    const flags = deriveQuotationFlags(configs);
    const items = buildItemsFromServicePlans(configs, existingItems ?? formData.items);
    const paymentTerms = propertyType && configs.length
      ? getPaymentTermsForServicePlans(propertyType, configs)
      : null;

    setFormData((prev) => ({
      ...prev,
      property_type: propertyType,
      template_service_type: configs.map((c) => c.service).join(', '),
      quotation_type: propertyType
        ? flags.is_amc
          ? 'AMC Package'
          : propertyTypeToQuotationType(propertyType)
        : prev.quotation_type,
      is_amc: flags.is_amc,
      visit_count: flags.visit_count,
      scopes: propertyType && configs.length
        ? mergeScopesForServicePlans(propertyType, configs)
        : [],
      payment_terms: paymentTerms
        ? paymentTerms.map((t) => ({ ...t }))
        : prev.payment_terms,
      items: configs.length ? items : [{ service_name: '', frequency: 'One Time', quantity: 1, rate: 0, total: 0 }],
      contract_amount: flags.hasMixedPlans ? 0 : prev.contract_amount,
    }));

    if (configs.length) {
      calculateTotals(items, formData.discount ?? 0, {
        is_amc: flags.is_amc && !flags.hasMixedPlans,
        contract_amount: flags.hasMixedPlans ? 0 : formData.contract_amount,
      });
    }
  };

  const toggleQuotationService = (service: QuotationServicePlanConfig['service']) => {
    const exists = servicePlans.some((s) => s.service === service);
    const next = exists
      ? servicePlans.filter((s) => s.service !== service)
      : [...servicePlans, { service, plan: defaultPlanForService(service) }];
    setServicePlans(next);
    applyQuotationFromConfigs(formData.property_type || '', next);
  };

  const changeServicePlan = (service: string, plan: string) => {
    const next = servicePlans.map((s) => (s.service === service ? { ...s, plan } : s));
    setServicePlans(next);
    applyQuotationFromConfigs(formData.property_type || '', next);
  };

  const mixedPlans = deriveQuotationFlags(servicePlans).hasMixedPlans;

  // 1. Initial State Fetch
  useEffect(() => {
    enhancedApiService.getStates()
      .then(res => {
        setMasterStates(res.results);
        if (!isEdit) {
          const maharashtra = res.results.find(s => s.name.toLowerCase() === 'maharashtra');
          if (maharashtra) {
            setFormData(prev => ({ ...prev, master_state: maharashtra.id, state: maharashtra.name }));
          }
        }
      })
      .catch(err => console.error('Error fetching states:', err));
  }, [isEdit]);

  // 2. Fetch Cities when State changes + Auto-select Mumbai
  useEffect(() => {
    if (formData.master_state) {
      enhancedApiService.getCities({ state: formData.master_state, page_size: 1000 })
        .then(res => {
          setMasterCities(res.results);
          
          if (!isEdit) {
            const state = masterStates.find(s => s.id === formData.master_state);
            if (state?.name.toLowerCase() === 'maharashtra' && !formData.master_city) {
              const mumbai = res.results.find(c => c.name.toLowerCase() === 'mumbai');
              if (mumbai) {
                setFormData(prev => ({ ...prev, master_city: mumbai.id, city: mumbai.name }));
              }
            }
          }

          setFormData(prev => {
            if (prev.master_city && res.results.some(c => c.id === prev.master_city)) return prev;
            return prev;
          });
        })
        .catch(err => console.error('Error fetching cities:', err));
    } else {
      setMasterCities([]);
    }
  }, [formData.master_state, masterStates.length, isEdit]);

  const handleInputChange = (field: keyof QuotationFormData, value: any) => {
    let updatedFormData = { ...formData, [field]: value };
    
    // Sync legacy fields
    if (field === 'master_state') {
      const state = masterStates.find(s => s.id === value);
      if (state) updatedFormData.state = state.name;
      updatedFormData.master_city = undefined;
      updatedFormData.master_location = undefined;
    } else if (field === 'master_city') {
      const city = masterCities.find(c => c.id === value);
      if (city) updatedFormData.city = city.name;
      updatedFormData.master_location = undefined;
    }
    
    setFormData(updatedFormData);
  };

  const createMutation = useMutation({
    mutationFn: (data: QuotationFormData) => enhancedApiService.createQuotation(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      if (previewAfterSave && created?.id) {
        navigate(`/quotations/preview/${created.id}`);
      } else {
        navigate('/quotations');
      }
    },
    onError: (error: unknown) =>
      showAlert(error instanceof Error ? error.message : 'Error creating quotation'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<QuotationFormData>) =>
      enhancedApiService.updateQuotation(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      if (previewAfterSave && id) {
        navigate(`/quotations/preview/${id}`);
      } else {
        navigate('/quotations');
      }
    },
    onError: (error: unknown) =>
      showAlert(error instanceof Error ? error.message : 'Error updating quotation'),
  });

  const calculateTotals = (
    items: QuotationItem[],
    discount: number = formData.discount ?? 0,
    opts?: { is_amc?: boolean; contract_amount?: number; visit_count?: number },
  ) => {
    const isAmc = opts?.is_amc ?? formData.is_amc;
    const contractAmt = opts?.contract_amount ?? formData.contract_amount ?? 0;
    const visitCount = opts?.visit_count ?? formData.visit_count ?? 1;

    const { total_amount, grand_total, contract_amount } = resolveQuotationTotalsFromForm(
      items,
      discount,
      Boolean(isAmc),
      contractAmt,
      visitCount,
    );

    setFormData((prev) => ({
      ...prev,
      total_amount,
      tax_amount: 0,
      grand_total,
      contract_amount,
    }));
  };

  const handleAddItem = () => {
    const newItems = [...formData.items, { service_name: '', frequency: 'One Time', quantity: 1, rate: 0, total: 0 }];
    setFormData({ ...formData, items: newItems });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
    calculateTotals(newItems, formData.discount);
  };

  const handleItemChange = (index: number, field: keyof QuotationItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'rate' || field === 'quantity') {
      const q = Math.max(1, Number(newItems[index].quantity) || 0);
      const r = Number(newItems[index].rate) || 0;
      newItems[index].total = r * q;
    }
    
    setFormData({ ...formData, items: newItems });
    calculateTotals(newItems, formData.discount);
  };

  const handleSubmit = (e: React.FormEvent, goPreview = false) => {
    e.preventDefault();
    setPreviewAfterSave(goPreview);
    const resolved = resolveQuotationTotalsFromForm(
      formData.items,
      formData.discount ?? 0,
      Boolean(formData.is_amc),
      formData.contract_amount ?? 0,
      formData.visit_count ?? 1,
    );
    const scopes =
      formData.property_type && servicePlans.length
        ? resolveQuotationDisplayScopes({
            ...formData,
            scopes: formData.scopes,
            items: formData.items,
          })
        : formData.scopes;
    const payload = {
      ...formData,
      scopes,
      template_service_type: servicePlans.map((c) => c.service).join(', ') || formData.template_service_type,
      customer_name: getQuotationDisplayName(formData),
      pincode: '',
      terms_and_conditions: '',
      tax_amount: 0,
      total_amount: resolved.total_amount,
      grand_total: resolved.grand_total,
      contract_amount: resolved.contract_amount,
    };
    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleScopeChange = (index: number, field: keyof QuotationScope, value: string) => {
    const scopes = [...(formData.scopes || [])];
    scopes[index] = { ...scopes[index], [field]: value };
    setFormData({ ...formData, scopes });
  };

  const handleAddScope = () => {
    setFormData({
      ...formData,
      scopes: [...(formData.scopes || []), { title: '', content: '' }],
    });
  };

  const handleRemoveScope = (index: number) => {
    setFormData({
      ...formData,
      scopes: (formData.scopes || []).filter((_, i) => i !== index),
    });
  };

  const handlePaymentChange = (
    index: number,
    field: keyof QuotationPaymentTerm,
    value: string,
  ) => {
    const payment_terms = [...(formData.payment_terms || [])];
    payment_terms[index] = { ...payment_terms[index], [field]: value };
    setFormData({ ...formData, payment_terms });
  };

  const handleAddPayment = () => {
    setFormData({
      ...formData,
      payment_terms: [...(formData.payment_terms || []), { term: '', description: '' }],
    });
  };

  const handleRemovePayment = (index: number) => {
    setFormData({
      ...formData,
      payment_terms: (formData.payment_terms || []).filter((_, i) => i !== index),
    });
  };

  if (isEdit && isFetching) return <div className="p-8 text-center">Loading quotation...</div>;

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const formActions = (
    <div className="flex flex-wrap justify-end gap-2">
      <Button type="button" variant="outline" onClick={() => navigate('/quotations')}>
        Cancel
      </Button>
      <Button
        type="button"
        variant="outline"
        className="gap-2 border-[#1e5a9e] text-[#1e5a9e]"
        disabled={isSaving}
        onClick={(e) => handleSubmit(e, true)}
      >
        <Eye className="h-4 w-4" />
        {isEdit ? 'Update & Preview' : 'Save & Preview'}
      </Button>
      <Button
        type="submit"
        className="bg-[#2d8a2f] hover:bg-[#246b27] text-white shadow-lg gap-2 px-6"
        disabled={isSaving}
      >
        <Save className="h-4 w-4" />
        {isEdit ? 'Update' : 'Save'}
      </Button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="p-6 max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/quotations')}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              {isEdit ? 'Edit Quotation' : 'Create New Quotation'}
            </h1>
            <p className="text-sm text-gray-500 font-medium">
              License: <span className="text-[#2d8a2f] font-bold">{COMPANY.license}</span>
            </p>
          </div>
        </div>
        {formActions}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Customer & Basic Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Customer Information */}
          <Card className="p-6 shadow-sm border-gray-100">
            <div className="flex items-center gap-2 mb-6">
              <User className="h-5 w-5 text-[#2d8a2f]" />
              <h2 className="text-lg font-bold text-gray-900">Customer Details</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-gray-500">Mobile Number</Label>
                <Input 
                  required
                  placeholder="10 digit number"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="bg-gray-50/50 border-gray-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-gray-500">Email Address</Label>
                <Input 
                  type="email"
                  placeholder="customer@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-gray-50/50 border-gray-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-gray-500">Contact Person</Label>
                <Input
                  required
                  placeholder="e.g. Mr. Sharma"
                  value={formData.contact_person || ''}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  className="bg-gray-50/50 border-gray-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-gray-500">Company Name (Optional)</Label>
                <Input
                  placeholder="e.g. Acme Corp"
                  value={formData.company_name || ''}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="bg-gray-50/50 border-gray-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-gray-500">Valid Until</Label>
                <Input
                  type="date"
                  value={formData.expiry_date || ''}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  className="bg-gray-50/50 border-gray-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-gray-500">State</Label>
                <select
                  value={formData.master_state || ''}
                  onChange={(e) => handleInputChange('master_state', Number(e.target.value))}
                  className="w-full h-10 px-3 text-sm font-medium border border-gray-200 rounded-lg shadow-sm outline-none focus:border-blue-500 bg-gray-50/50"
                  required
                >
                  <option value="">Select State</option>
                  {masterStates.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-gray-500">City</Label>
                <select
                  value={formData.master_city || ''}
                  onChange={(e) => handleInputChange('master_city', Number(e.target.value))}
                  className="w-full h-10 px-3 text-sm font-medium border border-gray-200 rounded-lg shadow-sm outline-none focus:border-blue-500 bg-gray-50/50"
                  disabled={!formData.master_state}
                  required
                >
                  <option value="">Select City</option>
                  {masterCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-gray-500">Location</Label>
                <LocationSearchSelect
                  value={formData.master_location}
                  defaultLabel={
                    formData.master_location
                      ? [existingQuotation?.master_location_name, formData.city || existingQuotation?.master_city_name]
                          .filter(Boolean)
                          .join(', ')
                      : undefined
                  }
                  onChange={(locationId, cityId, stateId) => {
                    const state = masterStates.find(s => s.id === stateId);
                    // Find city from masterCities or wait for effect? 
                    // Better to just set the IDs and let the effects handle fetching if needed, 
                    // but we also need the names for legacy sync.
                    setFormData(prev => ({
                      ...prev,
                      master_location: locationId,
                      master_city: cityId || prev.master_city,
                      master_state: stateId || prev.master_state,
                      state: state ? state.name : prev.state
                    }));
                  }}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label className="text-xs font-bold uppercase text-gray-500">Full Address</Label>
                <textarea
                  className="w-full min-h-[100px] px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
                  placeholder="Complete address with landmarks..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>
          </Card>

          {/* Service Items */}
          <Card className="p-6 shadow-sm border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-[#2d8a2f]" />
                <h2 className="text-lg font-bold text-gray-900">Service Items</h2>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="gap-2 bg-[#f0faf0] text-[#2d8a2f] border-[#c8e6c9] hover:bg-[#e8f5e9]">
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </div>

            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={index} className="group relative grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-white transition-all shadow-sm hover:shadow-md">
                  <div className="md:col-span-4 space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-gray-400">Service Name</Label>
                    <Input
                      required
                      list={`service-presets-${index}`}
                      placeholder="e.g. Cockroach Treatment"
                      value={item.service_name}
                      onChange={(e) => handleItemChange(index, 'service_name', e.target.value)}
                      className="bg-white"
                    />
                    <datalist id={`service-presets-${index}`}>
                      {SERVICE_PRESETS.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-gray-400">Freq</Label>
                    <select
                      className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm"
                      value={item.frequency}
                      onChange={(e) => handleItemChange(index, 'frequency', e.target.value)}
                    >
                      {FREQUENCY_OPTIONS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-gray-400">Qty</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={formatMoneyInputValue(item.quantity)}
                      onChange={(e) =>
                        handleItemChange(index, 'quantity', parseMoneyInput(e.target.value) || 1)
                      }
                      className="bg-white"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-gray-400">Rate</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={formatMoneyInputValue(item.rate)}
                      onChange={(e) =>
                        handleItemChange(index, 'rate', parseMoneyInput(e.target.value))
                      }
                      className="bg-white"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-gray-400">Total</Label>
                    <div className="h-10 flex items-center px-3 bg-gray-100 rounded-lg text-sm font-black text-gray-900">
                      ₹{item.total.toLocaleString()}
                    </div>
                  </div>
                  
                  {formData.items.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => handleRemoveItem(index)}
                      className="absolute -right-2 -top-2 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Summaries & Settings */}
        <div className="space-y-8">
          {/* Configuration Card */}
          <Card className="p-6 shadow-sm border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2 mb-6">
              <Info className="h-5 w-5 text-[#1e5a9e]" />
              <h2 className="text-lg font-bold text-gray-900">Settings</h2>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-gray-500">Property Type</Label>
                <select
                  className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm font-medium"
                  value={formData.property_type || ''}
                  onChange={(e) => {
                    const propertyType = e.target.value;
                    setFormData((prev) => ({ ...prev, property_type: propertyType }));
                    applyQuotationFromConfigs(propertyType, servicePlans);
                  }}
                >
                  <option value="">Select property type</option>
                  {QUOTATION_PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase text-gray-500">Services (multi-select)</Label>
                <div className="flex flex-wrap gap-2">
                  {QUOTATION_SELECTABLE_SERVICES.map((service) => {
                    const selected = servicePlans.some((s) => s.service === service);
                    return (
                      <button
                        key={service}
                        type="button"
                        onClick={() => toggleQuotationService(service)}
                        className={cn(
                          'px-3 py-2 rounded-lg text-[11px] font-bold border transition-all',
                          selected
                            ? 'bg-[#1e5a9e] text-white border-[#1e5a9e] shadow-sm'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-[#1e5a9e]/40',
                        )}
                      >
                        {service}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-gray-500">
                  Select one or more services — e.g. Bed Bug one-time + Mosquito AMC. Set plan per
                  service below.
                </p>
              </div>

              {servicePlans.length > 0 && (
                <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/40 p-4">
                  <p className="text-xs font-black text-violet-800 uppercase tracking-wide">
                    Plan per service
                  </p>
                  {servicePlans.map((cfg) => {
                    const planOptions = getQuotationPlanOptions(cfg.service);
                    const canAmc = quotationSupportsAmc(cfg.service);
                    return (
                      <div key={cfg.service} className="space-y-1.5">
                        <Label className="text-[11px] font-bold text-gray-700">{cfg.service}</Label>
                        <select
                          className="w-full h-10 px-3 bg-white border border-violet-200 rounded-lg text-sm font-medium"
                          value={cfg.plan}
                          onChange={(e) => changeServicePlan(cfg.service, e.target.value)}
                        >
                          {planOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        {!canAmc && (
                          <p className="text-[10px] text-amber-700">One-time service only</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {mixedPlans && (
                <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Mixed quotation: one-time + AMC services. Enter rate for each line item; total is
                  the sum of all services.
                </p>
              )}

              {servicePlans.length > 0 ? (
                <div className="p-4 bg-[#f0faf0] rounded-xl border border-[#c8e6c9] space-y-1">
                  <p className="text-sm font-bold text-[#2d8a2f]">
                    {formData.is_amc ? 'Includes AMC service(s)' : 'One-time services only'}
                  </p>
                  <p className="text-[10px] text-gray-600">
                    {servicePlans.map((c) => c.service).join(' + ')}
                  </p>
                </div>
              ) : (
              <div className="flex items-center justify-between p-4 bg-[#f0faf0] rounded-xl border border-[#c8e6c9]">
                <div>
                  <p className="text-sm font-bold text-[#2d8a2f]">Is this AMC?</p>
                  <p className="text-[10px] text-gray-600 font-medium">Includes follow-up visits</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const is_amc = !formData.is_amc;
                    setFormData((prev) => ({
                      ...prev,
                      is_amc,
                      quotation_type: is_amc ? 'AMC Package' : prev.quotation_type,
                    }));
                    calculateTotals(formData.items, formData.discount ?? 0, {
                      is_amc,
                      contract_amount: formData.contract_amount,
                    });
                  }}
                  className={cn(
                    'w-12 h-6 rounded-full transition-colors relative',
                    formData.is_amc ? 'bg-[#2d8a2f]' : 'bg-gray-300',
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                    formData.is_amc ? "left-7" : "left-1"
                  )} />
                </button>
              </div>
              )}

              {formData.is_amc && !mixedPlans && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-gray-500">
                      Number of Visits (not price)
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.visit_count}
                      onChange={(e) => {
                        const visit_count = Number(e.target.value);
                        setFormData((prev) => ({ ...prev, visit_count }));
                        calculateTotals(formData.items, formData.discount ?? 0, {
                          is_amc: true,
                          contract_amount: formData.contract_amount,
                          visit_count,
                        });
                      }}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-gray-500">
                      AMC Contract Amount (Rs.)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={formData.contract_amount || ''}
                      onChange={(e) => {
                        const contract_amount = Number(e.target.value);
                        setFormData((prev) => ({ ...prev, contract_amount }));
                        calculateTotals(formData.items, formData.discount ?? 0, {
                          is_amc: true,
                          contract_amount,
                        });
                      }}
                      className="bg-white font-bold"
                    />
                    <p className="text-[10px] text-gray-500">
                      Optional package price. Leave blank to use the line-item total above. Do not
                      enter visit count here.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Pricing Summary */}
          <Card className="p-6 shadow-xl border-[#1e5a9e]/30 bg-[#1e5a9e] text-white">
            <div className="flex items-center gap-2 mb-6">
              <Calculator className="h-5 w-5 text-green-200" />
              <h2 className="text-lg font-bold">Summary</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between text-sm opacity-80">
                <span>Subtotal</span>
                <span>₹{(formData.total_amount ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm opacity-80">
                <span>Discount</span>
                <input 
                  type="number"
                  className="w-20 bg-white/10 border-none rounded px-2 py-1 text-right outline-none focus:ring-1 focus:ring-white/30"
                  value={formData.discount}
                  onChange={(e) => {
                    const d = Number(e.target.value);
                    setFormData({ ...formData, discount: d });
                    calculateTotals(formData.items, d);
                  }}
                />
              </div>
              <div className="pt-4 border-t border-white/20">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold uppercase opacity-60">Grand Total</span>
                  <span className="text-3xl font-black tracking-tighter">₹{(formData.grand_total ?? 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Scope, Payment, Terms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6 shadow-sm border-gray-100 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#1e5a9e]" />
              <h2 className="text-lg font-bold text-gray-900">Quotation Details</h2>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleAddScope} className="gap-1">
              <Plus className="h-3 w-3" /> Add custom section
            </Button>
          </div>

          {!formData.property_type || servicePlans.length === 0 ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
              Select <strong>Property Type</strong> and one or more <strong>Services</strong> in
              Settings to auto-load scope, area, pests, benefits and warranty per service.
            </p>
          ) : null}

          <div className="space-y-4">
            {(formData.scopes || []).map((scope, i) => {
              const isSharedArea = scope.title === 'Area Covered';
              const isPerService = scope.title.includes(' — ');
              return (
                <div
                  key={i}
                  className={cn(
                    'p-4 rounded-lg border relative',
                    isSharedArea || isPerService
                      ? 'bg-[#f0f7ff] border-[#1e5a9e]/20'
                      : 'bg-gray-50 border-gray-100',
                  )}
                >
                  <Input
                    placeholder="Section title"
                    value={scope.title}
                    onChange={(e) => handleScopeChange(i, 'title', e.target.value)}
                    className="mb-2 bg-white font-semibold"
                    readOnly={isSharedArea || isPerService}
                  />
                  <textarea
                    className="w-full min-h-[72px] px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
                    placeholder="Content..."
                    value={scope.content}
                    onChange={(e) => handleScopeChange(i, 'content', e.target.value)}
                  />
                  {!isSharedArea && !isPerService && (formData.scopes?.length || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveScope(i)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6 shadow-sm border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Payment Terms</h2>
            <Button type="button" variant="outline" size="sm" onClick={handleAddPayment} className="gap-1">
              <Plus className="h-3 w-3" /> Add
            </Button>
          </div>
          <div className="space-y-3">
            {(formData.payment_terms || []).map((pt, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg border relative">
                <Input
                  placeholder="Term"
                  value={pt.term}
                  onChange={(e) => handlePaymentChange(i, 'term', e.target.value)}
                  className="bg-white col-span-1"
                />
                <Input
                  placeholder="Description"
                  value={pt.description || ''}
                  onChange={(e) => handlePaymentChange(i, 'description', e.target.value)}
                  className="bg-white col-span-2"
                />
                {(formData.payment_terms?.length || 0) > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePayment(i)}
                    className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 shadow-sm border-gray-100 lg:col-span-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-gray-500">Notes (shown on quotation)</Label>
            <textarea
              className="w-full min-h-[80px] px-4 py-3 text-sm border border-gray-200 rounded-xl bg-amber-50/50"
              placeholder="Special instructions for customer..."
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
        </Card>
      </div>

      <div className="sticky bottom-0 z-20 -mx-6 px-6 py-4 bg-white/95 backdrop-blur border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        {formActions}
      </div>
    </form>
  );
};

export default CreateQuotation;
