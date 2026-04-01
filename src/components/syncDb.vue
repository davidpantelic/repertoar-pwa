<script setup lang="ts">
import { useMainStore } from "@/stores/mainStore";
import { useUserSession } from "../stores/userSession";

const store = useMainStore();
const userSessionStore = useUserSession();
const { syncDb, syncMessage } = useSyncDb();
</script>

<template>
  <label class="flex items-center gap-2 text-sm mb-2">
    <input v-model="store.autoSyncOnReconnect" type="checkbox" />
    {{ $t("api.syncOnReconnect") }}
  </label>
  <Button
    :icon="store.isLoading ? 'pi pi-spinner pi-spin' : 'pi pi-sync'"
    :label="$t('api.syncDb')"
    size="small"
    :disabled="!userSessionStore.session"
    @click="syncDb"
  />
  <div v-if="syncMessage" class="mt-2 text-sm opacity-80">
    {{ syncMessage }}
  </div>
</template>
