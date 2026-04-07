import { useUserSession } from "@/stores/userSession";
import { getAppMetaValue, setAppMetaValue } from "@/composables/useIndexedDb";
import { useNoteCrypto } from "@/composables/useNoteCrypto";

const LOCAL_NOTE_KEY_CACHE_PREFIX = "note-key-cache:";

export function useUserNoteKey() {
  const userSession = useUserSession();
  const { generateNoteKey, exportNoteKey, importNoteKey } = useNoteCrypto();

  const noteKey = shallowRef<CryptoKey | null>(null);
  const noteKeyLoading = ref(false);
  const noteKeyError = ref<string | null>(null);

  const getCurrentUserId = () => userSession.session?.user?.id ?? null;

  const getLocalCacheKey = (userId: string) =>
    `${LOCAL_NOTE_KEY_CACHE_PREFIX}${userId}`;

  const setError = (error: unknown) => {
    noteKeyError.value =
      error instanceof Error ? error.message : error ? String(error) : null;
  };

  const getCachedNoteKey = async () => {
    const userId = getCurrentUserId();
    if (!userId) return null;

    const rawKey = await getAppMetaValue<string>(getLocalCacheKey(userId));
    if (!rawKey) return null;

    try {
      noteKey.value = await importNoteKey(rawKey);
      return noteKey.value;
    } catch (error) {
      setError(error);
      return null;
    }
  };

  const persistNoteKeyLocally = async (key: CryptoKey) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    const rawKey = await exportNoteKey(key);
    await setAppMetaValue(getLocalCacheKey(userId), rawKey);
  };

  const initRecoverableNoteKey = async () => {
    const userId = getCurrentUserId();
    if (!userId) return null;

    noteKeyLoading.value = true;
    noteKeyError.value = null;

    try {
      const cachedKey = await getCachedNoteKey();
      if (cachedKey) return cachedKey;

      const generatedKey = await generateNoteKey();
      const rawKey = await exportNoteKey(generatedKey);
      const { data, error } = await userSession.supabase.functions.invoke(
        "note-key",
        {
          body: {
            action: "ensure",
            rawKey,
          },
        },
      );

      if (error) throw error;

      const resolvedRawKey = data?.rawKey ?? rawKey;
      noteKey.value = await importNoteKey(resolvedRawKey);
      await setAppMetaValue(getLocalCacheKey(userId), resolvedRawKey);

      return noteKey.value;
    } catch (error) {
      setError(error);
      return null;
    } finally {
      noteKeyLoading.value = false;
    }
  };

  const loadRecoverableNoteKey = async () => {
    const userId = getCurrentUserId();
    if (!userId) return null;

    noteKeyLoading.value = true;
    noteKeyError.value = null;

    try {
      if (noteKey.value) return noteKey.value;

      const cachedKey = await getCachedNoteKey();
      if (cachedKey) return cachedKey;

      const { data, error } = await userSession.supabase.functions.invoke(
        "note-key",
        {
          body: {
            action: "load",
          },
        },
      );

      if (error) throw error;
      if (!data?.rawKey) return null;

      noteKey.value = await importNoteKey(data.rawKey);
      await setAppMetaValue(getLocalCacheKey(userId), data.rawKey);
      return noteKey.value;
    } catch (error) {
      setError(error);
      return null;
    } finally {
      noteKeyLoading.value = false;
    }
  };

  const clearLoadedNoteKey = () => {
    noteKey.value = null;
    noteKeyError.value = null;
  };

  watch(
    () => userSession.session?.user?.id,
    (userId, previousUserId) => {
      if (!userId || userId !== previousUserId) {
        clearLoadedNoteKey();
      }
    },
  );

  return {
    noteKey,
    noteKeyLoading,
    noteKeyError,
    initRecoverableNoteKey,
    loadRecoverableNoteKey,
    persistNoteKeyLocally,
    clearLoadedNoteKey,
  };
}
