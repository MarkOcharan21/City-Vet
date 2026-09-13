import { useEffect, useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { saveOfflineDraft, getOfflineDraft } from '../utils/offlineDraft';
import { getSimulatedOffline, setSimulatedOffline as broadcastSimulatedOffline } from '../utils/offlineSim';

const SAVE_DEBOUNCE_MS = 600;
const HEARTBEAT_MS = 20000;

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

  isEditingRef.current = isEditingDraft;
  formRef.current = form;
  photoRef.current = photo;

  const isOnline = browserOnline && !degraded && !simulatedOffline;

  // Dev-only helper: persist + broadcast a manual "go offline" toggle so the
  // offline-draft flow can be demoed even when the network is actually fine.
  const simulateOffline = useCallback((offline) => {
    setSimulatedOffline(offline);
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

  // Network-error signal: a request that fails in the network layer while the
  // browser still claims to be online (server/database down, timeout) is
  // treated as offline too, so the draft safety net always applies.
  useEffect(() => {
    const apiOffline = () => setDegraded(true);
    const apiOnline = () => setDegraded(false);
    window.addEventListener('api:network-offline', apiOffline);
    window.addEventListener('api:network-online', apiOnline);
    return () => {
      window.removeEventListener('api:network-offline', apiOffline);
      window.removeEventListener('api:network-online', apiOnline);
    };
  }, []);

  // Keep simulated-offline state in sync across components.
  useEffect(() => {
    const onSim = (e) => setSimulatedOffline(!!e.detail?.offline);
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
  useEffect(() => {
    if (simulatedOffline) return;
    const ping = () => api.get('/health').catch(() => {});
    ping();
    const id = setInterval(ping, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [simulatedOffline]);

  useEffect(() => {
    const goOnline = () => {
      setBrowserOnline(true);
      flushPendingSave()
        .then(() => checkPending())
        .then((has) => {
          if (has) {
            toast('You are back online. Your saved draft is ready — continue it from Draft Registration.');
          }
        });
    };
    const goOffline = () => setBrowserOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    checkPending();
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [checkPending, flushPendingSave]);

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
        toast('You are offline. Your changes are saved as a draft and will appear in Draft Registration.');
      });
    }, SAVE_DEBOUNCE_MS);
  }, [form, photo, isOnline, persistPending, simulatedOffline]);

  return { isOnline, hasPendingDraft, saveNow, simulatedOffline, simulateOffline };
}