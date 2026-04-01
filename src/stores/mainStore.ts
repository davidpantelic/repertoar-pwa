export const useMainStore = defineStore("mainStore", () => {
  const isLoading = ref(false);
  const autoSyncOnReconnect = ref(false);

  return { isLoading, autoSyncOnReconnect };
});
