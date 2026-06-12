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
  DEFAULT_TERMS,
  DEFAULT_PAYMENT_TERMS,
  DEFAULT_SCOPES_RESIDENTIAL,
  QUOTATION_TYPES,
  SERVICE_PRESETS,
  FREQUENCY_OPTIONS,
} from '../constants/quotation';

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
    terms_and_conditions: DEFAULT_TERMS,
    master_state: undefined,
    master_city: undefined,
    master_location: undefined,
    items: [{ service_name: '', frequency: 'One Time', quantity: 1, rate: 0, total: 0 }],
    scopes: [...DEFAULT_SCOPES_RESIDENTIAL],
    payment_terms: [...DEFAULT_PAYMENT_TERMS],
  });

  const [previewAfterSave, setPreviewAfterSave] = useState(false);

  const [masterStates, setMasterStates] = useState<State[]>([]);
  const [masterCities, setMasterCities] = useState<City[]>([]);

  const { data: existingQuotation, isLoading: isFetching } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => enhancedApiService.getQuotation(Number(id)),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingQuotation) {
      setFormData({
        ...existingQuotation,
      } as QuotationFormData);
    }
  }, [existingQuotation]);

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
      alert(error instanceof Error ? error.message : 'Error creating quotation'),
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
      alert(error instanceof Error ? error.message : 'Error updating quotation'),
  });

  const calculateTotals = (
    items: QuotationItem[],
    discount: number = formData.discount ?? 0,
    opts?: { is_amc?: boolean; contract_amount?: number },
  ) => {
    const isAmc = opts?.is_amc ?? formData.is_amc;
    const contractAmt = opts?.contract_amount ?? formData.contract_amount ?? 0;

    let total_amount: number;
    if (isAmc && contractAmt > 0) {
      total_amount = contractAmt;
    } else {
      total_amount = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
    }

    const taxable = Math.max(0, total_amount - discount);
    const tax_amount = taxable * 0.18;
    const grand_total = taxable + tax_amount;

    setFormData((prev) => ({
      ...prev,
      total_amount,
      tax_amount,
      grand_total,
      contract_amount: isAmc ? contractAmt || grand_total : 0,
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
      newItems[index].total = Number(newItems[index].rate) * Number(newItems[index].quantity);
    }
    
    setFormData({ ...formData, items: newItems });
    calculateTotals(newItems, formData.discount);
  };

  const handleSubmit = (e: React.FormEvent, goPreview = false) => {
    e.preventDefault();
    setPreviewAfterSave(goPreview);
    const payload = {
      ...formData,
      contract_amount: formData.is_amc
        ? formData.contract_amount || formData.grand_total
        : 0,
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
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/quotations')}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2 border-[#1e5a9e] text-[#1e5a9e]"
            disabled={createMutation.isPending || updateMutation.isPending}
            onClick={(e) => handleSubmit(e, true)}
          >
            <Eye className="h-4 w-4" />
            {isEdit ? 'Update & Preview' : 'Save & Preview'}
          </Button>
          <Button
            type="submit"
            className="bg-[#2d8a2f] hover:bg-[#246b27] text-white shadow-lg gap-2 px-6"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            <Save className="h-4 w-4" />
            {isEdit ? 'Update' : 'Save'}
          </Button>
        </div>
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
                <Label className="text-xs font-bold uppercase text-gray-500">Full Name</Label>
                <Input 
                  required
                  placeholder="e.g. John Doe"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="bg-gray-50/50 border-gray-200"
                />
              </div>
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
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-gray-500">Pincode</Label>
                <Input 
                  placeholder="e.g. 400001"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  className="bg-gray-50/50 border-gray-200"
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
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                      className="bg-white"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-gray-400">Rate</Label>
                    <Input 
                      type="number"
                      value={item.rate}
                      onChange={(e) => handleItemChange(index, 'rate', Number(e.target.value))}
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
                <Label className="text-xs font-bold uppercase text-gray-500">Quotation Type</Label>
                <select
                  className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm font-medium"
                  value={formData.quotation_type}
                  onChange={(e) =>
                    setFormData({ ...formData, quotation_type: e.target.value as QuotationFormData['quotation_type'] })
                  }
                >
                  {QUOTATION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

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

              {formData.is_amc && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-gray-500">Visit Count</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.visit_count}
                      onChange={(e) =>
                        setFormData({ ...formData, visit_count: Number(e.target.value) })
                      }
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
                      Total contract value for all visits (not per visit).
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
              <div className="flex justify-between text-sm opacity-80">
                <span>Tax (18% GST)</span>
                <span>₹{(formData.tax_amount ?? 0).toLocaleString()}</span>
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
        <Card className="p-6 shadow-sm border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#1e5a9e]" />
              <h2 className="text-lg font-bold text-gray-900">Scope of Work</h2>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleAddScope} className="gap-1">
              <Plus className="h-3 w-3" /> Add
            </Button>
          </div>
          <div className="space-y-3">
            {(formData.scopes || []).map((scope, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100 relative">
                <Input
                  placeholder="Title"
                  value={scope.title}
                  onChange={(e) => handleScopeChange(i, 'title', e.target.value)}
                  className="mb-2 bg-white font-semibold"
                />
                <textarea
                  className="w-full min-h-[60px] px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
                  placeholder="Description..."
                  value={scope.content}
                  onChange={(e) => handleScopeChange(i, 'content', e.target.value)}
                />
                {(formData.scopes?.length || 0) > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveScope(i)}
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
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
          <h2 className="text-lg font-bold text-gray-900 mb-3">Terms & Conditions</h2>
          <textarea
            className="w-full min-h-[140px] px-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50/50"
            value={formData.terms_and_conditions || ''}
            onChange={(e) =>
              setFormData({ ...formData, terms_and_conditions: e.target.value })
            }
          />
          <div className="mt-4 space-y-2">
            <Label className="text-xs font-bold uppercase text-gray-500">Notes (shown on quotation)</Label>
            <textarea
              className="w-full min-h-[60px] px-4 py-3 text-sm border border-gray-200 rounded-xl bg-amber-50/50"
              placeholder="Special instructions for customer..."
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
        </Card>
      </div>
    </form>
  );
};

export default CreateQuotation;
