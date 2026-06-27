import React from 'react';
import { format } from 'date-fns';
import type { Quotation, QuotationStatus } from '../../types';
import {
  COMPANY,
  BANK_DETAILS,
  amountInWords,
  getQuotationDisplayName,
  formatCompanyPhone,
  DEFAULT_TERMS,
} from '../../constants/quotation';
import { hasStructuredScopes, STRUCTURED_SCOPE_TITLES } from '../../constants/quotationTemplates';
import { COMPANY_SIGNATURE_STAMP_URL, COMPANY_LOGO_URL } from '../../constants/companyAssets';
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

const STATUS_CLASS: Record<QuotationStatus, string> = {
  Draft: 'q-status-draft',
  Sent: 'q-status-sent',
  Approved: 'q-status-approved',
  Rejected: 'q-status-rejected',
  Converted: 'q-status-converted',
  Expired: 'q-status-expired',
};

const PAYMENT_ICONS = ['💳', '🏦', '📋', '✓', '📅'];

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

  const locationLine = [quotation.master_location_name, quotation.city, quotation.state]
    .filter(Boolean)
    .join(', ');

  const gstAmount = Number(quotation.tax_amount || 0);
  const discount = Number(quotation.discount || 0);
  const isDraft = quotation.status === 'Draft';

  const renderScopeSections = () => {
    if (structured) {
      return (
        <>
          {STRUCTURED_SCOPE_TITLES.map((title) => {
            const content = scopeContent(title);
            if (!content) return null;
            return (
              <div key={title} className="q-scope-section">
                <h4 className="q-scope-heading">{title}</h4>
                <p className="q-scope-body">{fmtScopeContent(content)}</p>
              </div>
            );
          })}
          {scopes.filter((s) => isPerServiceScope(s.title)).map((s, i) => (
            <div key={`ps-${i}`} className="q-scope-section">
              <h4 className="q-scope-heading">{s.title}</h4>
              <p className="q-scope-body">{fmtScopeContent(s.content)}</p>
            </div>
          ))}
          {customScopes.map((s, i) => (
            <div key={`custom-${i}`} className="q-scope-section">
              <h4 className="q-scope-heading">{s.title}</h4>
              <p className="q-scope-body">{s.content}</p>
            </div>
          ))}
        </>
      );
    }

    if (scopes.some((s) => isPerServiceScope(s.title))) {
      return scopes.map((s, i) => (
        <div key={i} className="q-scope-section">
          <h4 className="q-scope-heading">{s.title}</h4>
          <p className="q-scope-body">{fmtScopeContent(s.content)}</p>
        </div>
      ));
    }

    if (scopes.length > 0) {
      return (
        <ol className="q-scope-list">
          {scopes.map((s, i) => (
            <li key={i}>
              <strong>{s.title}:</strong> {fmtScopeContent(s.content)}
            </li>
          ))}
        </ol>
      );
    }

    return <p className="q-scope-body">Standard pest management as per industry standards and agreed scope.</p>;
  };

  return (
    <div className={`quotation-doc ${isDraft ? 'is-draft' : ''} ${className}`}>
      {/* ── Header ── */}
      <header className="q-header">
        <div className="q-company-block">
          <img
            src={COMPANY_LOGO_URL}
            alt={`${COMPANY.brandName} — ${COMPANY.website}`}
            className="q-logo"
          />
          <div className="q-company-info">
            <h1 className="q-company-name">{COMPANY.legalName}</h1>
            <p className="q-company-tagline">
              {COMPANY.brandName} · {COMPANY.tagline}
            </p>
            <p className="q-company-line">{COMPANY.address}</p>
            <p className="q-company-line">
              {formatCompanyPhone()} ·{' '}
              <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
            </p>
            <p className="q-company-line">
              <a href={COMPANY.website}>{COMPANY.website}</a>
            </p>
            {COMPANY.gstin ? (
              <p className="q-company-line">GSTIN: {COMPANY.gstin}</p>
            ) : null}
            <span className="q-license">
              Govt. License: {quotation.license_number || COMPANY.license}
            </span>
          </div>
        </div>

        <div className="q-meta-card">
          <div className="q-meta-top">
            <h2 className="q-meta-title">Quotation</h2>
            <span className={`q-status-badge ${STATUS_CLASS[quotation.status] || 'q-status-draft'}`}>
              {quotation.status}
            </span>
          </div>
          <div className="q-meta-grid">
            <div className="q-meta-row">
              <span className="q-meta-label">Quotation No.</span>
              <span className="q-meta-value">{quotation.quotation_no}</span>
            </div>
            {quotation.invoice_no && (
              <div className="q-meta-row">
                <span className="q-meta-label">Invoice Ref.</span>
                <span className="q-meta-value">{quotation.invoice_no}</span>
              </div>
            )}
            {quotation.reference_no && (
              <div className="q-meta-row">
                <span className="q-meta-label">Reference</span>
                <span className="q-meta-value">{quotation.reference_no}</span>
              </div>
            )}
            <div className="q-meta-row">
              <span className="q-meta-label">Date</span>
              <span className="q-meta-value">{fmtDate(quotation.created_at)}</span>
            </div>
            <div className="q-meta-row">
              <span className="q-meta-label">Valid Until</span>
              <span className="q-meta-value is-urgent">
                {quotation.expiry_date ? fmtDate(quotation.expiry_date) : '30 days'}
              </span>
            </div>
            <div className="q-meta-row">
              <span className="q-meta-label">Customer Type</span>
              <span className="q-meta-value">
                {propertyServiceLabel || quotation.quotation_type}
              </span>
            </div>
          </div>
          <div className="q-meta-footer">
            {quotation.created_by_name && (
              <span>Prepared by {quotation.created_by_name}</span>
            )}
            {quotation.updated_at && quotation.updated_at !== quotation.created_at && (
              <span>
                {quotation.created_by_name ? ' · ' : ''}
                Updated {fmtDate(quotation.updated_at)}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── Customer + AMC ── */}
      <div className={`q-customer-row ${quotation.is_amc ? '' : 'is-single'}`}>
        <div className="q-card">
          <h3 className="q-card-title">
            <span className="q-card-title-dot" />
            Bill To / Customer
          </h3>
          <div className="q-field-grid">
            <div className="q-field is-full">
              <div className="q-field-label">Customer / Company</div>
              <div className="q-field-value is-name">{displayName}</div>
            </div>
            {quotation.contact_person && (
              <div className="q-field">
                <div className="q-field-label">Contact Person</div>
                <div className="q-field-value">{quotation.contact_person}</div>
              </div>
            )}
            <div className="q-field">
              <div className="q-field-label">Mobile</div>
              <div className="q-field-value">{quotation.mobile}</div>
            </div>
            {quotation.email && (
              <div className="q-field">
                <div className="q-field-label">Email</div>
                <div className="q-field-value">{quotation.email}</div>
              </div>
            )}
            {quotation.property_type && (
              <div className="q-field">
                <div className="q-field-label">Property Type</div>
                <div className="q-field-value">{quotation.property_type}</div>
              </div>
            )}
            {quotation.template_service_type && (
              <div className="q-field">
                <div className="q-field-label">Services</div>
                <div className="q-field-value">{quotation.template_service_type}</div>
              </div>
            )}
            <div className="q-field is-full">
              <div className="q-field-label">Service Address</div>
              <div className="q-field-value">
                {quotation.address}
                {locationLine ? `, ${locationLine}` : ''}
                {quotation.pincode ? ` — ${quotation.pincode}` : ''}
              </div>
            </div>
          </div>
        </div>

        {quotation.is_amc && (
          <div className="q-amc-card">
            <h3 className="q-card-title">
              <span className="q-card-title-dot" />
              AMC Contract
            </h3>
            <p className="q-scope-body">
              Annual Maintenance Contract with{' '}
              <strong>{quotation.visit_count}</strong> scheduled visit(s) included.
              Follow-up visits are part of the contract and not billed separately.
            </p>
            <div className="q-amc-value">
              Rs.{fmt(totals.contract_amount || totals.grand_total)}
            </div>
            <p className="q-scope-body" style={{ marginTop: 6, fontSize: 11 }}>
              Total contract value for all visits
            </p>
          </div>
        )}
      </div>

      {/* ── Services table + Summary ── */}
      <div className="q-services-block">
        <div className="q-table-wrap">
          <table className="q-items-table">
            <thead>
              <tr>
                <th className="num">#</th>
                <th>Service / Description</th>
                <th>Frequency</th>
                <th className="num">Qty</th>
                <th className="right">Rate</th>
                <th className="right">Disc.</th>
                <th className="right">GST</th>
                <th className="right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr className="q-empty-row">
                  <td colSpan={8}>No line items added</td>
                </tr>
              ) : (
                items.map((item, i) => (
                  <tr key={i}>
                    <td className="num">{i + 1}</td>
                    <td>
                      <span className="q-service-name">{item.service_name}</span>
                      {item.description && (
                        <span className="q-service-desc">{item.description}</span>
                      )}
                    </td>
                    <td>{item.frequency}</td>
                    <td className="num">{item.quantity}</td>
                    <td className="right">
                      {quotation.is_amc && item.total === 0 ? '—' : fmt(item.rate)}
                    </td>
                    <td className="right">—</td>
                    <td className="right">—</td>
                    <td className="right">
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

        <div className="q-summary-card">
          <h3 className="q-summary-title">Amount Summary</h3>
          <div className="q-summary-line">
            <span>Subtotal</span>
            <span>Rs.{fmt(totals.total_amount)}</span>
          </div>
          {discount > 0 && (
            <div className="q-summary-line is-discount">
              <span>Discount</span>
              <span>- Rs.{fmt(discount)}</span>
            </div>
          )}
          {gstAmount > 0 && (
            <div className="q-summary-line">
              <span>GST / Tax</span>
              <span>Rs.{fmt(gstAmount)}</span>
            </div>
          )}
          <div className="q-grand-total">
            <span className="q-grand-total-label">Grand Total</span>
            <span className="q-grand-total-value">Rs.{fmt(totals.grand_total)}</span>
          </div>
          <p className="q-amount-words">{amountInWords(totals.grand_total)}</p>
        </div>
      </div>

      {quotation.notes && (
        <div className="q-notes-banner">
          <strong>Important Note:</strong> {quotation.notes}
        </div>
      )}

      {/* ── Scope + Payment/Bank ── */}
      <div className="q-bottom-grid">
        <div className="q-card q-scope-card">
          <h3 className="q-card-title">
            <span className="q-card-title-dot" />
            Scope & Service Details
          </h3>
          {renderScopeSections()}
        </div>

        <div className="q-card">
          <h3 className="q-card-title">
            <span className="q-card-title-dot" />
            Payment Terms
          </h3>
          {paymentTerms.length > 0 ? (
            <ul className="q-payment-list">
              {paymentTerms.map((p, i) => (
                <li key={i} className="q-payment-item">
                  <span className="q-payment-icon">{PAYMENT_ICONS[i % PAYMENT_ICONS.length]}</span>
                  <span>
                    <span className="q-payment-term">{p.term}</span>
                    {p.description && (
                      <span className="q-payment-desc">{p.description}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="q-scope-body">Payment as mutually agreed between both parties.</p>
          )}

          <h3 className="q-card-title" style={{ marginTop: 18 }}>
            <span className="q-card-title-dot" />
            Bank Details
          </h3>
          <div className="q-bank-grid">
            <div className="q-bank-field">
              <div className="q-field-label">Account Name</div>
              <div className="q-field-value">{BANK_DETAILS.accountName}</div>
            </div>
            <div className="q-bank-field">
              <div className="q-field-label">Bank</div>
              <div className="q-field-value">{BANK_DETAILS.bankName}</div>
            </div>
            <div className="q-bank-field">
              <div className="q-field-label">Branch</div>
              <div className="q-field-value">{BANK_DETAILS.branch}</div>
            </div>
            <div className="q-bank-field">
              <div className="q-field-label">IFSC Code</div>
              <div className="q-field-value">{BANK_DETAILS.ifsc}</div>
            </div>
            <div className="q-bank-field is-full">
              <div className="q-field-label">Account Number</div>
              <div className="q-field-value">{BANK_DETAILS.accountNo}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer: Terms + Signature ── */}
      <div className="q-footer-grid">
        <div className="q-footer-terms">
          <h4>Terms & Conditions</h4>
          <p>
            {(quotation.terms_and_conditions || DEFAULT_TERMS)
              .split('\n')
              .slice(0, 4)
              .join(' ')}
          </p>
          {quotation.created_by_name && (
            <p style={{ marginTop: 8 }}>
              Prepared by: <strong>{quotation.created_by_name}</strong> ·{' '}
              {fmtDate(quotation.created_at)}
            </p>
          )}
        </div>
        <div className="q-signature-block">
          <img
            src={COMPANY_SIGNATURE_STAMP_URL}
            alt={`Authorised Signatory — ${COMPANY.legalName}`}
            className="q-signature-stamp"
          />
          <p className="q-signature-name">{COMPANY.legalName}</p>
          <p className="q-signature-role">Authorised Signatory</p>
          <p className="q-signature-date">Date: {fmtDate(quotation.created_at)}</p>
        </div>
      </div>

      <footer className="q-footer-bar">
        <span className="q-footer-thanks">
          Thank you for choosing {COMPANY.brandName}
        </span>
        <span>
          <strong>{COMPANY.website}</strong> · {formatCompanyPhone()} · {COMPANY.email}
        </span>
        <span>© {new Date().getFullYear()} {COMPANY.legalName}. All rights reserved.</span>
      </footer>
    </div>
  );
};

export default QuotationDocument;
