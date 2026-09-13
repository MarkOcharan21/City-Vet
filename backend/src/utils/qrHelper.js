const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");
const { uploadBuffer, cloudinaryConfigured } = require("./cloudUpload");

const QR_DIR = path.join(__dirname, "../../uploads/qrcodes");
if (!fs.existsSync(QR_DIR)) {
  fs.mkdirSync(QR_DIR, { recursive: true });
}

async function generatePaymentQR(paymentId) {
  // Generate the PNG in memory first so we can push it to Cloudinary when configured.
  const pngBuffer = await QRCode.toBuffer(String(paymentId), {
    width: 300,
    margin: 2,
    color: { dark: "#1a1a2e", light: "#ffffff" },
  });

  if (cloudinaryConfigured) {
    try {
      const url = await uploadBuffer(pngBuffer, {
        folder: "pet-vet/payments",
        publicId: `qr-${paymentId}`,
      });
      if (url) return url;
    } catch (err) {
      console.warn(`Cloudinary QR upload failed for ${paymentId}:`, err.message);
    }
  }

  // Fallback: write to local disk (local development without Cloudinary).
  const filename = `qr-${paymentId}.png`;
  const filepath = path.join(QR_DIR, filename);
  await QRCode.toFile(filepath, String(paymentId), {
    width: 300,
    margin: 2,
    color: { dark: "#1a1a2e", light: "#ffffff" },
  });
  return `/uploads/qrcodes/${filename}`;
}

function deletePaymentQR(paymentId) {
  const filepath = path.join(QR_DIR, `qr-${paymentId}.png`);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }
}

module.exports = { generatePaymentQR, deletePaymentQR };
