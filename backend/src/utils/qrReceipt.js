const QRCode = require('qrcode');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function generatePmToken() {
  return `PM-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

function buildReceiptQrUrl(pmToken) {
  const backendOrigin = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
  return `${backendOrigin.replace(/\/$/, '')}/pm-receipt/${encodeURIComponent(pmToken)}`;
}

async function writeReceiptQrImage(pmToken) {
  const outputDir = path.join(__dirname, '..', '..', 'uploads', 'payment-receipts');
  const fileName = `qr_${pmToken}.png`;
  const filePath = path.join(outputDir, fileName);
  fs.mkdirSync(outputDir, { recursive: true });
  await QRCode.toFile(filePath, buildReceiptQrUrl(pmToken), { width: 300, margin: 2 });
  return `/uploads/payment-receipts/${fileName}`;
}

module.exports = { generatePmToken, buildReceiptQrUrl, writeReceiptQrImage };