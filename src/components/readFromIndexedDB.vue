<script setup lang="ts">
import type { AppRecord } from "@/types";
import { useUserSession } from "../stores/userSession";

const { t } = useI18n();
const userSessionStore = useUserSession();
const records = ref<AppRecord[] | null>(null);
const readMessage = ref<string | null>(null);
const isLoading = ref(false);

watch(
  () => userSessionStore.session,
  (session) => {
    if (!session) {
      records.value = null;
      readMessage.value = null;
      isLoading.value = false;
    }
  },
);

const readFromIndexedDB = async () => {
  const userId = userSessionStore.session?.user?.id;
  if (!userId) {
    readMessage.value = t("form.message.loggedRequired");
    await delay(2000);
    readMessage.value = null;
    return;
  }

  isLoading.value = true;
  readMessage.value = null;
  try {
    const result = await listRecordsFromIndexedDb();
    records.value = result.filter((record) => record.user_id === userId);
    if (!records.value.length) readMessage.value = t("api.noRecords");
  } catch (err) {
    readMessage.value = t("api.loadingFailed");
  } finally {
    isLoading.value = false;
    await delay(2000);
    readMessage.value = null;
  }
};
</script>

<template>
  <Button
    :icon="isLoading ? 'pi pi-spinner pi-spin' : 'pi pi-sync'"
    :label="t('api.readFromIDB')"
    size="small"
    @click="readFromIndexedDB"
  />
  <div v-if="readMessage" class="mt-2 text-sm opacity-80">
    {{ readMessage }}
  </div>
  <pre
    v-else-if="(records?.length ?? 0) > 0"
    class="mt-2 text-sm whitespace-pre-wrap"
  >
    {{ JSON.stringify(records, null, 2) }}
  </pre>
</template>
