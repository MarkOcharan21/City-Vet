const cloudinary = require("cloudinary").v2;
const fs = require("fs");

const configured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (configured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

function isAbsoluteUrl(p) {
  return typeof p === "string" && /^https?:\/\//i.test(p);
}

// Upload a local file (written by multer diskStorage) to Cloudinary.
// Returns a public URL when Cloudinary is configured, otherwise keeps the
// original local path (so local development keeps working unchanged).
async function uploadLocalFile(filePath, folder) {
  if (!configured || !filePath || isAbsoluteUrl(filePath) || !fs.existsSync(filePath)) {
    return filePath;
  }
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder || "pet-vet",
      resource_type: "image",
      use_filename: true,
      unique_filename: true,
    });
    try {
      fs.unlinkSync(filePath);
    } catch (_) {}
    return result.secure_url;
  } catch (err) {
    console.warn("[cloudinary] upload failed, keeping local path:", err.message);
    return filePath;
  }
}

// Upload an in-memory Buffer directly (e.g. generated QR PNGs).
// Returns a public URL, or null when Cloudinary is not configured.
function uploadBuffer(buffer, { folder, publicId } = {}) {
  if (!configured || !buffer) return null;
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folder || "pet-vet",
        public_id: publicId,
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

// Convert an asset path/URL into an absolute URL the browser can load.
// Local "/uploads/..." is resolved against BACKEND_URL; cloud URLs pass through.
function toPublicUrl(asset, backendOrigin) {
  if (!asset) return null;
  if (isAbsoluteUrl(asset)) return asset;
  const origin = (backendOrigin || process.env.BACKEND_URL || "").replace(/\/$/, "");
  return origin ? `${origin}${asset}` : asset;
}

module.exports = {
  cloudinaryConfigured: configured,
  isAbsoluteUrl,
  uploadLocalFile,
  uploadBuffer,
  toPublicUrl,
};
