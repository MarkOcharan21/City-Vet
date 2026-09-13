export function createQrDetector() {
  if (typeof window === 'undefined') return null;
  if (typeof globalThis.BarcodeDetector === 'undefined') return null;
  try {
    return new BarcodeDetector({ formats: ['qr_code'] });
  } catch (err) {
    return null;
  }
}

export function hasQrDetector() {
  return !!createQrDetector();
}

export async function decodeWithDetector(input, detector) {
  if (!detector) return null;
  try {
    const codes = await detector.detect(input);
    const raw = (codes || []).map((c) => String(c.rawValue || '').trim()).find(Boolean);
    return raw || null;
  } catch (err) {
    return null;
  }
}