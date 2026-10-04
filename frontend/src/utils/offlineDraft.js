const DB_NAME = 'pet-offline-drafts';
const STORE = 'drafts';
const LOOKUPS_STORE = 'lookups';
const NOTIFICATIONS_STORE = 'notifications';
const DB_VERSION = 4;

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(LOOKUPS_STORE)) {
        db.createObjectStore(LOOKUPS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(NOTIFICATIONS_STORE)) {
        db.createObjectStore(NOTIFICATIONS_STORE, { keyPath: 'id', autoIncrement: true });
      } else if (db.objectStoreNames.contains(NOTIFICATIONS_STORE)) {
        const store = request.transaction.objectStore(NOTIFICATIONS_STORE);
        if (!store.indexNames.contains('byUser')) {
          store.createIndex('byUser', 'userId', { unique: false });
        }
        const purge = store.openCursor();
        purge.onsuccess = (e) => {
          const cursor = e.target.result;
          if (!cursor) return;
          if (cursor.value && cursor.value.userId == null) cursor.delete();
          cursor.continue();
        };
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineDraft(data) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ id: 'current', ...data, updatedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getOfflineDraft() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get('current');
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function clearOfflineDraft() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete('current');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- Auto-submit queue ----------
// A submitted-while-offline registration is kept in the same single-draft slot
// but flagged `submitOnReconnect` so the app knows to send it automatically the
// moment connectivity returns. `submitType` distinguishes a brand-new
// registration ('create' -> POST /pets) from a queued server draft
// ('draft' -> POST /drafts/:id/submit).
export async function queueOfflineSubmit({
  form,
  photo = null,
  submitType = 'create',
  draftId = null,
  petName = null,
}) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.get('current');
    req.onsuccess = () => {
      const existing = req.result || {};
      store.put({
        ...existing,
        id: 'current',
        form: form ?? existing.form ?? {},
        photo: photo ?? existing.photo ?? null,
        petName: petName ?? form?.name ?? existing.form?.name ?? null,
        submitOnReconnect: true,
        submitType,
        draftId: draftId ?? existing.draftId ?? null,
        updatedAt: Date.now(),
      });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Cache of the species/breeds dropdown lists so the registration form still
// works when it is opened with no connection at all.
export async function saveLookups(species, breeds) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LOOKUPS_STORE, 'readwrite');
    tx.objectStore(LOOKUPS_STORE).put({
      id: 'lookups',
      species: species || [],
      breeds: breeds || [],
      savedAt: Date.now(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getLookups() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LOOKUPS_STORE, 'readonly');
    const req = tx.objectStore(LOOKUPS_STORE).get('lookups');
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

// ---------- Offline notifications ----------
// Locally-created notifications so the bell still works with no connection.
// These are merged with the server list by the NotificationBell and cleared
// once they have been synced (i.e. the matching server notification exists).

export async function saveOfflineNotification({ userId, sourceKey = null, title, message, type = 'System', link = null }) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NOTIFICATIONS_STORE, 'readwrite');
    const store = tx.objectStore(NOTIFICATIONS_STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      const rows = req.result || [];
      const existing = sourceKey
        ? rows.find((r) => r.userId === userId && r.sourceKey === sourceKey)
        : null;
      if (existing) {
        store.put({
          ...existing,
          title,
          message,
          type,
          link,
          is_read: 0,
          created_at: new Date().toISOString(),
        });
      } else {
        store.add({
          userId,
          sourceKey,
          title,
          message,
          type,
          link,
          is_read: 0,
          created_at: new Date().toISOString(),
          synced: 0,
        });
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getOfflineNotifications(userId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NOTIFICATIONS_STORE, 'readonly');
    const req = tx.objectStore(NOTIFICATIONS_STORE).getAll();
    req.onsuccess = () => {
      const rows = (req.result || [])
        .filter((r) => r.userId === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      resolve(rows);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function markOfflineNotificationRead(userId, id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NOTIFICATIONS_STORE, 'readwrite');
    const store = tx.objectStore(NOTIFICATIONS_STORE);
    const req = store.get(id);
    req.onsuccess = () => {
      const row = req.result;
      if (!row || row.userId !== userId) return resolve();
      row.is_read = 1;
      store.put(row);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function markAllOfflineNotificationsRead(userId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NOTIFICATIONS_STORE, 'readwrite');
    const store = tx.objectStore(NOTIFICATIONS_STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      for (const row of req.result || []) {
        if (row.userId !== userId) continue;
        row.is_read = 1;
        store.put(row);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteOfflineNotification(userId, id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NOTIFICATIONS_STORE, 'readwrite');
    const store = tx.objectStore(NOTIFICATIONS_STORE);
    const req = store.get(id);
    req.onsuccess = () => {
      const row = req.result;
      if (!row || row.userId !== userId) return resolve();
      store.delete(id);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearOfflineNotifications(userId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NOTIFICATIONS_STORE, 'readwrite');
    const store = tx.objectStore(NOTIFICATIONS_STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      for (const row of req.result || []) {
        if (row.userId !== userId) continue;
        store.delete(row.id);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}