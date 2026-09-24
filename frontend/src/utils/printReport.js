export const PRINT_THEME = {
  primary: '#C8102E',
  primaryDark: '#7A0C1E',
  accent: '#C6A15B',
  ink: '#241416',
  textMuted: '#6B6062',
  border: '#E8E2E0',
  paper: '#FFFFFF',
  rowAlt: '#FAFAFA',
};

export const LOGO_URL = '/assets/logo.png.jpg';

export function getPrintStyles() {
  return `
    @page {
      size: A4 portrait;
      margin: 16mm 14mm;
    }

    * { box-sizing: border-box; }

    html, body {
      margin: 0;
      padding: 0;
      background: ${PRINT_THEME.paper} !important;
      color: ${PRINT_THEME.ink};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-family: 'Inter', Arial, sans-serif;
      position: relative;
      min-height: 100vh;
    }

    .print-watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      width: 420px;
      height: 420px;
      transform: translate(-50%, -50%);
      z-index: 9999;
      pointer-events: none;
      opacity: 0.08;
    }

    .print-watermark img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .print-content {
      width: 100%;
      max-width: 780px;
      margin: 0 auto;
      padding: 8px 0 24px;
      background: transparent;
    }

    .print-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid ${PRINT_THEME.accent};
      page-break-inside: avoid;
    }

    .print-header img {
      width: 64px;
      height: 64px;
      object-fit: contain;
      flex-shrink: 0;
    }

    .print-header-text h1 {
      margin: 0;
      color: ${PRINT_THEME.primary};
      font-size: 1.35rem;
      font-family: 'Sora', Arial, sans-serif;
      font-weight: 700;
      line-height: 1.2;
    }

    .print-header-text .subtitle {
      color: ${PRINT_THEME.textMuted};
      margin-top: 3px;
      font-size: 0.84rem;
      line-height: 1.4;
    }

    .print-date {
      margin-left: auto;
      text-align: right;
      font-size: 0.78rem;
      color: ${PRINT_THEME.textMuted};
      line-height: 1.4;
      align-self: flex-start;
      white-space: nowrap;
    }

    .print-date strong {
      color: ${PRINT_THEME.primaryDark};
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    .report-title {
      margin: 0 0 10px;
      font-size: 1.1rem;
      color: ${PRINT_THEME.primaryDark};
      font-family: 'Sora', Arial, sans-serif;
      border-bottom: 2px solid ${PRINT_THEME.primary};
      padding-bottom: 5px;
      page-break-after: avoid;
    }

    .report-title--center {
      text-align: center;
    }

    .report-meta--center {
      text-align: center;
    }

    .report-meta {
      color: ${PRINT_THEME.textMuted};
      font-size: 0.88rem;
      margin: 0 0 16px;
      line-height: 1.55;
    }

    h2, .section-title {
      margin: 20px 0 10px;
      font-size: 0.98rem;
      color: ${PRINT_THEME.primaryDark};
      font-family: 'Sora', Arial, sans-serif;
      border-bottom: 1.5px solid ${PRINT_THEME.primary};
      padding-bottom: 5px;
      page-break-after: avoid;
      font-weight: 700;
    }

    .field-list {
      margin: 0 0 14px;
      padding-left: 8px;
      page-break-inside: avoid;
    }

    .field-row {
      margin: 0 0 6px;
      font-size: 0.9rem;
      line-height: 1.5;
      color: ${PRINT_THEME.ink};
    }

    .field-row strong {
      font-weight: 700;
      color: ${PRINT_THEME.ink};
    }

    .empty-state {
      margin: 4px 0 14px;
      padding-left: 8px;
      font-size: 0.88rem;
      font-style: italic;
      color: ${PRINT_THEME.textMuted};
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0 16px;
      background: ${PRINT_THEME.paper};
      page-break-inside: auto;
    }

    thead { display: table-header-group; }

    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }

    th, td {
      border: 1px solid ${PRINT_THEME.border};
      padding: 8px 10px;
      text-align: left;
      vertical-align: top;
      font-size: 0.88rem;
      line-height: 1.45;
      background: ${PRINT_THEME.paper};
    }

    th {
      background: ${PRINT_THEME.primary};
      color: #fff;
      font-weight: 600;
    }

    tbody tr:nth-child(even) td {
      background: ${PRINT_THEME.rowAlt};
    }

    .staff-report-table {
      table-layout: fixed;
      width: 100%;
      font-size: 0.72rem;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .staff-report-table th,
    .staff-report-table td {
      padding: 5px 6px;
      font-size: 0.72rem;
      line-height: 1.35;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .staff-report-table thead {
      display: table-header-group;
    }

    .staff-report-table tr {
      page-break-inside: auto;
      page-break-after: auto;
    }

    .staff-report-table tbody tr:nth-child(even) td {
      background: ${PRINT_THEME.rowAlt};
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin: 8px 0 16px;
      padding-left: 4px;
    }

    .card {
      border: 1px solid ${PRINT_THEME.border};
      padding: 14px 16px;
      border-left: 4px solid ${PRINT_THEME.primary};
      background: ${PRINT_THEME.paper};
      page-break-inside: avoid;
    }

    .card strong {
      display: block;
      margin-bottom: 4px;
      color: ${PRINT_THEME.primaryDark};
      font-size: 0.84rem;
    }

    .notes {
      margin: 8px 0 16px;
      padding: 12px 14px;
      background: ${PRINT_THEME.paper};
      border: 1px solid ${PRINT_THEME.border};
      border-left: 4px solid ${PRINT_THEME.primary};
      line-height: 1.55;
      page-break-inside: avoid;
    }

    .footer {
      margin-top: 36px;
      padding-top: 14px;
      border-top: 1px solid ${PRINT_THEME.border};
      display: flex;
      justify-content: space-between;
      gap: 24px;
      color: ${PRINT_THEME.textMuted};
      font-size: 0.82rem;
      line-height: 1.5;
      page-break-inside: avoid;
    }

    .signature { min-width: 200px; }

    .doc-footer-note {
      margin-top: 28px;
      padding-top: 10px;
      border-top: 1px solid ${PRINT_THEME.border};
      text-align: center;
      font-size: 0.78rem;
      font-style: italic;
      color: ${PRINT_THEME.textMuted};
      page-break-inside: avoid;
    }

    .rx-status-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin: 0 0 18px;
    }

    .rx-status-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      background: #e6f2ea;
      color: #1e7a46;
      border: 1px solid rgba(30, 122, 70, 0.18);
    }

    .rx-status-badge--draft {
      background: #faf1de;
      color: #8a6508;
      border-color: rgba(184, 134, 11, 0.22);
    }

    .rx-summary-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin: 0 0 18px;
    }

    .rx-summary-item {
      border: 1px solid ${PRINT_THEME.border};
      border-left: 4px solid ${PRINT_THEME.accent};
      border-radius: 10px;
      padding: 12px 14px;
      background: ${PRINT_THEME.paper};
      page-break-inside: avoid;
    }

    .rx-summary-item span {
      display: block;
      font-size: 0.76rem;
      font-weight: 600;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: ${PRINT_THEME.textMuted};
      margin-bottom: 4px;
    }

    .rx-summary-item strong {
      display: block;
      font-size: 0.95rem;
      line-height: 1.45;
      color: ${PRINT_THEME.ink};
      font-weight: 700;
    }

    .rx-medicine-card {
      border: 1px solid ${PRINT_THEME.border};
      border-radius: 12px;
      overflow: hidden;
      margin: 0 0 16px;
      page-break-inside: avoid;
    }

    .rx-medicine-card-header {
      background: ${PRINT_THEME.primary};
      color: #fff;
      padding: 12px 14px;
      font-family: 'Sora', Arial, sans-serif;
      font-size: 1rem;
      font-weight: 700;
    }

    .rx-medicine-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0;
    }

    .rx-medicine-field {
      padding: 12px 14px;
      border-top: 1px solid ${PRINT_THEME.border};
      border-right: 1px solid ${PRINT_THEME.border};
      background: ${PRINT_THEME.paper};
    }

    .rx-medicine-field:nth-child(2n) {
      border-right: none;
    }

    .rx-medicine-field span {
      display: block;
      font-size: 0.76rem;
      font-weight: 600;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: ${PRINT_THEME.textMuted};
      margin-bottom: 4px;
    }

    .rx-medicine-field strong {
      display: block;
      font-size: 0.92rem;
      line-height: 1.45;
      color: ${PRINT_THEME.ink};
    }

    .rx-instructions {
      padding: 14px;
      border-top: 1px solid ${PRINT_THEME.border};
      background: #fafafa;
    }

    .rx-instructions span {
      display: block;
      font-size: 0.76rem;
      font-weight: 600;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: ${PRINT_THEME.textMuted};
      margin-bottom: 6px;
    }

    .rx-instructions p {
      margin: 0;
      line-height: 1.55;
      font-size: 0.9rem;
      color: ${PRINT_THEME.ink};
    }

    @media print {
      .print-watermark {
        position: fixed;
        opacity: 0.08;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `;
}

