const QRCode = require('qrcode');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { uploadBuffer, cloudinaryConfigured } = require('./cloudUpload');

function getQrOutputPath(petCode) {
  const fileName = `qr_${petCode}.png`;
  const outputDir = path.join(__dirname, '..', '..', 'uploads', 'qrcodes');
  return {
    fileName,
    outputDir,
    filePath: path.join(outputDir, fileName),
    imagePath: `/uploads/qrcodes/${fileName}`,
  };
}

function buildQrUrl(qrToken) {
  const backendOrigin = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
  return `${backendOrigin.replace(/\/$/, '')}/qr/${encodeURIComponent(qrToken)}`;
}

async function persistQrImage(qrToken, petCode) {
  const { filePath, imagePath, fileName } = getQrOutputPath(petCode);

  if (cloudinaryConfigured) {
    const qrBuffer = await QRCode.toBuffer(buildQrUrl(qrToken), { width: 300 });
    try {
      const url = await uploadBuffer(qrBuffer, {
        folder: 'pet-vet/qrcodes',
        publicId: fileName.replace(/\.png$/, ''),
      });
      if (url) return url;
    } catch (err) {
      console.warn('[qrGenerator] Cloudinary upload failed, falling back to local file:', err.message);
    }
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  await QRCode.toFile(filePath, buildQrUrl(qrToken), { width: 300 });
  return imagePath;
}

// Generates a unique QR token + saves a QR image file for a given pet.
// Returns { qrToken, imagePath } to be stored in the qr_codes table.
async function generateQrForPet(petId, petCode) {
  const qrToken = `${petCode}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const imagePath = await persistQrImage(qrToken, petCode);

  return {
    qrToken,
    imagePath,
  };
}

// Rebuilds the PNG for an existing token (e.g. after FRONTEND_URL / IP change).
async function regenerateQrImage(qrToken, petCode) {
  const imagePath = await persistQrImage(qrToken, petCode);
  return { qrToken, imagePath, qrUrl: buildQrUrl(qrToken) };
}

module.exports = { generateQrForPet, regenerateQrImage, buildQrUrl };
