export function useOffline() {
  // useOnline() from @vueuse/core (you already have VueUse)
  const online = useOnline();
  const offline = computed(() => !online.value);
  return { online, offline };
}
