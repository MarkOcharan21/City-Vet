const fs = require('fs');
const path = require('path');
const { GState } = require('jspdf');

const THEME = {
  primary: [200, 16, 46],
  primaryDark: [122, 12, 30],
  primaryTint: [251, 233, 236],
  accent: [198, 161, 91],
  ink: [36, 20, 22],
  muted: [107, 96, 98],
  border: [232, 226, 224],
};

function getLogoAsset() {
  const candidates = [
    path.join(__dirname, '../../assets/logo.png.jpg'),
    path.join(__dirname, '../../../frontend/public/assets/logo.png.jpg'),
    path.join(__dirname, '../../../frontend/dist/assets/logo.png.jpg'),
  ];

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;

    const buffer = fs.readFileSync(filePath);
    const format = filePath.toLowerCase().endsWith('.png') ? 'PNG' : 'JPEG';
    const mime = format === 'PNG' ? 'image/png' : 'image/jpeg';
    return {
      data: `data:${mime};base64,${buffer.toString('base64')}`,
      format,
    };
  }

  return null;
}

function applyPageBackground(doc, logoAsset) {
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, 'F');

  if (!logoAsset) return;

  try {
    const size = 110;
    const x = (210 - size) / 2;
    const y = (297 - size) / 2;
    doc.setGState(new GState({ opacity: 0.08 }));
    doc.addImage(logoAsset.data, logoAsset.format, x, y, size, size, undefined, 'FAST');
    doc.setGState(new GState({ opacity: 1 }));
  } catch (error) {
    // Ignore missing logo rendering errors.
  }
}

function ensurePageSpace(doc, y, logoAsset, threshold = 240) {
  if (y <= threshold) return y;

  doc.addPage();
  applyPageBackground(doc, logoAsset);
  return 24;
}

function drawBrandedHeader(doc, logoAsset, reportTitle) {
  applyPageBackground(doc, logoAsset);

  let y = 18;

  if (logoAsset) {
    try {
      doc.addImage(logoAsset.data, logoAsset.format, 14, y, 22, 22, undefined, 'FAST');
    } catch (error) {
      // Ignore missing logo rendering errors.
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...THEME.primary);
  doc.text('City Veterinary Animal Clinic', logoAsset ? 40 : 14, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...THEME.muted);
  doc.text('Cabuyao City, Laguna · City Government of Cabuyao', logoAsset ? 40 : 14, y + 14);

  y += 24;
  doc.setDrawColor(...THEME.accent);
  doc.setLineWidth(0.8);
  doc.line(14, y, 196, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...THEME.primaryDark);
  doc.text(reportTitle, 14, y);

  doc.setDrawColor(...THEME.primary);
  doc.setLineWidth(0.5);
  doc.line(14, y + 2, 196, y + 2);

  return y + 10;
}

function drawMetaBlock(doc, lines, y) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...THEME.muted);

  lines.forEach((line) => {
    doc.text(line, 14, y);
    y += 5;
  });

  return y + 4;
}

function drawSectionHeader(doc, text, y, logoAsset) {
  y = ensurePageSpace(doc, y, logoAsset);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...THEME.primaryDark);
  doc.text(text, 14, y);
  doc.setDrawColor(...THEME.primary);
  doc.setLineWidth(0.5);
  doc.line(14, y + 1.5, 196, y + 1.5);
  return y + 9;
}

function drawField(doc, label, value, y, logoAsset) {
  y = ensurePageSpace(doc, y, logoAsset, 275);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...THEME.ink);
  const labelText = `${label}:`;
  doc.text(labelText, 20, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(String(value || 'N/A'), 20 + doc.getTextWidth(labelText) + 2, y);
  return y + 7;
}

function drawNotesBox(doc, title, text, y, logoAsset) {
  if (!text) return y;

  y = ensurePageSpace(doc, y, logoAsset, 255);
  const lines = doc.splitTextToSize(String(text), 170);
  const boxHeight = 10 + lines.length * 5;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...THEME.border);
  doc.setLineWidth(0.3);
  doc.rect(14, y - 4, 182, boxHeight, 'S');

  doc.setFillColor(...THEME.primary);
  doc.rect(14, y - 4, 2, boxHeight, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...THEME.primaryDark);
  doc.text(title, 18, y + 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...THEME.ink);
  doc.text(lines, 18, y + 8);

  return y + boxHeight + 6;
}

function drawEmptyState(doc, text, y, logoAsset) {
  y = ensurePageSpace(doc, y, logoAsset, 275);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...THEME.muted);
  doc.text(text, 20, y);
  return y + 10;
}

function drawTableRow(doc, x, y, cells, columnWidths, headerStyle) {
  let currentX = x;
  cells.forEach((cell, index) => {
    if (headerStyle) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.setFillColor(...THEME.primary);
      doc.rect(currentX, y, columnWidths[index], 8, 'F');
      doc.text(String(cell), currentX + 1.5, y + 5.5);
    } else {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.setFillColor(255, 255, 255);
      doc.rect(currentX, y, columnWidths[index], 8, 'F');
      doc.text(String(cell), currentX + 1.5, y + 5.5);
    }
    currentX += columnWidths[index];
  });
}

function drawFooter(doc, y, logoAsset) {
  y = ensurePageSpace(doc, y, logoAsset, 265);

  doc.setDrawColor(...THEME.accent);
  doc.setLineWidth(0.4);
  doc.line(14, y, 196, y);
  y += 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...THEME.muted);
  doc.text(`Document generated by Pet Vet System on ${new Date().toLocaleString()}`, 105, y, {
    align: 'center',
  });
  y += 4;
  doc.text('This is a computer-generated document.', 105, y, { align: 'center' });
}

function drawSignatureArea(doc, y, logoAsset) {
  y = ensurePageSpace(doc, y, logoAsset, 245);
  y += 4;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...THEME.primaryDark);
  doc.text('CERTIFICATION', 14, y);
  doc.setDrawColor(...THEME.primary);
  doc.setLineWidth(0.5);
  doc.line(14, y + 1.5, 196, y + 1.5);
  y += 9;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...THEME.ink);
  const statement =
    'This document is issued by the City Veterinary Animal Clinic and certifies that the information contained herein is true and correct based on official records on file.';
  const lines = doc.splitTextToSize(statement, 170);
  doc.text(lines, 16, y);
  y += lines.length * 5 + 12;

  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Prepared by: ____________________________', 16, y);
  doc.text('Date: ____________________', 150, y);
  y += 18;
  doc.text('Reviewed / Approved by: ____________________________', 16, y);
  doc.text('Date: ____________________', 150, y);
  return y + 12;
}

module.exports = {
  THEME,
  getLogoAsset,
  applyPageBackground,
  ensurePageSpace,
  drawBrandedHeader,
  drawMetaBlock,
  drawSectionHeader,
  drawField,
  drawNotesBox,
  drawEmptyState,
  drawTableRow,
  drawFooter,
  drawSignatureArea,
};
