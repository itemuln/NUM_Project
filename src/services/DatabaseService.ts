import type { AppDatabaseSnapshot } from "@/types";

const databaseName = "num-smart-scheduler";
const databaseVersion = 1;
const storeName = "app_state";
const stateKey = "current-user";

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(storeName)) {
        database.createObjectStore(storeName, { keyPath: "id" });
      }
    };

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export const DatabaseService = {
  async loadSnapshot() {
    const database = await openDatabase();

    return new Promise<AppDatabaseSnapshot | null>((resolve, reject) => {
      const transaction = database.transaction(storeName, "readonly");
      const request = transaction.objectStore(storeName).get(stateKey);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as { id: string; snapshot: AppDatabaseSnapshot } | undefined;
        resolve(result?.snapshot ?? null);
      };

      transaction.oncomplete = () => database.close();
    });
  },

  async saveSnapshot(snapshot: AppDatabaseSnapshot) {
    const database = await openDatabase();

    return new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeName, "readwrite");
      const request = transaction.objectStore(storeName).put({
        id: stateKey,
        snapshot,
        updatedAt: new Date().toISOString()
      });

      request.onerror = () => reject(request.error);
      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
    });
  }
};
