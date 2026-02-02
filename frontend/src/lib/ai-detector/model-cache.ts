/**
 * IndexedDB Model Caching
 * Caches the ONNX model for faster subsequent loads
 */

import { CACHE_DB_NAME, CACHE_STORE_NAME, MODEL_VERSION, ModelCacheEntry } from './types';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(CACHE_DB_NAME, 1);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
        db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'id' });
      }
    };
  });

  return dbPromise;
}

export async function getCachedModel(): Promise<ArrayBuffer | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(CACHE_STORE_NAME, 'readonly');
      const store = transaction.objectStore(CACHE_STORE_NAME);
      const request = store.get('model');

      request.onerror = () => {
        reject(new Error('Failed to read from cache'));
      };

      request.onsuccess = () => {
        const entry = request.result as (ModelCacheEntry & { id: string }) | undefined;
        if (entry && entry.version === MODEL_VERSION) {
          resolve(entry.modelData);
        } else {
          resolve(null);
        }
      };
    });
  } catch (error) {
    console.warn('IndexedDB cache read failed:', error);
    return null;
  }
}

export async function cacheModel(modelData: ArrayBuffer): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(CACHE_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(CACHE_STORE_NAME);

      const entry = {
        id: 'model',
        modelData,
        timestamp: Date.now(),
        version: MODEL_VERSION,
      };

      const request = store.put(entry);

      request.onerror = () => {
        reject(new Error('Failed to write to cache'));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  } catch (error) {
    console.warn('IndexedDB cache write failed:', error);
  }
}

export async function clearModelCache(): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(CACHE_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(CACHE_STORE_NAME);
      const request = store.delete('model');

      request.onerror = () => {
        reject(new Error('Failed to clear cache'));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  } catch (error) {
    console.warn('IndexedDB cache clear failed:', error);
  }
}
