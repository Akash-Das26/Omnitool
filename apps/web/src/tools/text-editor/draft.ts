/**
 * The draft is the only thing this tool ever stores, it is stored on the
 * reader's own device, and it is stored only when they ask for it. Nothing
 * leaves the browser: there is no network call anywhere in this file.
 */

const DATABASE = 'omnitool-text-editor';
const STORE = 'drafts';
const KEY = 'document';
const VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('The draft store could not be opened'));
  });
}

function request<T>(
  transaction: IDBTransaction,
  run: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const call = run(transaction.objectStore(STORE));
    call.onsuccess = () => resolve(call.result as T);
    call.onerror = () => reject(call.error ?? new Error('The draft store could not be used'));
  });
}

export interface Draft {
  readonly markdown: string;
  readonly savedAt: string;
}

export async function saveDraft(markdown: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE, 'readwrite');
  const draft: Draft = { markdown, savedAt: new Date().toISOString() };
  await request(transaction, (store) => store.put(draft, KEY));
  database.close();
}

export async function loadDraft(): Promise<Draft | null> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE, 'readonly');
  const draft = await request<Draft | undefined>(transaction, (store) => store.get(KEY));
  database.close();
  return draft ?? null;
}

export async function clearDraft(): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE, 'readwrite');
  await request(transaction, (store) => store.delete(KEY));
  database.close();
}
