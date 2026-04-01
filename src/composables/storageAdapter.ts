import type { AppRecord, StorageAdapter } from "@/types";

export const createRecord = (input: {
  title: string;
  body?: string;
  id?: string;
  user_id?: string;
}): AppRecord => {
  const now = new Date().toISOString();
  return {
    id: input.id ?? crypto.randomUUID(),
    user_id: input.user_id,
    title: input.title,
    body: input.body,
    createdAt: now,
    updatedAt: now,
    syncedAt: null,
    deletedAt: null,
  };
};

export const defineStorageAdapter = (adapter: StorageAdapter): StorageAdapter =>
  adapter;
