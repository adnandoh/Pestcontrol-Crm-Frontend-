# Quotation UI Redesign — Developer Prompt
## PestControl99 / Multi Pest Care LLP

---

## MASTER BRIEF

**Goal:** Redesign the quotation view/print layout to be clean, compact, professional, and easy to read. The current design has too much empty space, oversized logo, misaligned sections, and a cluttered feel. The new design should look like a proper business document — not a webpage with a lot of whitespace padding.

**Output:** This should work both as an on-screen view AND as a PDF download (print-friendly). Use a fixed max-width of `794px` (A4 width) so it renders identically in both contexts.

**Font:** Use `Inter` (Google Fonts) — clean, modern, professional.

**Color Palette (keep brand colors):**
- Primary Green: `#2E7D32`
- Accent Green (tagline/links): `#4CAF50`
- Dark Navy (table header, labels): `#1A237E`
- Text Black: `#1A1A1A`
- Muted Text: `#555555`
- Light Border: `#E0E0E0`
- Background: `#FFFFFF`
- Table header BG: `#1A237E` with white text
- Grand Total row BG: `#2E7D32` with white text

---

## DETAIL PROMPT — SECTION BY SECTION

---

### 1. HEADER / COMPANY INFO SECTION

**Current Problem:** Logo is too large, company info and quotation box feel disconnected, inconsistent vertical alignment.

**Fix:**
- Layout: 3-column row using CSS Grid — `[Logo] [Company Info] [Quotation Box]`
- **Logo:** Max height `52px`, vertically centered. Do NOT stretch. Maintain aspect ratio.
- **Company Info (center column):**
  - Company name: `14px`, `font-weight: 700`, color `#1A1A1A`
  - Tagline: `11px`, color `#4CAF50`, uppercase, letter-spacing `0.5px`
  - Address, phone, website, license: `11px`, color `#555`, line-height `1.6`
  - Website link: `#4CAF50`, no underline
  - Govt License: `#4CAF50`, bold
- **Quotation Box (right column):**
  - Bordered box: `1.5px solid #1A237E`, border-radius `6px`, padding `12px 16px`
  - Title "QUOTATION": `13px`, `font-weight: 700`, color `#1A237E`, centered, border-bottom `1px solid #E0E0E0`, padding-bottom `8px`, margin-bottom `8px`
  - Key-value rows: label left `#555`, `11px`; value right `#1A1A1A`, `11px`, `font-weight: 600`
  - Row spacing: `4px` gap between rows

**Grid:** `grid-template-columns: 140px 1fr 200px`, gap `16px`, align-items `center`

---

### 2. DIVIDER

- Single `1px solid #2E7D32` horizontal line, `margin: 12px 0`

---

### 3. BILL TO / CUSTOMER SECTION

**Current Problem:** Takes half the row with nothing in the right half — wasted space.

**Fix:**
- Layout: 2-column grid — `[Bill To] [Notes / Internal Ref]`
- `grid-template-columns: 1fr 1fr`, gap `16px`
- **Bill To box:** Light border `1px solid #E0E0E0`, border-radius `6px`, padding `12px 14px`
  - Label "BILL TO / CUSTOMER": `10px`, `#1A237E`, uppercase, `font-weight: 700`, letter-spacing `0.8px`, margin-bottom `6px`
  - Customer name: `13px`, `font-weight: 700`, `#1A1A1A`
  - Contact, address, mobile, email: `11px`, `#555`, line-height `1.7`
- **Right column:** Can hold "Notes" or "Service Address" if available, or leave visually balanced with a subtle placeholder like "No additional notes." in muted text. Do NOT leave it completely empty — it creates imbalance.

---

### 4. LINE ITEMS TABLE

**Current Problem:** Table has too much padding, amounts misaligned, excess whitespace in rows.

**Fix:**
- Full-width table, `border-collapse: collapse`
- **Header row:** BG `#1A237E`, text white, `11px`, uppercase, `font-weight: 600`, padding `8px 12px`
- **Data rows:** BG white, `12px`, `#1A1A1A`, padding `8px 12px`, border-bottom `1px solid #F0F0F0`
- Alternating row: light `#F9F9F9` for even rows
- Column widths: `#` → `40px` | `Description` → auto (flex) | `Frequency` → `110px` | `Qty` → `60px` | `Rate` → `80px` | `Amount` → `80px`
- Numeric columns (Qty, Rate, Amount): `text-align: right`
- Description: `text-align: left`

