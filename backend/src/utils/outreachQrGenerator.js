const QRCode = require("qrcode");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// QR codes for outreach payment transactions. Each QR encodes a backend URL
// (/oqr/<token>) that redirects to the public confirmation form on the
// frontend. Kept separate from the pet QR system so the existing flow is
// unaffected.

function getOutreachQrOutputPath(qrToken) {
  const fileName = `qr_${qrToken}.png`;
  const outputDir = path.join(__dirname, "..", "..", "uploads", "outreach-qrs");
  return {
    fileName,
    outputDir,
    filePath: path.join(outputDir, fileName),
    imagePath: `/uploads/outreach-qrs/${fileName}`,
  };
}

function buildOutreachQrUrl(qrToken) {
  const backendOrigin = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
  return `${backendOrigin.replace(/\/$/, "")}/oqr/${encodeURIComponent(qrToken)}`;
}

function generateQrToken() {
  return `ORC-${crypto.randomBytes(9).toString("hex").toUpperCase()}`;
}

// Writes a QR PNG for the given token to the outreach-qrs folder.
// Returns { qrToken, imagePath, qrUrl }.
async function generateOutreachQr(qrToken) {
  const { filePath, imagePath } = getOutreachQrOutputPath(qrToken);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  await QRCode.toFile(filePath, buildOutreachQrUrl(qrToken), { width: 300 });
  return { qrToken, imagePath, qrUrl: buildOutreachQrUrl(qrToken) };
}

module.exports = { generateOutreachQr, generateQrToken, buildOutreachQrUrl };