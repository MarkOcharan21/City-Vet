import { useEffect, useState, useRef, useCallback } from 'react';
import api from '../services/api';
import { saveOfflineDraft, getOfflineDraft } from '../utils/offlineDraft';
import { showPersistentToast } from '../components/PersistentToast';
import { getSimulatedOffline, setSimulatedOffline as broadcastSimulatedOffline } from '../utils/offlineSim';

const SAVE_DEBOUNCE_MS = 600;
const HEARTBEAT_MS = 20000;
// When recovering (browser offline or degraded), probe this often so the
// "You're back online!" toast appears promptly instead of waiting 20s.
const RECOVERY_HEARTBEAT_MS = 3000;
// After a recovery, ignore network-offline signals for this long. Requests that
// were already in flight while the connection was down can keep failing up to
// axios's timeout (15s) AFTER the connection is actually back — without this
// window they would flip `degraded` true again right after the banner cleared,
// making the offline notice reappear (and linger) long after going online.
const OFFLINE_GRACE_MS = 15000;

// True when the app is served from this machine. Every app request is then
// proxied to localhost:5000, which stays reachable with WiFi off — so a
// backend probe proves nothing about internet access in dev.
const IS_LOCALHOST =
  typeof window !== 'undefined' &&
  /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/i.test(window.location.hostname);

// Lightweight external endpoints used only as a dev-mode connectivity check.
// `no-cors` keeps the response opaque (we only care that the request
// completed), and `no-store` plus the cache buster stop a cached response from
// faking success. Several candidates are tried because a single host being
// blocked by a local network would otherwise pin the app in a false offline
// state. Cloudflare is included on purpose: the whole public deployment rides
// on a Cloudflare tunnel, so if that is reachable the backend is too.
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
      // No way to prove internet access here — do not announce a recovery we
      // cannot verify.
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

