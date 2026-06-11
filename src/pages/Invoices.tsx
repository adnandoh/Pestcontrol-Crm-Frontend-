import React, { useMemo, useState } from "react";
import { Download, Plus, Trash2 } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { downloadManualInvoicePdf, type ManualInvoiceInput } from "../utils/invoicePdf";

type InvoiceItemForm = {
  service: string;
  schedule: string;
  technician: string;
  amount: string;
};

const createEmptyItem = (): InvoiceItemForm => ({
  service: "",
  schedule: "",
  technician: "",
  amount: "",
});

const Invoices: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [form, setForm] = useState({
    invoiceNo: "",
    invoiceDate: new Date().toISOString().slice(0, 10),
    billedByName: "Pest Control 99",
    billedByAddress: "Mumbai, Maharashtra, India",
    billedToName: "",
    billedToMobile: "",
    billedToAddress: "",
    bookingCode: "",
    bookingCreatedAt: "",
    nextServiceDate: "",
    reference: "Manual",
    tax: "0",
    notes: "",
  });
  const [items, setItems] = useState<InvoiceItemForm[]>([createEmptyItem()]);

  const subtotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        const value = Number.parseFloat(item.amount || "0");
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0),
    [items]
  );
  const taxAmount = Number.parseFloat(form.tax || "0") || 0;
  const grandTotal = subtotal + taxAmount;

  const updateFormField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateItem = (index: number, field: keyof InvoiceItemForm, value: string) => {
    setItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)));
  };

  const addItem = () => {
    setItems((prev) => [...prev, createEmptyItem()]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
  };

  const onGenerate = async () => {
    if (!form.billedToName.trim()) {
      window.alert("Customer name is required.");
      return;
    }

    const payload: ManualInvoiceInput = {
      ...form,
      items: items.map((item) => ({
        service: item.service,
        schedule: item.schedule,
        technician: item.technician,
        amount: item.amount || "0",
      })),
    };

    try {
      setIsGenerating(true);
      await downloadManualInvoicePdf(payload);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and download invoices directly, without creating a booking first.
          </p>
        </div>
        <Button onClick={onGenerate} disabled={isGenerating} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Download className="h-4 w-4" />
          {isGenerating ? "Generating..." : "Generate & Download PDF"}
        </Button>
      </div>

      <Card className="p-5 border border-gray-100">
        <h2 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Invoice Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <input className="px-3 py-2 border rounded-lg" placeholder="Invoice No (optional)" value={form.invoiceNo} onChange={(e) => updateFormField("invoiceNo", e.target.value)} />
          <input className="px-3 py-2 border rounded-lg" type="date" value={form.invoiceDate} onChange={(e) => updateFormField("invoiceDate", e.target.value)} />
          <input className="px-3 py-2 border rounded-lg" placeholder="Booking Code (optional)" value={form.bookingCode} onChange={(e) => updateFormField("bookingCode", e.target.value)} />
          <input className="px-3 py-2 border rounded-lg" placeholder="Reference" value={form.reference} onChange={(e) => updateFormField("reference", e.target.value)} />
        </div>
      </Card>

      <Card className="p-5 border border-gray-100">
        <h2 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Billing Information</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase">Billed By</p>
            <input className="w-full px-3 py-2 border rounded-lg" placeholder="Company Name" value={form.billedByName} onChange={(e) => updateFormField("billedByName", e.target.value)} />
            <textarea className="w-full px-3 py-2 border rounded-lg min-h-[80px]" placeholder="Company Address" value={form.billedByAddress} onChange={(e) => updateFormField("billedByAddress", e.target.value)} />
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase">Billed To</p>
            <input className="w-full px-3 py-2 border rounded-lg" placeholder="Customer Name *" value={form.billedToName} onChange={(e) => updateFormField("billedToName", e.target.value)} />
            <input className="w-full px-3 py-2 border rounded-lg" placeholder="Customer Mobile" value={form.billedToMobile} onChange={(e) => updateFormField("billedToMobile", e.target.value)} />
            <textarea className="w-full px-3 py-2 border rounded-lg min-h-[80px]" placeholder="Customer Address" value={form.billedToAddress} onChange={(e) => updateFormField("billedToAddress", e.target.value)} />
          </div>
        </div>
      </Card>

      <Card className="p-5 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Services & Pricing</h2>
          <Button variant="outline" onClick={addItem} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left text-xs font-bold text-gray-600 p-3 border">Service</th>
                <th className="text-left text-xs font-bold text-gray-600 p-3 border">Schedule</th>
                <th className="text-left text-xs font-bold text-gray-600 p-3 border">Technician</th>
                <th className="text-right text-xs font-bold text-gray-600 p-3 border">Amount</th>
                <th className="text-center text-xs font-bold text-gray-600 p-3 border w-16">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="border p-2">
                    <input className="w-full px-2 py-1.5 border rounded" placeholder="Service name" value={item.service} onChange={(e) => updateItem(idx, "service", e.target.value)} />
                  </td>
                  <td className="border p-2">
                    <input className="w-full px-2 py-1.5 border rounded" type="date" value={item.schedule} onChange={(e) => updateItem(idx, "schedule", e.target.value)} />
                  </td>
                  <td className="border p-2">
                    <input className="w-full px-2 py-1.5 border rounded" placeholder="Technician" value={item.technician} onChange={(e) => updateItem(idx, "technician", e.target.value)} />
                  </td>
                  <td className="border p-2">
                    <input className="w-full px-2 py-1.5 border rounded text-right" type="number" min="0" step="0.01" placeholder="0.00" value={item.amount} onChange={(e) => updateItem(idx, "amount", e.target.value)} />
                  </td>
                  <td className="border p-2 text-center">
                    <button className="p-2 text-red-600 hover:bg-red-50 rounded" type="button" onClick={() => removeItem(idx)} aria-label="Remove item">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <input className="w-full px-3 py-2 border rounded-lg" type="date" value={form.bookingCreatedAt} onChange={(e) => updateFormField("bookingCreatedAt", e.target.value)} />
            <input className="w-full px-3 py-2 border rounded-lg" type="date" value={form.nextServiceDate} onChange={(e) => updateFormField("nextServiceDate", e.target.value)} />
            <textarea className="w-full px-3 py-2 border rounded-lg min-h-[80px]" placeholder="Notes / Terms" value={form.notes} onChange={(e) => updateFormField("notes", e.target.value)} />
          </div>
          <div className="md:ml-auto md:w-[320px] border rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal</span><span className="font-semibold">₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Tax</span>
              <input className="w-28 px-2 py-1 border rounded text-right" type="number" min="0" step="0.01" value={form.tax} onChange={(e) => updateFormField("tax", e.target.value)} />
            </div>
            <div className="pt-2 border-t flex justify-between">
              <span className="text-base font-bold">Grand Total</span>
              <span className="text-base font-extrabold">₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Invoices;
