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
  Briefcase
} from 'lucide-react';
import { enhancedApiService } from '../services/api.enhanced';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { cn } from '../utils/cn';
import LocationSearchSelect from '../components/forms/LocationSearchSelect';
import type { QuotationItem, QuotationFormData, State, City, Location as MasterLocation } from '../types';

const LICENSE_NUMBER = "LAID020185";

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
    license_number: LICENSE_NUMBER,
    notes: '',
    terms_and_conditions: '1. Quotation is valid for 30 days.\n2. Payment: 100% advance or as agreed.\n3. The treatment will be as per the standards.',
    master_state: undefined,
    master_city: undefined,
    master_location: undefined,
    items: [{ service_name: '', frequency: 'One Time', quantity: 1, rate: 0, total: 0 }],
    scopes: [
      { title: 'General Pest Control', content: 'Treatment for cockroaches, ants, spiders, etc.' },
      { title: 'Equipment Used', content: 'Hand sprayers, gel application tools.' }
    ],
    payment_terms: [
      { term: 'Immediate', description: 'Payment to be made on same day of service.' }
    ]
  });

  const [masterStates, setMasterStates] = useState<State[]>([]);
  const [masterCities, setMasterCities] = useState<City[]>([]);
  const [masterLocations, setMasterLocations] = useState<MasterLocation[]>([]);

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

  // Initial geographic data
  useEffect(() => {
    if (!isEdit) {
      const fetchInitialData = async () => {
        try {
          const statesRes = await enhancedApiService.getStates();
          setMasterStates(statesRes.results);
          const maharashtra = statesRes.results.find(s => s.name.toLowerCase() === 'maharashtra');
          
          if (maharashtra) {
            setFormData(prev => ({
              ...prev,
              master_state: maharashtra.id,
              state: maharashtra.name
            }));

            // Fetch cities for Maharashtra to find Mumbai
            const citiesRes = await enhancedApiService.getCities({ state: maharashtra.id });
            setMasterCities(citiesRes.results);
            const mumbai = citiesRes.results.find(c => c.name.toLowerCase() === 'mumbai');
            if (mumbai) {
              setFormData(prev => ({
                ...prev,
                master_city: mumbai.id,
                city: mumbai.name
              }));

              // Fetch locations for Mumbai
              const locationsRes = await enhancedApiService.getMasterLocations({ city: mumbai.id });
              setMasterLocations(locationsRes.results);
            }
          }
        } catch (err) {
          console.error('Failed to fetch initial location data:', err);
        }
      };
      fetchInitialData();
    } else {
      enhancedApiService.getStates()
        .then(res => setMasterStates(res.results))
        .catch(err => console.error('Error fetching states:', err));
    }
  }, [isEdit]);

  // Fetch cities when state changes
  useEffect(() => {
    if (formData.master_state) {
      enhancedApiService.getCities({ state: formData.master_state })
        .then(res => {
          setMasterCities(res.results);
          // Only reset if current city not in results
          setFormData(prev => {
            if (prev.master_city && res.results.some(c => c.id === prev.master_city)) return prev;
            return { ...prev, master_city: undefined, master_location: undefined };
          });
        })
        .catch(err => console.error('Error fetching cities:', err));
    } else {
      setMasterCities([]);
      setFormData(prev => ({ ...prev, master_city: undefined, master_location: undefined }));
    }
  }, [formData.master_state]);

  // Fetch locations when city changes
  useEffect(() => {
    if (formData.master_city) {
      enhancedApiService.getMasterLocations({ city: formData.master_city })
        .then(res => {
          setMasterLocations(res.results);
          // Only reset if current location not in results
          setFormData(prev => {
            if (prev.master_location && res.results.some(l => l.id === prev.master_location)) return prev;
            return { ...prev, master_location: undefined };
          });
        })
        .catch(err => console.error('Error fetching locations:', err));
    } else {
      setMasterLocations([]);
      setFormData(prev => ({ ...prev, master_location: undefined }));
    }
  }, [formData.master_city]);

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      navigate('/quotations');
    },
    onError: (error: any) => alert(error.message || 'Error creating quotation')
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<QuotationFormData>) => enhancedApiService.updateQuotation(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      navigate('/quotations');
    },
    onError: (error: any) => alert(error.message || 'Error updating quotation')
  });

  const calculateTotals = (items: QuotationItem[], discount: number = 0) => {
    const total_amount = items.reduce((sum, item) => sum + (item.rate * item.quantity), 0);
    const taxable = total_amount - discount;
    const tax_amount = taxable * 0.18; // 18% GST default
    const grand_total = taxable + tax_amount;

    setFormData(prev => ({
      ...prev,
      total_amount,
      tax_amount,
      grand_total,
      contract_amount: prev.is_amc ? grand_total : 0
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
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
            <p className="text-sm text-gray-500 font-medium">License No: <span className="text-blue-600 font-bold">{LICENSE_NUMBER}</span></p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/quotations')}>Cancel</Button>
          <Button 
            type="submit" 
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-100 gap-2 px-8"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            <Save className="h-4 w-4" />
            {isEdit ? 'Update Quotation' : 'Save Quotation'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Customer & Basic Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Customer Information */}
          <Card className="p-6 shadow-sm border-gray-100">
            <div className="flex items-center gap-2 mb-6">
              <User className="h-5 w-5 text-blue-600" />
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
                <Label className="text-xs font-bold uppercase text-gray-500">Company Name (Optional)</Label>
                <Input 
                  placeholder="e.g. Acme Corp"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
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
                <Briefcase className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold text-gray-900">Service Items</h2>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="gap-2 bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100">
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
                      placeholder="e.g. Cockroach Treatment"
                      value={item.service_name}
                      onChange={(e) => handleItemChange(index, 'service_name', e.target.value)}
                      className="bg-white"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-gray-400">Freq</Label>
                    <select
                      className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm"
                      value={item.frequency}
                      onChange={(e) => handleItemChange(index, 'frequency', e.target.value)}
                    >
                      <option>One Time</option>
                      <option>Weekly</option>
                      <option>Monthly</option>
                      <option>Quarterly</option>
                      <option>AMC</option>
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
              <Info className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">Settings</h2>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-gray-500">Quotation Type</Label>
                <select
                  className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm font-medium"
                  value={formData.quotation_type}
                  onChange={(e) => setFormData({ ...formData, quotation_type: e.target.value as any })}
                >
                  <option>Residential</option>
                  <option>Commercial</option>
                  <option>Society</option>
                  <option>AMC Package</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div>
                  <p className="text-sm font-bold text-blue-900">Is this AMC?</p>
                  <p className="text-[10px] text-blue-600 font-medium">Includes follow-up visits</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_amc: !formData.is_amc })}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative",
                    formData.is_amc ? "bg-blue-600" : "bg-gray-300"
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
                      value={formData.visit_count}
                      onChange={(e) => setFormData({ ...formData, visit_count: Number(e.target.value) })}
                      className="bg-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Pricing Summary */}
          <Card className="p-6 shadow-xl border-blue-100 bg-blue-900 text-white">
            <div className="flex items-center gap-2 mb-6">
              <Calculator className="h-5 w-5 text-blue-300" />
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
    </form>
  );
};

export default CreateQuotation;
