import { openDB } from "idb";
import type { AppRecord, QueueItem } from "@/types";

const DB_NAME = "webdak-pwa";
const DB_VERSION = 2;
const STORE_NAME = "records";
const QUEUE_STORE = "queue";

const getDb = () =>
  openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
      }
    },
  });

export async function saveRecordToIndexedDb(record: AppRecord) {
  const db = await getDb();
  await db.put(STORE_NAME, record);
}

export async function listRecordsFromIndexedDb(): Promise<AppRecord[]> {
  const db = await getDb();
  return db.getAll(STORE_NAME);
}

export async function addQueueItem(item: QueueItem) {
  const db = await getDb();
  await db.put(QUEUE_STORE, item);
}

export async function listQueueItems(): Promise<QueueItem[]> {
  const db = await getDb();
  return db.getAll(QUEUE_STORE);
}

export async function removeQueueItem(id: string) {
  const db = await getDb();
  await db.delete(QUEUE_STORE, id);
}
