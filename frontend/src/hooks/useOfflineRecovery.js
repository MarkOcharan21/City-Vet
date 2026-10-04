import { useEffect, useState, useRef, useCallback } from 'react';
import api from '../services/api';
import { getOfflineDraft, clearOfflineDraft } from '../utils/offlineDraft';
import { showPersistentToast } from '../components/PersistentToast';
import { getSimulatedOffline } from '../utils/offlineSim';

const HEARTBEAT_MS = 20000;
// When recovering (browser offline or degraded), probe this often so the
// "You're back online!" toast plus any auto-submit happen promptly instead of
// waiting the full heartbeat interval.
const RECOVERY_HEARTBEAT_MS = 3000;
// After a recovery, ignore network-offline signals for this long so already
// in-flight requests that fail after the connection is back do not re-trigger
// the offline state.
const OFFLINE_GRACE_MS = 15000;

// True when the app is served from this machine. Every app request is then
// proxied to localhost:5000, which stays reachable with WiFi off — so a
// backend probe proves nothing about internet access in dev.
const IS_LOCALHOST =
  typeof window !== 'undefined' &&
  /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/i.test(window.location.hostname);

const EXTERNAL_PROBE_URLS = [
  'https://cp.cloudflare.com/generate_204',
  'https://www.gstatic.com/generate_204',
  'https://connectivitycheck.gstatic.com/generate_204',
];

function probeOnce(url, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (controller) controller.abort();
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);

    if (typeof fetch !== 'function' || !controller) {
      finish(false);
      return;
    }

    fetch(`${url}?t=${Date.now()}`, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(() => finish(true))
      .catch(() => finish(false));
  });
}

function probeExternalInternet(timeoutMs = 5000) {
  return EXTERNAL_PROBE_URLS.reduce(
    (chain, url) => chain.then((ok) => (ok ? true : probeOnce(url, timeoutMs))),
    Promise.resolve(false)
  );
}

