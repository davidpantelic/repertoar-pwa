import { useMainStore } from "@/stores/mainStore";
import { useSongs } from "@/composables/useSongs";

export function useAutoSync() {
  const store = useMainStore();
  const online = useOnline();
  const { syncSongs, syncingSongs } = useSongs();

  watch(
    online,
    (isOnline, wasOnline) => {
      if (isOnline && wasOnline === false && store.autoSyncOnReconnect) {
        void syncSongs();
      }
    },
    { flush: "post" },
  );

  return { syncing: syncingSongs };
}
