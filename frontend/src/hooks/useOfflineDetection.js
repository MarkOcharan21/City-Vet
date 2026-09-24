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
      if (degradedRef.current) {
        degradedRef.current = false;
        setDegraded(false);
      }
      if (simulatedOfflineRef.current) return;
      // A successful response proves connectivity. Recover the browser flag
      // too — the browser's own "online" event can lag or never fire, so a
      // recovered probe is what triggers the prompt "You're back online!".
      if (!browserOnlineRef.current) {
        browserOnlineRef.current = true;
        setBrowserOnline(true);
      }
      markBackOnline();
    };
    window.addEventListener('api:network-offline', apiOffline);
    window.addEventListener('api:network-online', apiOnline);
    return () => {
      window.removeEventListener('api:network-offline', apiOffline);
      window.removeEventListener('api:network-online', apiOnline);
    };
  }, [markBackOnline]);

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
    const ping = () => api.get('/health').catch(() => {});
    ping();
    const id = setInterval(ping, interval);
    return () => clearInterval(id);
  }, [simulatedOffline, browserOnline, degraded]);

  useEffect(() => {
    const goOnline = () => {
      setBrowserOnline(true);
      browserOnlineRef.current = true;
      backOnlineToastShownRef.current = false;
      markBackOnline();
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
  }, [checkPending, markBackOnline]);

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