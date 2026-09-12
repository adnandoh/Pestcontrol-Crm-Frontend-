import React, { useEffect, useMemo, useState } from "react";
import {
  Download,
  Plus,
  Trash2,
  Search,
  RefreshCw,
  FileText,
  Edit2,
  IndianRupee,
  UserRound,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { Button, Pagination } from "../components/ui";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { downloadManualInvoicePdf, type ManualInvoiceInput } from "../utils/invoicePdf";
import { COMPANY, INVOICE_DEFAULTS } from "../constants/quotation";
import { showAlert } from "../utils/notify";
import { enhancedApiService } from "../services/api.enhanced";
import type { Invoice } from "../types";

const PAGE_SIZE = 10;

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
  billedByGstNumber: string;
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
  billedByGstNumber: COMPANY.gstin,
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

const invoiceToPdfPayload = (invoice: Invoice): ManualInvoiceInput => ({
  invoiceNo: invoice.invoice_no,
  invoiceDate: invoice.invoice_date,
  billedByName: invoice.billed_by_name || INVOICE_DEFAULTS.billedByName,
  billedByAddress: invoice.billed_by_address || INVOICE_DEFAULTS.billedByAddress,
  billedByGstNumber:
    invoice.billed_by_gst_number !== undefined && invoice.billed_by_gst_number !== null
      ? invoice.billed_by_gst_number
      : COMPANY.gstin,
  billedToName: invoice.customer_name,
  billedToMobile: invoice.customer_mobile || "",
  billedToAddress: invoice.customer_address || "",
  billedToGstNumber: invoice.customer_gst_number || "",
  bookingCode: invoice.booking_code || "",
  bookingCreatedAt: invoice.booking_created_at || "",
  nextServiceDate: invoice.next_service_date || "",
  reference: invoice.reference || "",
  tax: invoice.tax_amount ?? "0",
  notes: invoice.notes || "",
  items: (invoice.items || []).map((item) => ({
    service: item.service || INVOICE_DEFAULTS.defaultServiceItem,
    schedule: item.schedule || "",
    technician: item.technician || "",
    amount: item.amount ?? "0",
  })),
});

const formatMoney = (value: number | string | undefined) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const staffDisplayName = (invoice: Invoice) =>
  (invoice.created_by_name || "").trim() || "—";

const Invoices: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [savedInvoices, setSavedInvoices] = useState<Invoice[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
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
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pageRevenue = useMemo(
    () => savedInvoices.reduce((sum, inv) => sum + Number(inv.grand_total || 0), 0),
    [savedInvoices]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const loadSavedInvoices = async () => {
    try {
      setListLoading(true);
      const res = await enhancedApiService.getInvoices({
        search: debouncedSearch || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      setSavedInvoices(res.results || []);
      setTotalCount(res.count ?? res.results?.length ?? 0);
    } catch (err) {
      console.error("Failed to load invoices", err);
      showAlert("Failed to load invoices. Please refresh.");
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    void loadSavedInvoices();
  }, [debouncedSearch, page]);

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

  const openNewInvoice = () => {
    resetForm();
    setShowForm(true);
    window.requestAnimationFrame(() => {
      document.getElementById("invoice-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const closeForm = () => {
    resetForm();
    setShowForm(false);
  };

  const loadInvoiceForEdit = (invoice: Invoice) => {
    setEditingId(invoice.id);
    setShowForm(true);
    setForm({
      invoiceNo: invoice.invoice_no || "",
      invoiceDate: invoice.invoice_date || new Date().toISOString().slice(0, 10),
      billedByName: invoice.billed_by_name || INVOICE_DEFAULTS.billedByName,
      billedByAddress: invoice.billed_by_address || INVOICE_DEFAULTS.billedByAddress,
      billedByGstNumber:
        invoice.billed_by_gst_number !== undefined && invoice.billed_by_gst_number !== null
          ? invoice.billed_by_gst_number
          : COMPANY.gstin,
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
    window.requestAnimationFrame(() => {
      document.getElementById("invoice-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const downloadInvoicePdf = async (invoice: Invoice) => {
    try {
      setDownloadingId(invoice.id);
      let payloadSource = invoice;
      if (!invoice.items?.length) {
        payloadSource = await enhancedApiService.getInvoice(invoice.id);
      }
      await downloadManualInvoicePdf(invoiceToPdfPayload(payloadSource));
    } catch (err) {
      console.error("Failed to download invoice PDF", err);
      showAlert("Failed to download invoice PDF.");
    } finally {
      setDownloadingId(null);
    }
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
      billed_by_gst_number: form.billedByGstNumber.trim(),
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
      setShowForm(true);
      setForm((prev) => ({
        ...prev,
        invoiceNo: saved.invoice_no || prev.invoiceNo,
        billedByGstNumber:
          saved.billed_by_gst_number !== undefined && saved.billed_by_gst_number !== null
            ? saved.billed_by_gst_number
            : prev.billedByGstNumber,
        billedToGstNumber: saved.customer_gst_number || "",
      }));

      const pdfPayload: ManualInvoiceInput = {
        invoiceNo: saved.invoice_no,
        invoiceDate: saved.invoice_date || form.invoiceDate,
        billedByName: saved.billed_by_name || form.billedByName,
        billedByAddress: saved.billed_by_address || form.billedByAddress,
        billedByGstNumber:
          saved.billed_by_gst_number !== undefined && saved.billed_by_gst_number !== null
            ? saved.billed_by_gst_number
            : form.billedByGstNumber,
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
      // New invoices should appear at the top of page 1.
      if (page !== 1) {
        setPage(1);
      } else {
        await loadSavedInvoices();
      }
    } catch (err) {
      console.error("Failed to save invoice", err);
      showAlert("Failed to save invoice. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Invoice Management</h1>
          <p className="text-gray-500 text-sm mt-1">
            Create, manage and download invoices without creating a booking first.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="hidden md:flex gap-2 bg-white"
            onClick={() => void loadSavedInvoices()}
            disabled={listLoading}
          >
            <RefreshCw className={`h-4 w-4 ${listLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 gap-2 px-6"
            onClick={openNewInvoice}
          >
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-5 border-l-4 border-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Total Invoices</p>
              <h3 className="text-2xl font-black text-gray-900 mt-1">{totalCount}</h3>
            </div>
            <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
              <FileText className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-purple-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-purple-600 uppercase tracking-wider">Page Revenue</p>
              <h3 className="text-2xl font-black text-gray-900 mt-1">
                ₹{pageRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </h3>
            </div>
            <div className="h-12 w-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
              <IndianRupee className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-emerald-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Staff Tracked</p>
              <h3 className="text-2xl font-black text-gray-900 mt-1">
                {new Set(savedInvoices.map((inv) => inv.created_by).filter(Boolean)).size}
              </h3>
            </div>
            <div className="h-12 w-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
              <UserRound className="h-6 w-6" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4 bg-white/80 backdrop-blur-sm border-gray-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by invoice no, customer name, mobile, staff..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      <Card className="overflow-hidden border-gray-100 shadow-sm bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[980px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Invoice</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Created By</th>
                <th className="sticky right-0 z-10 bg-gray-50 px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right min-w-[160px] shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.25)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {listLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-4 py-4 h-16 bg-gray-50/50" />
                  </tr>
                ))
              ) : savedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                        <FileText className="h-10 w-10" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">No Invoices Found</h3>
                      <p className="text-gray-500 text-sm max-w-xs mt-1">
                        Generate your first invoice and it will appear here with the staff who created it.
                      </p>
                      <Button className="mt-4 bg-blue-600" onClick={openNewInvoice}>
                        Create Invoice
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                savedInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className={`hover:bg-gray-50/80 transition-colors group ${
                      editingId === inv.id ? "bg-blue-50/60" : ""
                    }`}
                  >
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          className="text-left text-sm font-bold text-blue-600 hover:underline"
                          onClick={() => loadInvoiceForEdit(inv)}
                        >
                          {inv.invoice_no}
                        </button>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {inv.invoice_date
                            ? format(new Date(inv.invoice_date), "dd MMM yyyy")
                            : "—"}
                        </span>
                        {inv.reference ? (
                          <span className="text-[10px] text-gray-400 font-medium truncate max-w-[180px]">
                            {inv.reference}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">{inv.customer_name}</span>
                        <span className="text-xs text-gray-500">{inv.customer_mobile || "—"}</span>
                        {inv.customer_gst_number ? (
                          <span className="text-[10px] text-gray-400 font-medium">
                            GSTIN {inv.customer_gst_number}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-black text-gray-900">{formatMoney(inv.grand_total)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Saved</Badge>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-semibold text-gray-800">{staffDisplayName(inv)}</span>
                    </td>
                    <td className="sticky right-0 z-10 bg-white group-hover:bg-gray-50/80 px-4 py-4 text-right shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.25)]">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-lg hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200"
                          onClick={() => loadInvoiceForEdit(inv)}
                          title="Edit invoice"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                          onClick={() => void downloadInvoicePdf(inv)}
                          disabled={downloadingId === inv.id}
                          title="Download PDF"
                        >
                          <Download className={`h-4 w-4 ${downloadingId === inv.id ? "animate-pulse" : ""}`} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalCount > 0 ? (
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}{" "}
              invoices
            </span>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalCount}
              itemsPerPage={PAGE_SIZE}
              onPageChange={setPage}
              showGoToPage={totalPages > 1}
            />
          </div>
        ) : null}
      </Card>

      {showForm ? (
        <div id="invoice-form" className="space-y-6 scroll-mt-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? `Edit Invoice ${form.invoiceNo || ""}`.trim() : "New Invoice"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Fill details, then generate and download the PDF. Saved invoices appear in the list above.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={closeForm} disabled={isGenerating} className="gap-2">
                <X className="h-4 w-4" />
                Close
              </Button>
              <Button onClick={onGenerate} disabled={isGenerating} className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Download className="h-4 w-4" />
                {isGenerating ? "Saving..." : editingId ? "Update & Download PDF" : "Generate & Download PDF"}
              </Button>
            </div>
          </div>

          <Card className="p-5 border border-gray-100">
            <h2 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Invoice Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <input
                className="px-3 py-2 border rounded-lg"
                placeholder="Invoice No (optional)"
                value={form.invoiceNo}
                onChange={(e) => updateFormField("invoiceNo", e.target.value)}
              />
              <input
                className="px-3 py-2 border rounded-lg"
                type="date"
                value={form.invoiceDate}
                onChange={(e) => updateFormField("invoiceDate", e.target.value)}
              />
              <input
                className="px-3 py-2 border rounded-lg"
                placeholder="Booking Code (optional)"
                value={form.bookingCode}
                onChange={(e) => updateFormField("bookingCode", e.target.value)}
              />
              <input
                className="px-3 py-2 border rounded-lg"
                placeholder="Reference"
                value={form.reference}
                onChange={(e) => updateFormField("reference", e.target.value)}
              />
            </div>
          </Card>

          <Card className="p-5 border border-gray-100">
            <h2 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Billing Information</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase">Billed By</p>
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Company Name"
                  value={form.billedByName}
                  onChange={(e) => updateFormField("billedByName", e.target.value)}
                />
                <div className="flex gap-2 items-center">
                  <input
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Company GST Number (optional)"
                    value={form.billedByGstNumber}
                    onChange={(e) => updateFormField("billedByGstNumber", e.target.value)}
                    maxLength={30}
                    title="Company seller GSTIN for this invoice"
                    aria-label="Company GSTIN"
                  />
                  {form.billedByGstNumber.trim() ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 whitespace-nowrap text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                      onClick={() => updateFormField("billedByGstNumber", "")}
                      title="Remove company GST from this invoice"
                    >
                      Remove GST
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 whitespace-nowrap"
                      onClick={() => updateFormField("billedByGstNumber", COMPANY.gstin)}
                      title={`Restore default company GSTIN ${COMPANY.gstin}`}
                    >
                      Use default
                    </Button>
                  )}
                </div>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg min-h-[80px]"
                  placeholder="Company Address"
                  value={form.billedByAddress}
                  onChange={(e) => updateFormField("billedByAddress", e.target.value)}
                />
                <p className="text-[10px] text-gray-500">
                  {form.billedByGstNumber.trim()
                    ? `Company GSTIN ${form.billedByGstNumber.trim().toUpperCase().replace(/^GSTIN\s*/i, "")} will appear on this invoice PDF. Customer GST is separate below.`
                    : "Company GSTIN removed — it will not appear on this invoice PDF. Customer GST is separate below."}
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase">Customer Details</p>
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Customer Name *"
                  value={form.billedToName}
                  onChange={(e) => updateFormField("billedToName", e.target.value)}
                />
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Customer Mobile"
                  value={form.billedToMobile}
                  onChange={(e) => updateFormField("billedToMobile", e.target.value)}
                />
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Customer GST Number"
                  value={form.billedToGstNumber}
                  onChange={(e) => updateFormField("billedToGstNumber", e.target.value)}
                  maxLength={30}
                />
                <textarea
                  className="w-full px-3 py-2 border rounded-lg min-h-[80px]"
                  placeholder="Customer Address"
                  value={form.billedToAddress}
                  onChange={(e) => updateFormField("billedToAddress", e.target.value)}
                />
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
                        <input
                          className="w-full px-2 py-1.5 border rounded"
                          placeholder="Service name"
                          value={item.service}
                          onChange={(e) => updateItem(idx, "service", e.target.value)}
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          className="w-full px-2 py-1.5 border rounded"
                          type="date"
                          value={item.schedule}
                          onChange={(e) => updateItem(idx, "schedule", e.target.value)}
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          className="w-full px-2 py-1.5 border rounded"
                          placeholder="Technician"
                          value={item.technician}
                          onChange={(e) => updateItem(idx, "technician", e.target.value)}
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          className="w-full px-2 py-1.5 border rounded text-right"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={item.amount}
                          onChange={(e) => updateItem(idx, "amount", e.target.value)}
                        />
                      </td>
                      <td className="border p-2 text-center">
                        <button
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          type="button"
                          onClick={() => removeItem(idx)}
                          aria-label="Remove item"
                        >
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
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  type="date"
                  value={form.bookingCreatedAt}
                  onChange={(e) => updateFormField("bookingCreatedAt", e.target.value)}
                />
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  type="date"
                  value={form.nextServiceDate}
                  onChange={(e) => updateFormField("nextServiceDate", e.target.value)}
                />
                <textarea
                  className="w-full px-3 py-2 border rounded-lg min-h-[80px]"
                  placeholder="Notes / Terms"
                  value={form.notes}
                  onChange={(e) => updateFormField("notes", e.target.value)}
                />
              </div>
              <div className="md:ml-auto md:w-[320px] border rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">
                    ₹
                    {subtotal.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <input
                    className="w-28 px-2 py-1 border rounded text-right"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.tax}
                    onChange={(e) => updateFormField("tax", e.target.value)}
                  />
                </div>
                <div className="pt-2 border-t flex justify-between">
                  <span className="text-base font-bold">Grand Total</span>
                  <span className="text-base font-extrabold">
                    ₹
                    {grandTotal.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
};

export default Invoices;
