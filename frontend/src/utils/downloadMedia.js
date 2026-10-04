export async function downloadMediaUrl(url, filename) {
  if (!url) return false;
  try {
    const res = await fetch(url, { mode: "cors", cache: "force-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename || "download";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    return true;
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
    return false;
  }
}

export function qrDownloadFilename(petCode, petName) {
  const base = String(petCode || petName || "qr-code").replace(/[^\w.-]+/g, "_");
  return `QR_${base}.png`;
}