export function getPrintWatermark() {
  return `
    <div class="print-watermark" aria-hidden="true">
      <img src="${LOGO_URL}" alt="" />
    </div>
  `;
}

export function getPrintHeader(reportTitle = '', dateGenerated = '') {
  return `
    <div class="print-header">
      <img src="${LOGO_URL}" alt="City of Cabuyao Logo" />
      <div class="print-header-text">
        <h1>Cabuyao City Veterinary Office</h1>
        <div class="subtitle">Southville Road, Barangay Marinig, City of Cabuyao, Laguna 4025</div>
      </div>
      ${
        dateGenerated
          ? `<div class="print-date"><strong>Date Generated:</strong><br>${dateGenerated}</div>`
          : ''
      }
    </div>
    ${reportTitle ? `<h2 class="report-title">${reportTitle}</h2>` : ''}
  `;
}

export function getSectionHeader(number, title) {
  return `<h2 class="section-title">${number}. ${title}</h2>`;
}

export function getFieldRow(label, value) {
  return `<div class="field-row"><strong>${label}:</strong> ${value ?? 'N/A'}</div>`;
}

export function getEmptyState(text) {
  return `<p class="empty-state">${text}</p>`;
}

export function getPrintFooter(signatoryLabel = 'Authorized Signatory') {
  return `
    <div class="footer">
      <div class="signature">
        _______________________<br>
        ${signatoryLabel}
      </div>
      <div>
        Generated by<br>
        QR-Enabled Pet Registration,<br>
        Vaccination and Traceability<br>
        Management System
      </div>
    </div>
    <div class="doc-footer-note">
      Document generated on ${new Date().toLocaleString()} · This is a computer-generated document.
    </div>
  `;
}

export function openPrintDocument({ title, bodyHtml }) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Inter:wght@400;600&display=swap"
          rel="stylesheet"
        />
        <style>${getPrintStyles()}</style>
      </head>
      <body>
        ${getPrintWatermark()}
        <div class="print-content">
          ${bodyHtml}
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  return true;
}
