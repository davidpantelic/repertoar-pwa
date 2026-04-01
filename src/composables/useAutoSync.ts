import { useMainStore } from "@/stores/mainStore";
import { useSyncDb } from "@/composables/useSyncDb";

export function useAutoSync() {
  const store = useMainStore();
  const online = useOnline();
  const { syncDb, syncing } = useSyncDb();

  watch(
    online,
    (isOnline, wasOnline) => {
      if (isOnline && wasOnline === false && store.autoSyncOnReconnect) {
        syncDb();
      }
    },
    { flush: "post" },
  );

  return { syncing };
}
