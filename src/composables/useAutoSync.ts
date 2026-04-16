import { useMainStore } from "@/stores/mainStore";
import { useLists } from "@/composables/useLists";
import { useSongs } from "@/composables/useSongs";

export function useAutoSync() {
  const store = useMainStore();
  const online = useOnline();
  const { syncSongs, syncingSongs } = useSongs();
  const { syncLists, syncingLists } = useLists();

  watch(
    online,
    (isOnline, wasOnline) => {
      if (isOnline && wasOnline === false && store.autoSyncOnReconnect) {
        void syncSongs();
        void syncLists();
      }
    },
    { flush: "post" },
  );

  return { syncing: computed(() => syncingSongs.value || syncingLists.value) };
}