---

### 5. SUBTOTAL + GRAND TOTAL

**Current Problem:** Totals are floated right but feel disconnected from the table.

**Fix:**
- Place immediately below the table, right-aligned block, max-width `260px`, margin-left auto
- **Subtotal row:** `12px`, `#555`, label left, value right, padding `6px 0`, border-bottom `1px solid #E0E0E0`
- **Grand Total row:** BG `#2E7D32`, text white, `13px`, `font-weight: 700`, padding `8px 12px`, border-radius `4px`, margin-top `6px`
- **Amount in words:** `11px`, `#555`, italic, right-aligned, margin-top `4px` — e.g. "Two Thousand Rupees Only"

---

### 6. BOTTOM SECTION — 2 COLUMNS

**Current Problem:** Payment terms and bank details are placed awkwardly with large blank areas.

**Fix:**
- Layout: 2-column grid — `[Notes / Terms] [Payment Terms + Bank Details]`
- `grid-template-columns: 1fr 1fr`, gap `24px`, margin-top `16px`
- **Left column:**
  - "Standard pest management as agreed." in `11px`, `#555`, italic
  - Can also include a "Thank you" message here
- **Right column:**
  - **PAYMENT TERMS** label: `10px`, `#1A237E`, uppercase, `font-weight: 700`, margin-bottom `6px`
  - Each term: `11px`, `#1A1A1A` — bold label, normal value (e.g. **Mode:** Cash / UPI / Bank transfer accepted.)
  - Line spacing: `5px` gap
  - Divider `1px solid #E0E0E0` between Payment Terms and Bank Details
  - **BANK DETAILS** label: same style as Payment Terms label
  - Bank info rows: same style as payment terms rows

---

### 7. FOOTER

**Current Problem:** Signature block and footer text misaligned.

**Fix:**
- Layout: 2-column — `[Thank you text + website] [Signature block]`
- `grid-template-columns: 1fr auto`, align-items `flex-end`
- **Left:** "Thank you for choosing Multi Pest Care LLP." in `11px`, `#555`; below it website + phone in `11px`, `#2E7D32`
- **Right:** Signature image (if available) max-height `48px`; below it "Multi Pest Care LLP" `11px`, bold, `#1A237E`; "Pest Control 99" `10px`, `#555`; "AUTHORISED SIGNATORY" `9px`, uppercase, `#555`, letter-spacing `0.5px`
- Top divider: `1px solid #E0E0E0`, margin-bottom `12px`

---

### 8. STATUS BAR (Below the document — screen only)

**Current Problem:** 3-column status bar shows redundant info with too much padding.

**Fix:**
- Keep the 3-column bar (Status / Grand Total / Type) — it's useful context
- Reduce padding to `12px 20px`
- Font: `12px`, labels `#555`, values `13px`, `font-weight: 700`
- Grand Total value: `#2E7D32`
- Add `border-top: 2px solid #E0E0E0` to separate from document

---

## SPACING & GLOBAL RULES

| Property | Value |
|---|---|
| Document padding | `32px` (screen), `24px` (print) |
| Section gap | `16px` between sections |
| Body font size | `12px` base |
| Border radius | `6px` for boxes, `4px` for buttons |
| Box shadow (screen) | `0 2px 12px rgba(0,0,0,0.08)` on main doc card |

---

## PRINT / PDF RULES

Add a `@media print` block:
```css
@media print {
  body { background: white; }
  .status-bar, .action-buttons { display: none; }
  .document-card { box-shadow: none; padding: 24px; }
  @page { margin: 10mm; size: A4; }
}
```

---

## DO NOT CHANGE

- Quotation number, invoice ref, dates — these are dynamic data, do not hardcode
- All color variables — keep exact hex values above
- Logo image source — just resize/constrain it with CSS
- Bank account details — display as-is from data

---

## SUMMARY OF KEY FIXES

1. **Logo** → max-height `52px`, no oversizing
2. **Header** → 3-column grid, all aligned center vertically
3. **Bill To** → 2-column, no empty half-page
4. **Table** → compact rows, proper column widths, right-align numbers
5. **Totals** → flush to table, right-aligned block
6. **Payment + Bank** → side by side in 2 columns
7. **Footer** → signature right, text left, clean divider
8. **Overall** → reduce all padding/margin by ~30%, tighten line heights
