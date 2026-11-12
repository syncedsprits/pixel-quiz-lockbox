/**
 * Local file storage (browser IndexedDB). No storage server is configured for this app, so uploaded
 * files are kept only in this browser on this device. Every record carries its projectId and every
 * read/delete is scoped by it so files never cross between projects.
 */
import type { FileCategory } from "./formats";
import type { Extracted } from "./extracted";

export interface StoredFile {
  id: string;
  projectId: string;
  name: string;
  extension: string;
  mimeType: string;
  size: number;
  category: FileCategory;
  uploadedAt: string;
  /** "processed" when readable content was extracted; "stored" when only the original was kept. */
  processing: "processed" | "stored";
  extracted: Extracted;
  storage: "browser-indexeddb";
  blob: Blob;
}

const DB_NAME = "handoverpulse.files";
const STORE = "files";
export const FILES_CHANGED_EVENT = "handoverpulse:files-changed";

export class StorageUnavailableError extends Error {
  constructor() {
    super("This browser blocks local storage, so files can't be saved here. Try a different browser or turn off private mode.");
  }
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new StorageUnavailableError());
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE, { keyPath: "id" });
      store.createIndex("projectId", "projectId", { unique: false });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new StorageUnavailableError());
  }).catch((e) => {
    dbPromise = null;
    throw e;
  });
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(tx.error ?? new Error("Storage operation failed"));
        tx.onabort = () => reject(tx.error ?? new Error("Storage operation was cancelled (the browser may be out of space)"));
      }),
  );
}

function notify(projectId: string) {
  window.dispatchEvent(new CustomEvent(FILES_CHANGED_EVENT, { detail: { projectId } }));
}

export async function saveFile(file: StoredFile): Promise<void> {
  await run("readwrite", (s) => s.add(file));
  // Read back to confirm the write really landed before reporting success.
  const check = await getFile(file.projectId, file.id);
  if (!check) throw new Error("The file couldn't be confirmed in browser storage.");
  notify(file.projectId);
}

export async function listFiles(projectId: string): Promise<StoredFile[]> {
  const all = await run<StoredFile[]>("readonly", (s) => s.index("projectId").getAll(projectId));
  return all.filter((f) => f.projectId === projectId).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export async function listAllFiles(): Promise<StoredFile[]> {
  return run<StoredFile[]>("readonly", (s) => s.getAll());
}

export async function getFile(projectId: string, id: string): Promise<StoredFile | null> {
  const f = await run<StoredFile | undefined>("readonly", (s) => s.get(id));
  return f && f.projectId === projectId ? f : null;
}

/** Deletes a file only if it belongs to the given project. */
export async function deleteFile(projectId: string, id: string): Promise<void> {
  const existing = await getFile(projectId, id);
  if (!existing) throw new Error("That file isn't in this project.");
  await run("readwrite", (s) => s.delete(id));
  notify(projectId);
}

export function newFileId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
