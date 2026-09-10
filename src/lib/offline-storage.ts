export interface OfflineTask {
  id: string;
  type: 'INICIAR_LIMPIEZA' | 'FINALIZAR_ASEO' | 'REPORTAR_INCIDENCIA' | 'REGISTRAR_LAVANDERIA' | 'ENTREGAR_LAVANDERIA';
  payload: any;
  timestamp: number;
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
}

const DB_NAME = 'TajamonaeOfflineDB';
const STORE_NAME = 'tasks';
const DB_VERSION = 1;

export async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function saveTask(task: OfflineTask): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(task);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingTasks(): Promise<OfflineTask[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const all: OfflineTask[] = request.result;
      resolve(all.filter(t => t.status !== 'failed').sort((a, b) => a.timestamp - b.timestamp));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function removeTask(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function updateTaskStatus(id: string, status: OfflineTask['status'], error?: string): Promise<void> {
  const db = await initDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  
  return new Promise((resolve, reject) => {
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const task = getReq.result;
      if (task) {
        task.status = status;
        if (error) task.error = error;
        store.put(task).onsuccess = () => resolve();
      } else {
        resolve();
      }
    };
    getReq.onerror = () => reject(getReq.error);
  });
}
