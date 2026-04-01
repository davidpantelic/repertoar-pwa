import type { AppRecord } from "@/types";
import { useMainStore } from "@/stores/mainStore";
import {
  listRecordsFromIndexedDb,
  saveRecordToIndexedDb,
  listQueueItems,
  removeQueueItem,
} from "@/composables/useIndexedDb";
import { useSupabaseClient } from "@/composables/useSupabase";
import { useUserSession } from "@/stores/userSession";

const isNewer = (a?: string | null, b?: string | null) => {
  if (!a) return false;
  if (!b) return true;
  return new Date(a).getTime() > new Date(b).getTime();
};

export function useSyncDb() {
  const { t } = useI18n();
  const store = useMainStore();
  const userSessionStore = useUserSession();
  const syncMessage = ref<string | null>(null);
  const syncing = ref(false);
  const TABLE_NAME = "records";

  const syncDb = async () => {
    if (syncing.value) return;
    syncing.value = true;
    store.isLoading = true;
    syncMessage.value = null;
    try {
      const userId = userSessionStore.session?.user?.id;
      if (!userId) {
        syncMessage.value = t("form.message.loggedRequired");
        return;
      }

      const supabase = useSupabaseClient();
      const nowIso = new Date().toISOString();

      const queueItems = await listQueueItems();
      for (const item of queueItems) {
        if (item.type === "upsert" && item.record.user_id === userId) {
          const { error: queueError } = await supabase
            .from(TABLE_NAME)
            .upsert({ ...item.record, syncedAt: nowIso }, { onConflict: "id" });
          if (queueError) throw queueError;
          await removeQueueItem(item.id);
          await saveRecordToIndexedDb({ ...item.record, syncedAt: nowIso });
        }
      }

      const localRecords = (await listRecordsFromIndexedDb()).filter(
        (record) => record.user_id === userId,
      );
      const { data: remoteRecords, error } = await supabase
        .from(TABLE_NAME)
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;

      const remoteList = (remoteRecords as AppRecord[]) ?? [];
      const remoteById = new Map(remoteList.map((r) => [r.id, r]));

      const toPush: AppRecord[] = [];
      for (const local of localRecords) {
        const remote = remoteById.get(local.id);
        if (!remote || isNewer(local.updatedAt, remote.updatedAt)) {
          toPush.push({ ...local, syncedAt: nowIso });
        }
      }

      if (toPush.length) {
        const { error: upsertError } = await supabase
          .from(TABLE_NAME)
          .upsert(toPush, { onConflict: "id" });
        if (upsertError) throw upsertError;
      }

      const { data: refreshedRemote, error: refreshedError } = await supabase
        .from(TABLE_NAME)
        .select("*")
        .eq("user_id", userId);
      if (refreshedError) throw refreshedError;

      const finalRemote = (refreshedRemote as AppRecord[]) ?? [];
      for (const record of finalRemote) {
        await saveRecordToIndexedDb({ ...record, syncedAt: nowIso });
      }

      syncMessage.value = t("api.syncSuccess");
    } catch (err) {
      syncMessage.value = t("api.syncFailed");
    } finally {
      store.isLoading = false;
      syncing.value = false;
      await delay(2000);
      syncMessage.value = null;
    }
  };

  return { syncDb, syncMessage, syncing };
}
