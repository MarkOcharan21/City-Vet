const DB_NAME = 'pet-offline-drafts';
const STORE = 'drafts';
const LOOKUPS_STORE = 'lookups';
const DB_VERSION = 2;

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