const QRCode = require('qrcode');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { uploadBuffer, cloudinaryConfigured } = require('./cloudUpload');

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
  const localPath = `/uploads/payment-receipts/${fileName}`;

  if (cloudinaryConfigured) {
    const qrBuffer = await QRCode.toBuffer(buildReceiptQrUrl(pmToken), { width: 300, margin: 2 });
    try {
      const url = await uploadBuffer(qrBuffer, {
        folder: 'pet-vet/qrcodes',
        publicId: fileName.replace(/\.png$/, ''),
      });
      if (url) return url;
    } catch (err) {
      console.warn('[qrReceipt] Cloudinary upload failed, falling back to local file:', err.message);
    }
  }

  fs.mkdirSync(outputDir, { recursive: true });
  await QRCode.toFile(filePath, buildReceiptQrUrl(pmToken), { width: 300, margin: 2 });
  return localPath;
}

module.exports = { generatePmToken, buildReceiptQrUrl, writeReceiptQrImage };