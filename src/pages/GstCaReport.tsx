import React, { useEffect, useState } from "react";
import { Button } from "../components/ui";
import { Card } from "../components/ui/Card";
import { enhancedApiService } from "../services/api.enhanced";
import { showAlert } from "../utils/notify";

const previousMonth = () => {
  const now = new Date();
  const month = now.getMonth() === 0 ? 12 : now.getMonth();
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  return `${year}-${String(month).padStart(2, "0")}`;
};

const downloadBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
};

const GstCaReport: React.FC = () => {
  const [month, setMonth] = useState(previousMonth);
  const [caEmail, setCaEmail] = useState("");
  const [rows, setRows] = useState<Array<{ period_start: string; status: string; detail: string; ca_email: string; created_at: string }>>([]);

  const load = async () => {
    const settings = await enhancedApiService.getGstCaSettings();
    setCaEmail(settings.ca_email || "");
    setRows(await enhancedApiService.getGstReportDispatches());
  };

  useEffect(() => {
    void load().catch(() => showAlert("Could not load CA settings."));
  }, []);

  const saveEmail = async () => {
    await enhancedApiService.saveGstCaEmail(caEmail.trim());
    showAlert("CA email saved.");
  };

  const grab = async (format: "xlsx" | "zip") => {
    const blob = await enhancedApiService.downloadGstReport(month, format);
    downloadBlob(blob, format === "zip" ? `gst-package-${month}.zip` : `gst-report-${month}.xlsx`);
  };

  const email = async () => {
    try {
      const result = await enhancedApiService.emailGstReport(month);
      showAlert(result.status === "sent" ? `Sent to ${caEmail}` : result.detail || "Failed");
    } catch (err) {
      const data = (err as { response?: { data?: { detail?: string } } })?.response?.data;
      showAlert(data?.detail || "Email failed. The status is saved as failed.");
    }
    await load();
  };

  return (
    <div className="space-y-6 p-6 max-w-[900px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Monthly GST report for CA</h1>
        <p className="text-sm text-gray-500 mt-1">
          Period is the 1st through the last day of the selected month. The Excel has Sales, Purchases and a Summary. Paid and unpaid invoices are both included. Cancelled invoices and credit or debit notes are labelled. Purchase GST is deducted only when the CA has marked that bill eligible.
        </p>
      </div>
      <Card className="p-5 space-y-3">
        <label className="block text-sm font-medium">Report month</label>
        <input className="px-3 py-2 border rounded-lg" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void grab("xlsx").catch(() => showAlert("Could not download the Excel."))}>Download Excel</Button>
          <Button variant="outline" onClick={() => void grab("zip").catch(() => showAlert("Could not download the package."))}>Download Excel + invoice PDFs + purchase bills</Button>
        </div>
      </Card>
      <Card className="p-5 space-y-3">
        <label className="block text-sm font-medium">CA email</label>
        <div className="flex gap-2">
          <input className="flex-1 px-3 py-2 border rounded-lg" type="email" value={caEmail} onChange={(e) => setCaEmail(e.target.value)} placeholder="ca@firm.com" />
          <Button variant="outline" onClick={() => void saveEmail()}>Save</Button>
        </div>
        <p className="text-sm text-gray-500">Use this on the 4th of the next month to email the previous month package.</p>
        <Button onClick={() => void email()}>Email this month to the CA</Button>
      </Card>
      <Card className="p-5">
        <h2 className="font-semibold mb-3">Sent / failed</h2>
        <ul className="space-y-2 text-sm">
          {rows.map((row) => (
            <li key={`${row.created_at}-${row.period_start}`}>
              {row.period_start} · {row.ca_email} · <strong>{row.status}</strong> {row.detail}
            </li>
          ))}
          {rows.length === 0 ? <li className="text-gray-500">No emails sent yet.</li> : null}
        </ul>
      </Card>
    </div>
  );
};

export default GstCaReport;
