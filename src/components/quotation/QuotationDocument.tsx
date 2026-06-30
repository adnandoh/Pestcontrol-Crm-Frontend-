import React from 'react';
import { format } from 'date-fns';
import type { Quotation } from '../../types';
import {
  COMPANY,
  BANK_DETAILS,
  amountInWords,
  getQuotationDisplayName,
  formatCompanyPhone,
} from '../../constants/quotation';
import { hasStructuredScopes, STRUCTURED_SCOPE_TITLES } from '../../constants/quotationTemplates';
import { resolveQuotationDisplayScopes, sortItemsByServiceOrder } from '../../constants/quotationServices';
import { COMPANY_SIGNATURE_STAMP_URL, COMPANY_LOGO_URL } from '../../constants/companyAssets';
import { resolveQuotationTotals } from '../../utils/quotationTotals';
import './QuotationDocument.css';

const fmt = (n: number) =>
  Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const fmtScopeContent = (content: string) =>
  content.replace(/\s*\|\s*$/g, '').trim();

const renderScopeBody = (content: string) => {
  const cleaned = fmtScopeContent(content);
  const lines = cleaned.split('\n').map((l) => l.trim()).filter(Boolean);

  return (
    <div className="q-scope-body">
      {lines.map((line, idx) => {
        if (line.includes('|')) {
          const parts = line.split('|').map((p) => p.trim()).filter(Boolean);
          return (
            <div key={idx} className="q-scope-tags">
              {parts.map((part, pi) => (
                <span key={pi} className="q-scope-tag">
                  {part}
                </span>
              ))}
            </div>
          );
        }
        return (
          <p key={idx} className="q-scope-line">
            {line}
          </p>
        );
      })}
    </div>
  );
};

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
  const items = sortItemsByServiceOrder(
    quotation.items || [],
    quotation.template_service_type,
  );
  const scopes = resolveQuotationDisplayScopes(quotation);
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

  const locationLine = [quotation.master_location_name, quotation.city, quotation.state]
    .filter(Boolean)
    .join(', ');

  const licenseNo = quotation.license_number || COMPANY.license;

  const renderScopeSections = () => {
    if (structured) {
      return (
        <>
          {STRUCTURED_SCOPE_TITLES.map((title) => {
            const content = scopeContent(title);
            if (!content) return null;
            return (
              <div key={title} className="q-scope-block">
                <h4 className="q-scope-title">{title}</h4>
                {renderScopeBody(content)}
              </div>
            );
          })}
          {scopes
            .filter((s) => isPerServiceScope(s.title))
            .map((s, i) => (
              <div key={`ps-${i}`} className="q-scope-block">
                <h4 className="q-scope-title">{s.title}</h4>
                {renderScopeBody(s.content)}
              </div>
            ))}
          {customScopes.map((s, i) => (
            <div key={`custom-${i}`} className="q-scope-block">
              <h4 className="q-scope-title">{s.title}</h4>
              <p className="q-scope-line">{s.content}</p>
            </div>
          ))}
        </>
      );
    }

    if (scopes.some((s) => isPerServiceScope(s.title))) {
      return scopes.map((s, i) => (
        <div key={i} className="q-scope-block">
          <h4 className="q-scope-title">{s.title}</h4>
          {renderScopeBody(s.content)}
        </div>
      ));
    }

    if (scopes.length > 0) {
      return (
        <div className="q-scope-block">
          <h4 className="q-scope-title">Scope of Work</h4>
          <ol className="q-scope-list">
            {scopes.map((s, i) => (
              <li key={i}>
                <strong>{s.title}:</strong> {fmtScopeContent(s.content)}
              </li>
            ))}
          </ol>
        </div>
      );
    }

    return (
      <p className="q-placeholder">
        Standard pest management as agreed.
      </p>
    );
  };

  const renderCustomerRight = () => {
    if (quotation.notes) {
      return (
        <div className="q-customer-side">
          <p className="q-section-label">Notes</p>
          <p className="q-customer-detail">{quotation.notes}</p>
        </div>
      );
    }

    if (quotation.property_type || quotation.template_service_type) {
      return (
        <div className="q-customer-side">
          <p className="q-section-label">Service Details</p>
          {quotation.property_type && (
            <p className="q-customer-detail">
              <strong>Property:</strong> {quotation.property_type}
            </p>
          )}
          {quotation.template_service_type && (
            <p className="q-customer-detail">
              <strong>Services:</strong> {quotation.template_service_type}
            </p>
          )}
          {quotation.reference_no && (
            <p className="q-customer-detail">
              <strong>Reference:</strong> {quotation.reference_no}
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="q-customer-side">
        <p className="q-section-label">Notes</p>
        <p className="q-placeholder">No additional notes.</p>
      </div>
    );
  };

  return (
    <div className={`quotation-doc ${className}`}>
      {/* 1. Header */}
      <header className="q-header">
        <div className="q-logo-col">
          <img
            src={COMPANY_LOGO_URL}
            alt={`${COMPANY.brandName} — ${COMPANY.website}`}
            className="q-logo"
          />
          <p className="q-header-license">License: {licenseNo}</p>
        </div>

        <div className="q-meta-box">
          <h2 className="q-meta-title">Quotation</h2>
          <div className="q-meta-rows">
            <div className="q-meta-row">
              <span className="q-meta-label">Quotation No.</span>
              <span className="q-meta-value q-nowrap">{quotation.quotation_no}</span>
            </div>
            {quotation.invoice_no && (
              <div className="q-meta-row">
                <span className="q-meta-label">Invoice Ref.</span>
                <span className="q-meta-value q-nowrap">{quotation.invoice_no}</span>
              </div>
            )}
            <div className="q-meta-row">
              <span className="q-meta-label">Date</span>
              <span className="q-meta-value q-nowrap">{fmtDate(quotation.created_at)}</span>
            </div>
            <div className="q-meta-row">
              <span className="q-meta-label">Valid Until</span>
              <span className="q-meta-value q-nowrap is-urgent">
                {quotation.expiry_date ? fmtDate(quotation.expiry_date) : '30 days'}
              </span>
            </div>
            <div className="q-meta-row">
              <span className="q-meta-label">Type</span>
              <span className="q-meta-value">{propertyServiceLabel || quotation.quotation_type}</span>
            </div>
          </div>
        </div>
      </header>

      <hr className="q-divider" />

      {/* 3. Bill To */}
      <section className="q-customer-grid">
        <div className="q-bill-to">
          <p className="q-section-label">Bill To / Customer</p>
          <p className="q-customer-name">{displayName}</p>
          {quotation.contact_person && (
            <p className="q-customer-detail">Contact: {quotation.contact_person}</p>
          )}
          <p className="q-customer-detail">
            {quotation.address}
            {locationLine ? `, ${locationLine}` : ''}
            {quotation.pincode ? ` — ${quotation.pincode}` : ''}
          </p>
          <p className="q-customer-detail">
            Mobile: {quotation.mobile}
            {quotation.email ? ` · Email: ${quotation.email}` : ''}
          </p>
        </div>
        {renderCustomerRight()}
      </section>

      {/* 4. Line items */}
      <div className="q-table-wrap">
        <table className="q-table">
          <colgroup>
            <col className="col-num" />
            <col className="col-desc" />
            <col className="col-freq" />
            <col className="col-qty" />
            <col className="col-rate" />
            <col className="col-amt" />
          </colgroup>
          <thead>
            <tr>
              <th className="col-center">#</th>
              <th>Description</th>
              <th className="col-center">Frequency</th>
              <th className="col-right">Qty</th>
              <th className="col-right">Rate</th>
              <th className="col-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="q-empty-cell">
                  No line items
                </td>
              </tr>
            ) : (
              items.map((item, i) => (
                <tr key={i}>
                  <td className="col-center q-num">{i + 1}</td>
                  <td className="q-service-cell">
                    <span className="q-service-name">{item.service_name}</span>
                    {item.description &&
                      item.description !== item.frequency &&
                      !item.frequency.includes(item.description) && (
                      <span className="q-service-desc">{item.description}</span>
                    )}
                  </td>
                  <td className="q-freq-cell">{item.frequency}</td>
                  <td className="col-right q-num">{item.quantity}</td>
                  <td className="col-right q-num">
                    {quotation.is_amc && item.total === 0 ? '—' : fmt(item.rate)}
                  </td>
                  <td className="col-right q-num">
                    <strong>
                      {quotation.is_amc && item.total === 0 ? 'Included' : fmt(item.total)}
                    </strong>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Totals */}
      <div className="q-totals">
        <div className="q-totals-row">
          <span>Subtotal</span>
          <span className="q-num">Rs.{fmt(totals.total_amount)}</span>
        </div>
        {Number(quotation.discount) > 0 && (
          <div className="q-totals-row is-discount">
            <span>Discount</span>
            <span className="q-num">- Rs.{fmt(quotation.discount)}</span>
          </div>
        )}
        <div className="q-grand-total">
          <span>Grand Total</span>
          <span className="q-num">Rs.{fmt(totals.grand_total)}</span>
        </div>
        <p className="q-amount-words">{amountInWords(totals.grand_total)}</p>
      </div>

      {/* 6. Bottom: scopes + payment/bank */}
      <section className="q-bottom-grid">
        <div className="q-bottom-left">{renderScopeSections()}</div>

        <div className="q-bottom-right">
          <p className="q-payment-label">Payment Terms</p>
          {paymentTerms.length > 0 ? (
            <ul className="q-payment-list">
              {paymentTerms.map((p, i) => (
                <li key={i}>
                  <strong>{p.term}:</strong> {p.description}
                </li>
              ))}
            </ul>
          ) : (
            <p className="q-placeholder">As mutually agreed.</p>
          )}

          <hr className="q-bank-divider" />

          <p className="q-payment-label">Bank Details</p>
          <div className="q-bank-rows">
            <p>
              <strong>Account:</strong> {BANK_DETAILS.accountName}
            </p>
            <p>
              <strong>Bank:</strong> {BANK_DETAILS.bankName}
            </p>
            <p>
              <strong>Branch:</strong> {BANK_DETAILS.branch}
            </p>
            <p>
              <strong>A/C No:</strong> {BANK_DETAILS.accountNo}
            </p>
            <p>
              <strong>IFSC:</strong> {BANK_DETAILS.ifsc}
            </p>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="q-footer">
        <div className="q-footer-left">
          <p>Thank you for choosing {COMPANY.legalName}.</p>
          <p className="q-footer-contact">
            {COMPANY.website} · {formatCompanyPhone()}
          </p>
          <p className="q-footer-license">License: {licenseNo}</p>
          {quotation.created_by_name && (
            <p className="q-footer-prepared">Prepared by: {quotation.created_by_name}</p>
          )}
        </div>
        <div className="q-signature-block">
          <img
            src={COMPANY_SIGNATURE_STAMP_URL}
            alt={`Authorised Signatory — ${COMPANY.legalName}`}
            className="q-signature-stamp"
          />
          <p className="q-signature-company">{COMPANY.legalName}</p>
          <p className="q-signature-brand">{COMPANY.brandName}</p>
          <p className="q-signature-role">Authorised Signatory</p>
        </div>
      </footer>
    </div>
  );
};

export default QuotationDocument;