// Mounted once in OwnerLayout: on every page of the Pet Owner Portal it watches
// connectivity and (a) announces "You're back online!" when the network returns
// and (b) auto-submits any registration that was submitted while offline.
export default function useOfflineRecovery() {
  const [browserOnline, setBrowserOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [degraded, setDegraded] = useState(false);
  const [simulatedOffline, setSimulatedOffline] = useState(getSimulatedOffline);

  const browserOnlineRef = useRef(browserOnline);
  const degradedRef = useRef(false);
  const simulatedOfflineRef = useRef(simulatedOffline);
  const offlineSessionRef = useRef(false);
  const backOnlineShownRef = useRef(false);
  const lastRecoveryAtRef = useRef(0);
  const verifyInFlightRef = useRef(false);
  const submittingRef = useRef(false);

  const isOnline = browserOnline && !degraded && !simulatedOffline;

  // Send whatever was queued via queueOfflineSubmit() while offline. Returns a
  // truthy summary when it succeeds so the caller can skip the generic toast.
  const submitQueuedDraft = useCallback(async () => {
    if (submittingRef.current) return null;
    const draft = await getOfflineDraft();
    if (!draft || !draft.submitOnReconnect) return null;
    submittingRef.current = true;
    try {
      const formData = new FormData();
      const form = draft.form || {};
      Object.entries(form).forEach(([key, val]) => {
        if (val !== '' && val !== null && val !== undefined) {
          if (Array.isArray(val)) formData.append(key, val.join(', '));
          else formData.append(key, String(val));
        }
      });
      if (draft.photo instanceof File) formData.append('photo', draft.photo);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      const res =
        draft.submitType === 'draft' && draft.draftId
          ? await api.post(`/drafts/${draft.draftId}/submit`, formData, config)
          : await api.post('/pets', formData, config);

      await clearOfflineDraft();
      const petName = draft.petName || form.name || 'your pet';
      const petCode = res.data?.petCode;
      showPersistentToast(
        petCode
          ? `You're back online! ${petName} was submitted automatically. Pet code: ${petCode}.`
          : `You're back online! ${petName} was submitted automatically.`,
        { tone: 'online' }
      );
      window.dispatchEvent(new CustomEvent('draft-autosubmitted', { detail: { petName, petCode } }));
      return { petName, petCode };
    } catch (err) {
      // Keep the queued draft so the next reconnect retries it, and tell the
      // owner it still needs finishing.
      showPersistentToast(
        "You're back online! You still have a pending registration — open Draft Registration to complete it.",
        { tone: 'online' }
      );
      return null;
    } finally {
      submittingRef.current = false;
    }
  }, []);

  const markBackOnline = useCallback(() => {
    browserOnlineRef.current = true;
    degradedRef.current = false;
    lastRecoveryAtRef.current = Date.now();
    setBrowserOnline(true);
    setDegraded(false);

    const announcable = offlineSessionRef.current && !backOnlineShownRef.current;
    offlineSessionRef.current = false;
    backOnlineShownRef.current = true;

    submitQueuedDraft().then((auto) => {
      if (auto || !announcable) return;
      getOfflineDraft().then((draft) => {
        showPersistentToast(
          draft
            ? "You're back online! Your saved draft is ready — continue it from Draft Registration."
            : "You're back online!",
          { tone: 'online' }
        );
      });
    });
  }, [submitQueuedDraft]);

  const verifyConnection = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    if (Date.now() - lastRecoveryAtRef.current < OFFLINE_GRACE_MS) return;
    if (verifyInFlightRef.current) return;
    verifyInFlightRef.current = true;

    const backendProbe = api
      .get('/health', { timeout: 6000, _retried: true, params: { t: Date.now() } })
      .then(() => true)
      .catch(() => false);

    const confirmed = IS_LOCALHOST
      ? backendProbe.then((backendOk) => (backendOk ? probeExternalInternet() : false))
      : backendProbe;

    confirmed
      .then((isOnlineNow) => {
        if (isOnlineNow) markBackOnline();
      })
      .catch(() => {})
      .finally(() => {
        verifyInFlightRef.current = false;
      });
  }, [markBackOnline]);

  // Network-error signal: a request failing in the network layer while the
  // browser claims to be online is treated as offline too.
  useEffect(() => {
    const apiOffline = () => {
      if (degradedRef.current) return;
      if (Date.now() - lastRecoveryAtRef.current < OFFLINE_GRACE_MS) return;
      degradedRef.current = true;
      offlineSessionRef.current = true;
      backOnlineShownRef.current = false;
      setDegraded(true);
    };
    const apiOnline = () => {
      if (simulatedOfflineRef.current) return;
      if (offlineSessionRef.current) {
        verifyConnection();
        return;
      }
      if (degradedRef.current) {
        degradedRef.current = false;
        setDegraded(false);
      }
      if (!browserOnlineRef.current) {
        browserOnlineRef.current = true;
        setBrowserOnline(true);
      }
    };
    window.addEventListener('api:network-offline', apiOffline);
    window.addEventListener('api:network-online', apiOnline);
    return () => {
      window.removeEventListener('api:network-offline', apiOffline);
      window.removeEventListener('api:network-online', apiOnline);
    };
  }, [verifyConnection]);

  // Keep the dev offline toggle in sync. Flipping back online triggers the
  // auto-submit here; the toggle's own "You're back online." toast (same ID)
  // gets replaced by the auto-submit result's toast when one is queued.
  useEffect(() => {
    const onSim = (e) => {
      const val = !!e.detail?.offline;
      simulatedOfflineRef.current = val;
      setSimulatedOffline(val);
      if (val) {
        offlineSessionRef.current = true;
        backOnlineShownRef.current = false;
      } else {
        offlineSessionRef.current = false;
        markBackOnline();
      }
    };
    window.addEventListener('sim:offline-change', onSim);
    return () => window.removeEventListener('sim:offline-change', onSim);
  }, [markBackOnline]);

  // Heartbeat: while offline/recovering probe faster so the recovery
  // notification + auto-submit are timely.
  useEffect(() => {
    if (simulatedOffline) return;
    const interval = !browserOnline || degraded ? RECOVERY_HEARTBEAT_MS : HEARTBEAT_MS;
    const ping = () =>
      api.get('/health', { timeout: 6000, _retried: true, params: { t: Date.now() } }).catch(() => {});
    ping();
    const id = setInterval(ping, interval);
    return () => clearInterval(id);
  }, [simulatedOffline, browserOnline, degraded]);

  useEffect(() => {
    const goOnline = () => verifyConnection();
    const goOffline = () => {
      setBrowserOnline(false);
      browserOnlineRef.current = false;
      offlineSessionRef.current = true;
      backOnlineShownRef.current = false;
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [verifyConnection]);

  return { isOnline };
}