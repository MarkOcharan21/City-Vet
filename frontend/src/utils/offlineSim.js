// Dev-only "Simulate Offline" helper. Persists the choice in sessionStorage
// and broadcasts it so every useOfflineDetection() instance stays in sync.
export const SIM_OFFLINE_EVENT = 'sim:offline-change';

export function getSimulatedOffline() {
  if (typeof sessionStorage === 'undefined') return false;
  try { return sessionStorage.getItem('simOffline') === '1'; } catch { return false; }
}

export function setSimulatedOffline(offline) {
  try { sessionStorage.setItem('simOffline', offline ? '1' : '0'); } catch {}
  window.dispatchEvent(new CustomEvent(SIM_OFFLINE_EVENT, { detail: { offline } }));
}