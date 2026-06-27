import React from 'react';
import { format } from 'date-fns';
import type { Quotation } from '../../types';
import { COMPANY, BANK_DETAILS, amountInWords, getQuotationDisplayName, formatCompanyPhone } from '../../constants/quotation';
import { hasStructuredScopes, STRUCTURED_SCOPE_TITLES } from '../../constants/quotationTemplates';
import { COMPANY_SIGNATURE_STAMP_URL } from '../../constants/companyAssets';
import { resolveQuotationTotals } from '../../utils/quotationTotals';
import './QuotationDocument.css';

const fmt = (n: number) =>
  Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const fmtScopeContent = (content: string) =>
  content.replace(/\s*\|\s*$/g, '').trim();

const fmtDate = (d?: string) => {
  if (!d) return '-';
  try {
    return format(new Date(d), 'dd/MM/yyyy');
  } catch {
    return d;
  }
};

interface QuotationDocumentProps {
  quotation: Quotation;
  className?: string;
}

const QuotationDocument: React.FC<QuotationDocumentProps> = ({ quotation, className = '' }) => {
  const displayName = getQuotationDisplayName(quotation);
  const items = quotation.items || [];
  const scopes = quotation.scopes || [];
  const paymentTerms = quotation.payment_terms || [];
  const totals = resolveQuotationTotals(quotation);
  const structured = hasStructuredScopes(scopes);
  const isPerServiceScope = (title: string) => title.includes(' — ') || title === 'Area Covered';
  const scopeContent = (title: string) => scopes.find((s) => s.title === title)?.content;
  const customScopes = scopes.filter(
    (s) =>
      !STRUCTURED_SCOPE_TITLES.includes(s.title as (typeof STRUCTURED_SCOPE_TITLES)[number]) &&
      !isPerServiceScope(s.title),
  );
  const propertyServiceLabel = [
    quotation.property_type,
    quotation.template_service_type
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .join(' + '),
  ]
    .filter(Boolean)
    .join(' — ');

  return (
    <div className={`quotation-doc ${className}`}>
      <div className="quotation-doc-header border-b-4 border-[#2d8a2f] pb-4 mb-5">
        <div className="quotation-doc-header-grid">
          <div className="quotation-doc-brand">
            <img
              src="/pest-control-99-logo.png"
              alt={COMPANY.name}
              className="quotation-doc-logo"
            />
            <div className="quotation-doc-company-meta min-w-0">
              <p className="text-[11px] font-bold text-gray-900 leading-snug">{COMPANY.legalName}</p>
              <p className="text-[10px] font-semibold text-[#1e5a9e] uppercase tracking-wide mt-0.5">
                {COMPANY.brandName} — {COMPANY.tagline}
              </p>
              <p className="text-[10px] text-gray-600 mt-1 leading-snug">{COMPANY.address}</p>
              <p className="text-[10px] text-gray-600 leading-snug">{formatCompanyPhone()}</p>
              <p className="text-[10px] font-semibold text-[#2d8a2f] leading-snug">
                {COMPANY.website}
              </p>
              <p className="text-[10px] font-bold text-[#2d8a2f] mt-1">
                Govt. License: {quotation.license_number || COMPANY.license}
              </p>
            </div>
          </div>

          <div className="quotation-doc-meta-box border-2 border-[#1e5a9e] rounded-lg px-4 py-3">
            <h2 className="text-lg font-black text-[#1e5a9e] uppercase tracking-tight text-center">
              Quotation
            </h2>
            <div className="quotation-doc-meta-rows mt-2">
              <div className="quotation-doc-meta-row">
                <span className="meta-label">Quotation No.</span>
                <span className="meta-value">{quotation.quotation_no}</span>
              </div>
              {quotation.invoice_no && (
                <div className="quotation-doc-meta-row">
                  <span className="meta-label">Invoice Ref.</span>
                  <span className="meta-value">{quotation.invoice_no}</span>
                </div>
              )}
              {quotation.reference_no && (
                <div className="quotation-doc-meta-row">
                  <span className="meta-label">Reference</span>
                  <span className="meta-value">{quotation.reference_no}</span>
                </div>
              )}
              <div className="quotation-doc-meta-row">
                <span className="meta-label">Date</span>
                <span className="meta-value">{fmtDate(quotation.created_at)}</span>
              </div>
              <div className="quotation-doc-meta-row">
                <span className="meta-label">Valid Until</span>
                <span className="meta-value text-[#c41e3a]">
                  {quotation.expiry_date ? fmtDate(quotation.expiry_date) : '30 days'}
                </span>
              </div>
              <div className="quotation-doc-meta-row">
                <span className="meta-label">Type</span>
                <span className="meta-value">
                  {propertyServiceLabel || quotation.quotation_type}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-5">
        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/80">
          <p className="text-[9px] font-black text-[#1e5a9e] uppercase tracking-widest mb-2">
            Bill To / Customer
          </p>
          <p className="text-sm font-bold text-gray-900">{displayName}</p>
          {quotation.company_name && quotation.contact_person && (
            <p className="text-[10px] text-gray-600 mt-0.5">Contact: {quotation.contact_person}</p>
          )}
          <p className="text-[10px] text-gray-600 mt-2 leading-relaxed">
            {quotation.address}
            {(quotation.master_location_name || quotation.city) && (
              <>
                <br />
                {[quotation.master_location_name, quotation.city, quotation.state]
                  .filter(Boolean)
                  .join(', ')}
              </>
            )}
          </p>
          <p className="text-[10px] font-semibold mt-2">
            Mobile: {quotation.mobile}
            {quotation.email ? ` | Email: ${quotation.email}` : ''}
          </p>
        </div>

        {quotation.is_amc && (
          <div className="border-2 border-[#2d8a2f] rounded-lg p-3 bg-[#f0faf0]">
            <p className="text-[9px] font-black text-[#2d8a2f] uppercase tracking-widest mb-2">
              AMC Contract
            </p>
            <p className="text-xs text-gray-700">
              Annual Maintenance Contract - <strong>{quotation.visit_count}</strong> scheduled
              visit(s) included.
            </p>
            <p className="text-lg font-black text-[#c41e3a] mt-2">
              Contract Value: Rs.{fmt(totals.contract_amount || totals.grand_total)}
            </p>
            <p className="text-[9px] text-gray-500 mt-1 italic">
              Follow-up visits are included in contract; not billed separately.
            </p>
          </div>
        )}
      </div>

      <table className="quotation-items-table w-full border-collapse mb-4 text-[10px]">
        <thead>
          <tr className="bg-[#1e5a9e] text-white">
            <th className="border border-[#1e5a9e] px-2 py-2 w-8 text-center font-bold">#</th>
            <th className="border border-[#1e5a9e] px-2 py-2 text-left font-bold">Description</th>
            <th className="border border-[#1e5a9e] px-2 py-2 w-24 text-center font-bold">Frequency</th>
            <th className="border border-[#1e5a9e] px-2 py-2 w-12 text-center font-bold">Qty</th>
            <th className="border border-[#1e5a9e] px-2 py-2 w-20 text-right font-bold">Rate</th>
            <th className="border border-[#1e5a9e] px-2 py-2 w-24 text-right font-bold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={6} className="border border-gray-200 px-3 py-4 text-center text-gray-400">
                No line items
              </td>
            </tr>
          ) : (
            items.map((item, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border border-gray-200 px-2 py-2 text-center font-semibold text-gray-500">
                  {i + 1}
                </td>
                <td className="border border-gray-200 px-2 py-2">
                  <span className="font-bold text-gray-900">{item.service_name}</span>
                  {item.description && (
                    <p className="text-[9px] text-gray-500 mt-0.5">{item.description}</p>
                  )}
                </td>
                <td className="border border-gray-200 px-2 py-2 text-center">{item.frequency}</td>
                <td className="border border-gray-200 px-2 py-2 text-center">{item.quantity}</td>
                <td className="border border-gray-200 px-2 py-2 text-right">
                  {quotation.is_amc && item.total === 0 ? '-' : fmt(item.rate)}
                </td>
                <td className="border border-gray-200 px-2 py-2 text-right font-bold">
                  {quotation.is_amc && item.total === 0 ? 'Included' : fmt(item.total)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="flex justify-end mb-4">
        <div className="w-full max-w-xs text-[10px]">
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-semibold">Rs.{fmt(totals.total_amount)}</span>
          </div>
          {Number(quotation.discount) > 0 && (
            <div className="flex justify-between py-1 border-b border-gray-100 text-[#c41e3a]">
              <span>Discount</span>
              <span className="font-semibold">- Rs.{fmt(quotation.discount)}</span>
            </div>
          )}
          <div className="flex justify-between py-2 mt-1 bg-[#2d8a2f] text-white px-3 rounded font-bold text-sm">
            <span>Grand Total</span>
            <span>Rs.{fmt(totals.grand_total)}</span>
          </div>
          <p className="text-[9px] text-gray-500 italic mt-2 text-right">
            {amountInWords(totals.grand_total)}
          </p>
        </div>
      </div>

      {quotation.notes && (
        <div className="mb-4 p-2 bg-amber-50 border border-amber-200 rounded text-[10px]">
          <span className="font-bold text-amber-800">Note: </span>
          {quotation.notes}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-3">
          {structured ? (
            <>
              {STRUCTURED_SCOPE_TITLES.map((title) => {
                const content = scopeContent(title);
                if (!content) return null;
                return (
                  <div key={title}>
                    <h4 className="text-[9px] font-black text-[#1e5a9e] uppercase tracking-widest mb-1 border-b border-[#2d8a2f] pb-1">
                      {title}
                    </h4>
                    <p className="text-[10px] text-gray-700 leading-relaxed">{fmtScopeContent(content)}</p>
                  </div>
                );
              })}
              {scopes.filter((s) => isPerServiceScope(s.title)).map((s, i) => (
                <div key={`ps-${i}`}>
                  <h4 className="text-[9px] font-black text-[#1e5a9e] uppercase tracking-widest mb-1 border-b border-[#2d8a2f] pb-1">
                    {s.title}
                  </h4>
                  <p className="text-[10px] text-gray-700 leading-relaxed whitespace-pre-line">{fmtScopeContent(s.content)}</p>
                </div>
              ))}
              {customScopes.map((s, i) => (
                <div key={`custom-${i}`}>
                  <h4 className="text-[9px] font-black text-[#1e5a9e] uppercase tracking-widest mb-1 border-b border-[#2d8a2f] pb-1">
                    {s.title}
                  </h4>
                  <p className="text-[10px] text-gray-700 leading-relaxed">{s.content}</p>
                </div>
              ))}
            </>
          ) : scopes.some((s) => isPerServiceScope(s.title)) ? (
            <div className="space-y-3">
              {scopes.map((s, i) => (
                <div key={i}>
                  <h4 className="text-[9px] font-black text-[#1e5a9e] uppercase tracking-widest mb-1 border-b border-[#2d8a2f] pb-1">
                    {s.title}
                  </h4>
                  <p className="text-[10px] text-gray-700 leading-relaxed whitespace-pre-line">{fmtScopeContent(s.content)}</p>
                </div>
              ))}
            </div>
          ) : scopes.length > 0 ? (
            <div>
              <h4 className="text-[9px] font-black text-[#1e5a9e] uppercase tracking-widest mb-2 border-b border-[#2d8a2f] pb-1">
                Scope of Work
              </h4>
              <ol className="list-decimal list-inside space-y-1.5 text-[10px] text-gray-700">
                {scopes.map((s, i) => (
                  <li key={i}>
                    <span className="font-bold">{s.title}: </span>
                    {fmtScopeContent(s.content)}
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <p className="text-[10px] text-gray-500 italic">Standard pest management as agreed.</p>
          )}
        </div>

        <div>
          <h4 className="text-[9px] font-black text-[#1e5a9e] uppercase tracking-widest mb-2 border-b border-[#2d8a2f] pb-1">
            Payment Terms
          </h4>
          {paymentTerms.length > 0 ? (
            <ul className="space-y-1 text-[10px] text-gray-700">
              {paymentTerms.map((p, i) => (
                <li key={i}>
                  <span className="font-bold">{p.term}:</span> {p.description}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[10px] text-gray-500">As mutually agreed.</p>
          )}
          <h4 className="text-[9px] font-black text-[#1e5a9e] uppercase tracking-widest mt-4 mb-2">
            Bank Details
          </h4>
          <div className="text-[10px] text-gray-700 space-y-0.5">
            <p>
              <span className="font-semibold">Account:</span> {BANK_DETAILS.accountName}
            </p>
            <p>
              <span className="font-semibold">Bank:</span> {BANK_DETAILS.bankName}
            </p>
            <p>
              <span className="font-semibold">Branch:</span> {BANK_DETAILS.branch}
            </p>
            <p>
              <span className="font-semibold">A/C No:</span> {BANK_DETAILS.accountNo}
            </p>
            <p>
              <span className="font-semibold">IFSC:</span> {BANK_DETAILS.ifsc}
            </p>
          </div>
        </div>
      </div>

      <div className="quotation-doc-footer flex justify-between items-end pt-4 border-t-2 border-gray-200 gap-6">
        <div className="text-[9px] text-gray-500">
          <p>Thank you for choosing {COMPANY.name}.</p>
          <p className="mt-1">
            {COMPANY.website} | {formatCompanyPhone()}
          </p>
          {quotation.created_by_name && (
            <p className="mt-1 text-gray-400">Prepared by: {quotation.created_by_name}</p>
          )}
        </div>
        <div className="text-center quotation-signature-block">
          <img
            src={COMPANY_SIGNATURE_STAMP_URL}
            alt={`Authorised Signatory — ${COMPANY.legalName}`}
            className="company-signature-stamp mx-auto object-contain"
          />
          <p className="text-[10px] font-bold text-[#1e5a9e] mt-2">{COMPANY.legalName}</p>
          <p className="text-[8px] text-gray-500">{COMPANY.brandName}</p>
          <p className="text-[8px] text-gray-500 uppercase tracking-wide">Authorised Signatory</p>
        </div>
      </div>
    </div>
  );
};

export default QuotationDocument;
