import type { TreeData, UserSession } from '../types/family';

const DB_NAME = 'kinvault_offline_db';
const DB_VERSION = 1;
const STORE_TREES = 'trees';
const STORE_SETTINGS = 'settings';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_TREES)) {
        db.createObjectStore(STORE_TREES, { keyPath: 'treeId' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineTree(treeId: string, data: TreeData): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_TREES, 'readwrite');
      const store = tx.objectStore(STORE_TREES);
      store.put({ treeId, data, cachedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to save tree in IndexedDB:', err);
  }
}

export async function getOfflineTree(treeId: string): Promise<TreeData | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_TREES, 'readonly');
      const store = tx.objectStore(STORE_TREES);
      const request = store.get(treeId);
      request.onsuccess = () => {
        if (request.result?.data) {
          resolve(request.result.data as TreeData);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to get tree from IndexedDB:', err);
    return null;
  }
}

export async function getAppLockPin(): Promise<string | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SETTINGS, 'readonly');
      const store = tx.objectStore(STORE_SETTINGS);
      const req = store.get('app_lock_pin');
      req.onsuccess = () => resolve(req.result ? (req.result.value as string) : null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function setAppLockPin(pin: string | null): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SETTINGS, 'readwrite');
      const store = tx.objectStore(STORE_SETTINGS);
      if (pin) {
        store.put({ key: 'app_lock_pin', value: pin });
      } else {
        store.delete('app_lock_pin');
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to set lock pin:', err);
  }
}

export async function saveSession(session: UserSession | null): Promise<void> {
  try {
    if (session) {
      localStorage.setItem('kinvault_session', JSON.stringify(session));
    } else {
      localStorage.removeItem('kinvault_session');
    }
  } catch {
    // ignore
  }
}

export function getSession(): UserSession | null {
  try {
    const str = localStorage.getItem('kinvault_session');
    return str ? (JSON.parse(str) as UserSession) : null;
  } catch {
    return null;
  }
}
