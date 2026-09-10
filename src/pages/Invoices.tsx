import React, { useEffect, useMemo, useState } from "react";
import { Download, Plus, Trash2 } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { downloadManualInvoicePdf, type ManualInvoiceInput } from "../utils/invoicePdf";
import { INVOICE_DEFAULTS } from "../constants/quotation";
import { showAlert } from "../utils/notify";
import { enhancedApiService } from "../services/api.enhanced";
import type { Invoice } from "../types";

type InvoiceItemForm = {
  service: string;
  schedule: string;
  technician: string;
  amount: string;
};

const createDefaultItem = (): InvoiceItemForm => ({
  service: INVOICE_DEFAULTS.defaultServiceItem,
  schedule: "",
  technician: "",
  amount: "",
});

type InvoiceFormState = {
  invoiceNo: string;
  invoiceDate: string;
  billedByName: string;
  billedByAddress: string;
  billedToName: string;
  billedToMobile: string;
  billedToAddress: string;
  billedToGstNumber: string;
  bookingCode: string;
  bookingCreatedAt: string;
  nextServiceDate: string;
  reference: string;
  tax: string;
  notes: string;
};

const emptyForm = (): InvoiceFormState => ({
  invoiceNo: "",
  invoiceDate: new Date().toISOString().slice(0, 10),
  billedByName: INVOICE_DEFAULTS.billedByName,
  billedByAddress: INVOICE_DEFAULTS.billedByAddress,
  billedToName: "",
  billedToMobile: "",
  billedToAddress: "",
  billedToGstNumber: "",
  bookingCode: "",
  bookingCreatedAt: "",
  nextServiceDate: "",
  reference: INVOICE_DEFAULTS.reference,
  tax: "0",
  notes: "",
});

