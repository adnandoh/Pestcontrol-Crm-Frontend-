import React, { useEffect, useState } from "react";
import { Button } from "../components/ui";
import { Card } from "../components/ui/Card";
import { enhancedApiService } from "../services/api.enhanced";
import { showAlert } from "../utils/notify";
import type { PurchaseBill } from "../types";

const empty = {
  supplier_name: "",
  supplier_gstin: "",
  bill_number: "",
  bill_date: new Date().toISOString().slice(0, 10),
  taxable_amount: "",
  cgst_amount: "0",
  sgst_amount: "0",
  igst_amount: "0",
};

const PurchaseBills: React.FC = () => {
  const [form, setForm] = useState(empty);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<PurchaseBill[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await enhancedApiService.getPurchaseBills({ page: 1 });
    setRows(res.results || []);
  };

  useEffect(() => {
    void load().catch(() => showAlert("Could not load purchase bills."));
  }, []);

  const save = async () => {
    if (!form.supplier_name.trim() || !form.supplier_gstin.trim() || !form.bill_number.trim()) {
      showAlert("Supplier name, GSTIN and bill number are required.");
      return;
    }
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.append(key, value));
    if (file) body.append("attachment", file);
    try {
      setSaving(true);
      await enhancedApiService.createPurchaseBill(body);
      setForm(empty);
      setFile(null);
      await load();
    } catch {
      showAlert("Could not save this purchase bill. Check the GSTIN and that the bill number is not already used.");
    } finally {
      setSaving(false);
    }
  };

  const mark = async (row: PurchaseBill, input_eligibility: PurchaseBill["input_eligibility"]) => {
    await enhancedApiService.updatePurchaseBillEligibility(row.id, input_eligibility);
    await load();
  };

  return (
    <div className="space-y-6 p-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Purchase bills</h1>
        <p className="text-sm text-gray-500 mt-1">
          Record supplier bills in the company name. Input GST stays pending until the CA marks it eligible. It is not claimed automatically.
        </p>
      </div>
      <Card className="p-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input className="px-3 py-2 border rounded-lg" placeholder="Supplier name" value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} />
        <input className="px-3 py-2 border rounded-lg" placeholder="Supplier GSTIN" value={form.supplier_gstin} onChange={(e) => setForm({ ...form, supplier_gstin: e.target.value })} />
        <input className="px-3 py-2 border rounded-lg" placeholder="Bill number" value={form.bill_number} onChange={(e) => setForm({ ...form, bill_number: e.target.value })} />
        <input className="px-3 py-2 border rounded-lg" type="date" value={form.bill_date} onChange={(e) => setForm({ ...form, bill_date: e.target.value })} />
        <input className="px-3 py-2 border rounded-lg" type="number" placeholder="Taxable amount" value={form.taxable_amount} onChange={(e) => setForm({ ...form, taxable_amount: e.target.value })} />
        <input className="px-3 py-2 border rounded-lg" type="number" placeholder="CGST" value={form.cgst_amount} onChange={(e) => setForm({ ...form, cgst_amount: e.target.value })} />
        <input className="px-3 py-2 border rounded-lg" type="number" placeholder="SGST" value={form.sgst_amount} onChange={(e) => setForm({ ...form, sgst_amount: e.target.value })} />
        <input className="px-3 py-2 border rounded-lg" type="number" placeholder="IGST" value={form.igst_amount} onChange={(e) => setForm({ ...form, igst_amount: e.target.value })} />
        <input className="px-3 py-2 border rounded-lg" type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <Button onClick={() => void save()} disabled={saving}>{saving ? "Saving..." : "Save purchase bill"}</Button>
      </Card>
      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Supplier", "GSTIN", "Bill", "Date", "Taxable", "CGST", "SGST", "IGST", "Total", "Attachment", "Eligibility"].map((heading) => (
                <th key={heading} className="text-left p-3 border-b">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="p-3 border-b">{row.supplier_name}</td>
                <td className="p-3 border-b">{row.supplier_gstin}</td>
                <td className="p-3 border-b">{row.bill_number}</td>
                <td className="p-3 border-b">{row.bill_date}</td>
                <td className="p-3 border-b">{row.taxable_amount}</td>
                <td className="p-3 border-b">{row.cgst_amount}</td>
                <td className="p-3 border-b">{row.sgst_amount}</td>
                <td className="p-3 border-b">{row.igst_amount}</td>
                <td className="p-3 border-b">{row.total_amount}</td>
                <td className="p-3 border-b">{row.attachment ? <a className="text-blue-600" href={row.attachment} target="_blank" rel="noreferrer">Open</a> : "—"}</td>
                <td className="p-3 border-b">
                  <select value={row.input_eligibility} onChange={(e) => void mark(row, e.target.value as PurchaseBill["input_eligibility"])}>
                    <option value="pending">Pending CA review</option>
                    <option value="eligible">Eligible input</option>
                    <option value="not_eligible">Not eligible</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default PurchaseBills;
