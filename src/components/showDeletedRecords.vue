<script setup lang="ts">
import type { AppRecord, QueueItem } from "@/types";
import { useUserSession } from "../stores/userSession";

const { t } = useI18n();
const online = useOnline();
const TABLE_NAME = "records";
const userSessionStore = useUserSession();
const showDeleted = ref(true);
const records = ref<AppRecord[]>([]);
const message = ref<string | null>(null);
const isLoading = ref(false);

watch(
  () => userSessionStore.session,
  (session) => {
    if (!session) {
      records.value = [];
      message.value = null;
      isLoading.value = false;
    }
  },
);

const loadRecords = async () => {
  const userId = userSessionStore.session?.user?.id;
  if (!userId) {
    records.value = [];
    message.value = t("form.message.loggedRequired");
    return;
  }

  isLoading.value = true;
  message.value = null;
  try {
    const result = await listRecordsFromIndexedDb();
    const ownRecords = result.filter((r) => r.user_id === userId);
    records.value = showDeleted.value
      ? ownRecords.filter((r) => r.deletedAt)
      : ownRecords.filter((r) => !r.deletedAt);
    if (!records.value.length) {
      message.value = showDeleted.value
        ? t("api.noDeletedRecords")
        : t("api.noRecords");
    }
  } catch (err) {
    message.value = t("api.loadingFailed");
  } finally {
    isLoading.value = false;
    await delay(2000);
    message.value = null;
  }
};

// watch(showDeleted, loadRecords, { immediate: true });

const enqueueUpsert = async (record: AppRecord) => {
  const queued: QueueItem = {
    id: crypto.randomUUID(),
    type: "upsert",
    record,
    createdAt: new Date().toISOString(),
    retries: 0,
  };
  await addQueueItem(queued);
};

const restoreRecord = async (record: AppRecord) => {
  const userId = userSessionStore.session?.user?.id;
  if (!userId) {
    message.value = t("form.message.loggedRequired");
    return;
  }
  if (record.user_id !== userId) {
    message.value = t("api.recordRestoreFailed");
    return;
  }

  isLoading.value = true;
  message.value = null;
  const nowIso = new Date().toISOString();
  const updated: AppRecord = {
    ...record,
    deletedAt: null,
    updatedAt: nowIso,
    syncedAt: online.value ? nowIso : null,
  };

  try {
    await saveRecordToIndexedDb(updated);
    if (online.value) {
      const supabase = useSupabaseClient();
      const { error } = await supabase
        .from(TABLE_NAME)
        .upsert(updated, { onConflict: "id" });
      if (error) throw error;
    } else {
      await enqueueUpsert(updated);
    }
    message.value = t("api.recordRestored");
    await loadRecords();
  } catch (err) {
    message.value = t("api.recordRestoreFailed");
    if (online.value) {
      await enqueueUpsert({ ...updated, syncedAt: null });
    }
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <label class="flex items-center gap-2 text-sm mb-2">
    <input v-model="showDeleted" type="checkbox" />
    {{ t("api.showDeleted") }}
  </label>
  <Button
    :icon="isLoading ? 'pi pi-spinner pi-spin' : 'pi pi-sync'"
    :label="t('words.refresh')"
    size="small"
    @click="loadRecords"
  />
  <p v-if="message" class="text-sm opacity-80">{{ message }}</p>

  <div v-if="records.length" class="mt-3 flex flex-col gap-3 max-w-2xl">
    <div
      v-for="record in records"
      :key="record.id"
      class="p-3 border border-surface-200 rounded-md"
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="font-semibold">{{ record.title }}</div>
          <div v-if="record.body" class="text-sm opacity-80">
            {{ record.body }}
          </div>
          <div class="text-xs opacity-60 mt-1">
            {{ t("words.deleted") }}: {{ record.deletedAt }}
          </div>
        </div>
        <div class="flex gap-2">
          <Button
            v-if="record.deletedAt"
            icon="pi pi-undo"
            size="small"
            :label="t('words.restore')"
            @click="restoreRecord(record)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