const Invoices: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [savedInvoices, setSavedInvoices] = useState<Invoice[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [form, setForm] = useState<InvoiceFormState>(emptyForm);
  const [items, setItems] = useState<InvoiceItemForm[]>([createDefaultItem()]);

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

  const loadSavedInvoices = async () => {
    try {
      setListLoading(true);
      const res = await enhancedApiService.getInvoices({ page_size: 20 });
      setSavedInvoices(res.results || []);
    } catch (err) {
      console.error("Failed to load invoices", err);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    void loadSavedInvoices();
  }, []);

  const updateFormField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateItem = (index: number, field: keyof InvoiceItemForm, value: string) => {
    setItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)));
  };

  const addItem = () => {
    setItems((prev) => [...prev, createDefaultItem()]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
    setItems([createDefaultItem()]);
  };

  const loadInvoiceForEdit = (invoice: Invoice) => {
    setEditingId(invoice.id);
    setForm({
      invoiceNo: invoice.invoice_no || "",
      invoiceDate: invoice.invoice_date || new Date().toISOString().slice(0, 10),
      billedByName: invoice.billed_by_name || INVOICE_DEFAULTS.billedByName,
      billedByAddress: invoice.billed_by_address || INVOICE_DEFAULTS.billedByAddress,
      billedToName: invoice.customer_name || "",
      billedToMobile: invoice.customer_mobile || "",
      billedToAddress: invoice.customer_address || "",
      billedToGstNumber: invoice.customer_gst_number || "",
      bookingCode: invoice.booking_code || "",
      bookingCreatedAt: invoice.booking_created_at || "",
      nextServiceDate: invoice.next_service_date || "",
      reference: invoice.reference || INVOICE_DEFAULTS.reference,
      tax: String(invoice.tax_amount ?? "0"),
      notes: invoice.notes || "",
    });
    setItems(
      invoice.items?.length
        ? invoice.items.map((item) => ({
            service: item.service || "",
            schedule: (item.schedule || "").slice(0, 10),
            technician: item.technician || "",
            amount: String(item.amount ?? ""),
          }))
        : [createDefaultItem()]
    );
  };

  const onGenerate = async () => {
    if (!form.billedToName.trim()) {
      showAlert("Customer name is required.");
      return;
    }

    const lineItems = items.map((item) => ({
      service: item.service,
      schedule: item.schedule,
      technician: item.technician,
      amount: item.amount || "0",
    }));

    const apiPayload = {
      invoice_no: form.invoiceNo.trim() || undefined,
      invoice_date: form.invoiceDate || undefined,
      billed_by_name: form.billedByName,
      billed_by_address: form.billedByAddress,
      customer_name: form.billedToName.trim(),
      customer_mobile: form.billedToMobile.trim(),
      customer_address: form.billedToAddress.trim(),
      customer_gst_number: form.billedToGstNumber.trim(),
      booking_code: form.bookingCode.trim(),
      booking_created_at: form.bookingCreatedAt || null,
      next_service_date: form.nextServiceDate || null,
      reference: form.reference,
      tax_amount: form.tax || "0",
      notes: form.notes,
      items: lineItems.map((item) => ({
        service: item.service.trim() || INVOICE_DEFAULTS.defaultServiceItem,
        schedule: item.schedule || "",
        technician: item.technician || "",
        amount: item.amount || "0",
      })),
    };

    try {
      setIsGenerating(true);
      const saved = editingId
        ? await enhancedApiService.updateInvoice(editingId, apiPayload)
        : await enhancedApiService.createInvoice(apiPayload);

      setEditingId(saved.id);
      setForm((prev) => ({
        ...prev,
        invoiceNo: saved.invoice_no || prev.invoiceNo,
        billedToGstNumber: saved.customer_gst_number || "",
      }));

      const pdfPayload: ManualInvoiceInput = {
        invoiceNo: saved.invoice_no,
        invoiceDate: saved.invoice_date || form.invoiceDate,
        billedByName: saved.billed_by_name || form.billedByName,
        billedByAddress: saved.billed_by_address || form.billedByAddress,
        billedToName: saved.customer_name,
        billedToMobile: saved.customer_mobile || "",
        billedToAddress: saved.customer_address || "",
        billedToGstNumber: saved.customer_gst_number || "",
        bookingCode: saved.booking_code || "",
        bookingCreatedAt: saved.booking_created_at || "",
        nextServiceDate: saved.next_service_date || "",
        reference: saved.reference || "",
        tax: saved.tax_amount ?? form.tax,
        notes: saved.notes || "",
        items: lineItems,
      };

      await downloadManualInvoicePdf(pdfPayload);
      await loadSavedInvoices();
    } catch (err) {
      console.error("Failed to save invoice", err);
      showAlert("Failed to save invoice. Please try again.");
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
        <div className="flex items-center gap-2">
          {editingId !== null && (
            <Button variant="outline" onClick={resetForm} disabled={isGenerating}>
              New Invoice
            </Button>
          )}
          <Button onClick={onGenerate} disabled={isGenerating} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Download className="h-4 w-4" />
            {isGenerating ? "Saving..." : editingId ? "Update & Download PDF" : "Generate & Download PDF"}
          </Button>
        </div>
      </div>

      <Card className="p-5 border border-gray-100">
        <h2 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Saved Invoices</h2>
        {listLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : savedInvoices.length === 0 ? (
          <p className="text-sm text-gray-500">No saved invoices yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left text-xs font-bold text-gray-600 p-2 border">Invoice No</th>
                  <th className="text-left text-xs font-bold text-gray-600 p-2 border">Customer</th>
                  <th className="text-left text-xs font-bold text-gray-600 p-2 border">GSTIN</th>
                  <th className="text-left text-xs font-bold text-gray-600 p-2 border">Date</th>
                  <th className="text-right text-xs font-bold text-gray-600 p-2 border">Total</th>
                  <th className="text-center text-xs font-bold text-gray-600 p-2 border">Action</th>
                </tr>
              </thead>
              <tbody>
                {savedInvoices.map((inv) => (
                  <tr key={inv.id} className={editingId === inv.id ? "bg-blue-50" : undefined}>
                    <td className="border p-2 text-sm">{inv.invoice_no}</td>
                    <td className="border p-2 text-sm">{inv.customer_name}</td>
                    <td className="border p-2 text-sm text-gray-600">{inv.customer_gst_number || "—"}</td>
                    <td className="border p-2 text-sm">{inv.invoice_date}</td>
                    <td className="border p-2 text-sm text-right">
                      ₹{Number(inv.grand_total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="border p-2 text-center">
                      <button
                        type="button"
                        className="text-sm text-blue-600 hover:underline"
                        onClick={() => loadInvoiceForEdit(inv)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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
            <p className="text-[10px] text-gray-500">Default includes Multi Pest Care LLP, +91 8080 74 8282, and website.</p>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase">Customer Details</p>
            <input className="w-full px-3 py-2 border rounded-lg" placeholder="Customer Name *" value={form.billedToName} onChange={(e) => updateFormField("billedToName", e.target.value)} />
            <input className="w-full px-3 py-2 border rounded-lg" placeholder="Customer Mobile" value={form.billedToMobile} onChange={(e) => updateFormField("billedToMobile", e.target.value)} />
            <input
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Customer GST Number"
              value={form.billedToGstNumber}
              onChange={(e) => updateFormField("billedToGstNumber", e.target.value)}
              maxLength={30}
            />
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
