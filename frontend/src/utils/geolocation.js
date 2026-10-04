// Shared browser GPS helper for owner registration and profile forms.
// Resolves to { lat, lng, accuracy } or null when GPS is unsupported, denied,
// or times out — the caller then just keeps the address-based fallback.

export const CABUYAO_BOUNDS = {
  minLat: 14.1500,
  maxLat: 14.3300,
  minLon: 121.0000,
  maxLon: 121.2200,
};

export function isInCabuyao(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= CABUYAO_BOUNDS.minLat && lat <= CABUYAO_BOUNDS.maxLat &&
    lng >= CABUYAO_BOUNDS.minLon && lng <= CABUYAO_BOUNDS.maxLon
  );
}

export function requestCurrentPosition() {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        if (!isInCabuyao(latitude, longitude)) {
          resolve(null);
          return;
        }
        resolve({ lat: latitude, lng: longitude, accuracy });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}