export default function useOfflineDetection({ isEditingDraft, form, photo }) {
  const [browserOnline, setBrowserOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [degraded, setDegraded] = useState(false);
  const [hasPendingDraft, setHasPendingDraft] = useState(false);
  const [simulatedOffline, setSimulatedOffline] = useState(getSimulatedOffline);

  const isEditingRef = useRef(isEditingDraft);
  const debounceTimer = useRef(null);
  const pendingRef = useRef(null);
  const formRef = useRef(form);
  const photoRef = useRef(photo);
  const offlineToastShownRef = useRef(false);
  const browserOnlineRef = useRef(browserOnline);
  const degradedRef = useRef(false);
  const simulatedOfflineRef = useRef(simulatedOffline);
  const backOnlineToastShownRef = useRef(false);
  // Last time connectivity was seen as recovered; used to gate stale failures.
  const lastRecoveryAtRef = useRef(0);
  // Tracks whether this mount has actually lost connectivity at some point —
  // prevents a spurious "You're back online!" right after page load.
  const offlineSessionRef = useRef(false);
  // Guards against overlapping connectivity-verification probes.
  const verifyInFlightRef = useRef(false);

  isEditingRef.current = isEditingDraft;
  formRef.current = form;
  photoRef.current = photo;

  const isOnline = browserOnline && !degraded && !simulatedOffline;

  // Dev-only helper: persist + broadcast a manual "go offline" toggle so the
  // offline-draft flow can be demoed even when the network is actually fine.
  const simulateOffline = useCallback((offline) => {
    simulatedOfflineRef.current = offline;
    setSimulatedOffline(offline);
    if (offline) {
      offlineSessionRef.current = true;
      backOnlineToastShownRef.current = false;
    }
    broadcastSimulatedOffline(offline);
  }, []);

  const checkPending = useCallback(async () => {
    const draft = await getOfflineDraft();
    setHasPendingDraft(!!draft);
    return !!draft;
  }, []);

  const persistPending = useCallback((formToSave, photoToSave) => {
    return getOfflineDraft()
      .then((existing) => {
        const merged = existing
          ? { ...existing, form: formToSave, photo: photoToSave ?? existing.photo ?? null }
          : { form: formToSave, photo: photoToSave ?? null };
        return saveOfflineDraft(merged);
      })
      .then(() => {
        setHasPendingDraft(true);
      });
  }, []);

  // Force-save whatever is currently on the form (used when Submit is tapped
  // while offline so no registration data is ever lost).
  const saveNow = useCallback((formToSave, photoToSave) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    pendingRef.current = null;
    return persistPending(formToSave ?? formRef.current, photoToSave ?? photoRef.current);
  }, [persistPending]);

  const flushPendingSave = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending) {
      return persistPending(pending.form, pending.photo);
    }
    return Promise.resolve();
  }, [persistPending]);

  // Announce a single "You're back online!" when connectivity is restored —
  // whether via the browser's own online event or via a recovered heartbeat /
  // successful API response. A pending draft gets its own follow-up hint so it
  // is never lost.
  const markBackOnline = useCallback(() => {
    // Force the offline banner off immediately, independent of the toast
    // bookkeeping below. Recovery signals (browser online event / successful
    // request) are the source of truth — the offline notice must clear in the
    // same moment, never seconds later.
    browserOnlineRef.current = true;
    degradedRef.current = false;
    lastRecoveryAtRef.current = Date.now();
    setBrowserOnline(true);
    setDegraded(false);

    // Never been offline in this session (or already announced recovery) —
    // skip so a plain page load or every successful request is not spammed.
    if (!offlineSessionRef.current) return;
    if (backOnlineToastShownRef.current) return;
    backOnlineToastShownRef.current = true;
    offlineSessionRef.current = false;
    flushPendingSave()
      .then(() => checkPending())
      .then((has) => {
        showPersistentToast(
          has
            ? "You're back online! Your saved draft is ready — continue it from Draft Registration."
            : "You're back online!",
          { tone: 'online' }
        );
      });
  }, [checkPending, flushPendingSave]);

  // The browser's "online" event only means a network interface came up — on
  // Windows/mobile it also fires when the device merely falls back to another
  // interface (Ethernet, cellular) that has no working internet. Confirm with a
  // real request that crosses the network boundary before announcing that the
  // connection is back.
  const verifyConnection = useCallback(() => {
    // Hard gate: while the browser reports no network path there is nothing to
    // verify, and a probe against a same-machine backend (dev) would succeed
    // anyway and wrongly announce a recovery.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    if (Date.now() - lastRecoveryAtRef.current < OFFLINE_GRACE_MS) return;
    // The recovery heartbeat fires every 3s while offline; without this guard
    // several probes would overlap and the first success would announce
    // recovery before the slower ones settle.
    if (verifyInFlightRef.current) return;
    verifyInFlightRef.current = true;

    // `_retried` skips the interceptor's retry chain so recovery is announced
    // as soon as the probe succeeds; `t` defeats the HTTP cache.
    const backendProbe = api
      .get('/health', { timeout: 6000, _retried: true, params: { t: Date.now() } })
      .then(() => true)
      .catch(() => false);

    // In production the API sits behind the public tunnel, so a successful
    // backend call already crossed the internet and is proof enough. On
    // localhost the very same call is proxied to this machine and stays green
    // with WiFi off, so demand an external request as well.
    const confirmed = IS_LOCALHOST
      ? backendProbe.then((backendOk) => (backendOk ? probeExternalInternet() : false))
      : backendProbe;

    confirmed
      .then((isOnlineNow) => {
        if (isOnlineNow) markBackOnline();
        // Otherwise stay quiet and keep the offline notice up; the recovery
        // heartbeat will try again shortly.
      })
      .catch(() => {})
      .finally(() => {
        verifyInFlightRef.current = false;
      });
  }, [markBackOnline]);

  // Network-error signal: a request that fails in the network layer while the
  // browser still claims to be online (server/database down, timeout) is
  // treated as offline too, so the draft safety net always applies.
  useEffect(() => {
    const apiOffline = () => {
      if (degradedRef.current) return;
      // Stale in-flight requests that started before the connection came back
      // may still error for up to their timeout — do not let those re-trigger
      // the offline banner right after we just announced recovery.
      if (Date.now() - lastRecoveryAtRef.current < OFFLINE_GRACE_MS) return;
      degradedRef.current = true;
      offlineSessionRef.current = true;
      backOnlineToastShownRef.current = false;
      setDegraded(true);
    };
    const apiOnline = () => {
      if (simulatedOfflineRef.current) return;
      // A successful response proves connectivity — but only if it actually
      // travelled over a live network. When WiFi drops, requests that were
      // already in flight can still resolve from the browser's buffer, and a
      // browser that fell back to another interface reports "online". Either
      // way that is not a real recovery, so confirm with a fresh, uncached
      // probe instead of announcing from the stale success alone. `degraded` is
      // cleared only inside markBackOnline so the offline notice stays visible
      // if the probe fails.
      if (offlineSessionRef.current) {
        verifyConnection();
        return;
      }
      // Normal state (never lost connectivity this session): just keep the
      // flags in sync so the offline notice cannot stick.
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

  // Keep simulated-offline state in sync across components.
  useEffect(() => {
    const onSim = (e) => {
      const val = !!e.detail?.offline;
      simulatedOfflineRef.current = val;
      setSimulatedOffline(val);
      if (val) {
        offlineSessionRef.current = true;
        backOnlineToastShownRef.current = false;
      } else {
        // The dev toggle shows its own recovery toast — do not double-notify.
        offlineSessionRef.current = false;
      }
    };
    window.addEventListener('sim:offline-change', onSim);
    return () => window.removeEventListener('sim:offline-change', onSim);
  }, []);

  // Allow the offline notification again after reconnecting.
  useEffect(() => {
    if (isOnline) offlineToastShownRef.current = false;
  }, [isOnline]);

  // Heartbeat: periodically probe the API so genuine connectivity loss
  // (server/DB down, or a network that the browser did not report as offline)
  // still flips the degraded flag within a few seconds — no submit needed.
  // While offline/recovering the probe runs much faster so the "You're back
  // online!" notification arrives within a moment of real reconnection.
  useEffect(() => {
    if (simulatedOffline) return;
    const interval = !browserOnline || degraded ? RECOVERY_HEARTBEAT_MS : HEARTBEAT_MS;
    // `_retried` skips the retry chain (a probe must fail fast to be
    // meaningful) and `t` defeats the HTTP cache — without it a cached 200
    // from before the outage would look like a live connection.
    const ping = () =>
      api.get('/health', { timeout: 6000, _retried: true, params: { t: Date.now() } }).catch(() => {});
    ping();
    const id = setInterval(ping, interval);
    return () => clearInterval(id);
  }, [simulatedOffline, browserOnline, degraded]);

  useEffect(() => {
    const goOnline = () => {
      // The event is not proof of connectivity (interface fallback fires it
      // too), and a cached response must not count as a live one — so probe
      // the server for real before clearing the offline notice or toasting.
      verifyConnection();
    };
    const goOffline = () => {
      setBrowserOnline(false);
      browserOnlineRef.current = false;
      offlineSessionRef.current = true;
      backOnlineToastShownRef.current = false;
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    checkPending();
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [checkPending, verifyConnection]);

  // While offline, keep the form persisted locally (debounced) so the draft is
  // restored even if the owner closes the tab.
  useEffect(() => {
    if (isOnline) return;
    if (isEditingRef.current) return;
    const hasAnyValue = Object.values(form || {}).some((v) => v !== '' && v !== null && v !== undefined);
    if (!hasAnyValue) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const payload = { form, photo: photo ?? null };
    pendingRef.current = payload;
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;
      pendingRef.current = null;
      persistPending(payload.form, payload.photo).then(() => {
        // Only announce real connectivity loss once per offline session. The
        // simulated toggle fires its own toast, so it is not repeated here.
        if (simulatedOffline) return;
        if (offlineToastShownRef.current) return;
        offlineToastShownRef.current = true;
        showPersistentToast('You are offline. Your changes are saved as a draft and will appear in Draft Registration.', { tone: 'offline' });
      });
    }, SAVE_DEBOUNCE_MS);
  }, [form, photo, isOnline, persistPending, simulatedOffline]);

  return { isOnline, hasPendingDraft, saveNow, simulatedOffline, simulateOffline };
}