import type {
  RemoteSongRow,
  Song,
  SongUpsertPayload,
  SyncQueueItem,
} from "@/types";
import { useUserSession } from "@/stores/userSession";
import {
  addSyncQueueItem,
  clearSongsForUser,
  getSongFromIndexedDb,
  listSongsFromIndexedDb,
  listSyncQueueItems,
  removeSyncQueueItem,
  saveSongToIndexedDb,
  saveSongsToIndexedDb,
} from "@/composables/useIndexedDb";
import { useUserNoteKey } from "@/composables/useUserNoteKey";
import { useNoteCrypto } from "@/composables/useNoteCrypto";

const remoteSongSelect = `
  id,
  user_id,
  name,
  artist,
  note_encrypted,
  note_iv,
  note_version,
  deleted_at,
  created_at,
  updated_at
`;

const normalizeSongPayload = (payload: SongUpsertPayload) => ({
  name: payload.name.trim(),
  artist: payload.artist?.trim() || null,
  note: payload.note?.trim() || null,
});

const upsertSongInList = (list: Song[], song: Song) => {
  const existingIndex = list.findIndex((item) => item.id === song.id);
  if (existingIndex === -1) {
    list.unshift(song);
    return;
  }

  list.splice(existingIndex, 1, song);
};

const removeSongFromList = (list: Song[], songId: string) => {
  const existingIndex = list.findIndex((item) => item.id === songId);
  if (existingIndex !== -1) {
    list.splice(existingIndex, 1);
  }
};

export function useSongs() {
  const supabase = useSupabaseClient();
  const userSession = useUserSession();
  const isOnline = useOnline();
  const { NOTE_VERSION, encryptNote, decryptNote } = useNoteCrypto();
  const { initRecoverableNoteKey, loadRecoverableNoteKey } = useUserNoteKey();

  const songs = ref<Song[]>([]);
  const deletedSongs = ref<Song[]>([]);
  const loadingSongs = ref(false);
  const loadingDeletedSongs = ref(false);
  const creatingSong = ref(false);
  const updatingSong = ref(false);
  const deletingSong = ref(false);
  const restoringSong = ref(false);
  const syncingSongs = ref(false);
  const songsError = ref<string | null>(null);

  const isAuthenticated = computed(() =>
    Boolean(userSession.session?.user?.id),
  );

  const setSongsError = (error: unknown) => {
    songsError.value =
      error instanceof Error ? error.message : error ? String(error) : null;
  };

  const requireUserId = () => {
    const userId = userSession.session?.user?.id;
    if (userId) return userId;
    setSongsError("User is not authenticated.");
    return null;
  };

  const sortSongsByCreatedAtDesc = (list: Song[]) =>
    [...list].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

  const applySongsToState = (allSongs: Song[]) => {
    const sortedSongs = sortSongsByCreatedAtDesc(allSongs);
    songs.value = sortedSongs.filter((song) => !song.deleted_at);
    deletedSongs.value = [...sortedSongs]
      .filter((song) => Boolean(song.deleted_at))
      .sort((a, b) => {
        const aDeletedAt = a.deleted_at ? new Date(a.deleted_at).getTime() : 0;
        const bDeletedAt = b.deleted_at ? new Date(b.deleted_at).getTime() : 0;
        return bDeletedAt - aDeletedAt;
      });
  };

  const readSongsFromLocalStore = async (userId: string) => {
    const localSongs = await listSongsFromIndexedDb(userId);
    applySongsToState(localSongs);
    return localSongs;
  };

  const ensureNoteKeyForWrite = async (note: string | null) => {
    if (!note) return null;
    return (await loadRecoverableNoteKey()) ?? (await initRecoverableNoteKey());
  };

  const buildRemoteSongPayload = async (song: Song) => {
    const noteKey = await ensureNoteKeyForWrite(song.note);
    const encryptedPayload =
      song.note && noteKey
        ? await encryptNote(song.note, noteKey)
        : { ciphertext: null, iv: null, version: NOTE_VERSION };

    return {
      id: song.id,
      user_id: song.user_id,
      name: song.name,
      artist: song.artist,
      note_encrypted: encryptedPayload.ciphertext,
      note_iv: encryptedPayload.iv,
      note_version: encryptedPayload.version,
      deleted_at: song.deleted_at,
      created_at: song.created_at,
      updated_at: song.updated_at,
    };
  };

  const mapRemoteSongToLocal = async (
    remoteSong: RemoteSongRow,
    noteKey: CryptoKey | null,
  ): Promise<Song> => {
    let decryptedNote: string | null = null;

    if (remoteSong.note_encrypted && remoteSong.note_iv) {
      if (!noteKey) {
        decryptedNote = null;
      } else {
        try {
          decryptedNote = await decryptNote(
            remoteSong.note_encrypted,
            remoteSong.note_iv,
            noteKey,
          );
        } catch (error) {
          console.warn("Failed to decrypt song note", error);
          decryptedNote = null;
        }
      }
    }

    return {
      id: remoteSong.id,
      user_id: remoteSong.user_id,
      name: remoteSong.name,
      artist: remoteSong.artist,
      note: decryptedNote,
      deleted_at: remoteSong.deleted_at,
      created_at: remoteSong.created_at,
      updated_at: remoteSong.updated_at,
    };
  };

  const bootstrapSongsFromRemote = async (userId: string) => {
    const { data, error } = await supabase
      .from("songs")
      .select(remoteSongSelect)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const remoteSongs = (data as RemoteSongRow[]) ?? [];
    const noteKey = remoteSongs.some((song) => song.note_encrypted)
      ? await loadRecoverableNoteKey()
      : null;

    const localSongs = await Promise.all(
      remoteSongs.map((song) => mapRemoteSongToLocal(song, noteKey)),
    );

    await clearSongsForUser(userId);
    await saveSongsToIndexedDb(localSongs);
    applySongsToState(localSongs);

    return localSongs;
  };

  const queueSongMutation = async (
    operation: SyncQueueItem["operation"],
    song: Song,
  ) => {
    const payload = await buildRemoteSongPayload(song);

    await addSyncQueueItem({
      id: crypto.randomUUID(),
      entity: "song",
      operation,
      record_id: song.id,
      payload,
      user_id: song.user_id,
      created_at: new Date().toISOString(),
      retry_count: 0,
    });
  };

  const syncSongs = async () => {
    const userId = requireUserId();
    if (!userId || !isOnline.value || syncingSongs.value) return;

    syncingSongs.value = true;
    setSongsError(null);

    try {
      const queueItems = (await listSyncQueueItems(userId)).filter(
        (item) => item.entity === "song",
      );

      for (const item of queueItems) {
        const { error } = await supabase
          .from("songs")
          .upsert(item.payload, { onConflict: "id" });

        if (error) throw error;
        await removeSyncQueueItem(item.id);
      }

      const pendingSongQueue = (await listSyncQueueItems(userId)).filter(
        (item) => item.entity === "song",
      );

      if (pendingSongQueue.length > 0) return;

      await bootstrapSongsFromRemote(userId);
    } catch (error) {
      setSongsError(error);
    } finally {
      syncingSongs.value = false;
    }
  };

  const loadSongs = async () => {
    const userId = requireUserId();
    if (!userId) return [];

    loadingSongs.value = true;
    setSongsError(null);

    try {
      const localSongs = await readSongsFromLocalStore(userId);

      if (localSongs.length === 0 && isOnline.value) {
        return await bootstrapSongsFromRemote(userId);
      }

      if (isOnline.value) {
        void syncSongs();
      }

      return songs.value;
    } catch (error) {
      setSongsError(error);
      return [];
    } finally {
      loadingSongs.value = false;
    }
  };

  const loadDeletedSongs = async () => {
    const userId = requireUserId();
    if (!userId) return [];

    loadingDeletedSongs.value = true;
    setSongsError(null);

    try {
      const localSongs = await readSongsFromLocalStore(userId);

      if (localSongs.length === 0 && isOnline.value) {
        await bootstrapSongsFromRemote(userId);
      }

      return deletedSongs.value;
    } catch (error) {
      setSongsError(error);
      return [];
    } finally {
      loadingDeletedSongs.value = false;
    }
  };

  const createSong = async (payload: SongUpsertPayload) => {
    const userId = requireUserId();
    if (!userId) return null;

    creatingSong.value = true;
    setSongsError(null);

    try {
      const normalizedPayload = normalizeSongPayload(payload);
      const nowIso = new Date().toISOString();

      const localSong: Song = {
        id: crypto.randomUUID(),
        user_id: userId,
        name: normalizedPayload.name,
        artist: normalizedPayload.artist,
        note: normalizedPayload.note,
        deleted_at: null,
        created_at: nowIso,
        updated_at: nowIso,
      };

      await saveSongToIndexedDb(localSong);
      upsertSongInList(songs.value, localSong);
      songs.value = sortSongsByCreatedAtDesc(songs.value);

      await queueSongMutation("upsert", localSong);
      if (isOnline.value) {
        void syncSongs();
      }

      return localSong;
    } catch (error) {
      setSongsError(error);
      return null;
    } finally {
      creatingSong.value = false;
    }
  };

  const updateSong = async (songId: string, payload: SongUpsertPayload) => {
    const userId = requireUserId();
    if (!userId) return null;

    updatingSong.value = true;
    setSongsError(null);

    try {
      const existingSong = await getSongFromIndexedDb(songId);
      if (!existingSong || existingSong.user_id !== userId) {
        throw new Error("Song not found.");
      }

      const normalizedPayload = normalizeSongPayload(payload);
      const updatedSong: Song = {
        ...existingSong,
        name: normalizedPayload.name,
        artist: normalizedPayload.artist,
        note: normalizedPayload.note,
        updated_at: new Date().toISOString(),
      };

      await saveSongToIndexedDb(updatedSong);

      if (updatedSong.deleted_at) {
        upsertSongInList(deletedSongs.value, updatedSong);
        removeSongFromList(songs.value, updatedSong.id);
      } else {
        upsertSongInList(songs.value, updatedSong);
        removeSongFromList(deletedSongs.value, updatedSong.id);
        songs.value = sortSongsByCreatedAtDesc(songs.value);
      }

      await queueSongMutation("upsert", updatedSong);
      if (isOnline.value) {
        void syncSongs();
      }

      return updatedSong;
    } catch (error) {
      setSongsError(error);
      return null;
    } finally {
      updatingSong.value = false;
    }
  };

  const softDeleteSong = async (songId: string) => {
    const userId = requireUserId();
    if (!userId) return null;

    deletingSong.value = true;
    setSongsError(null);

    try {
      const existingSong = await getSongFromIndexedDb(songId);
      if (!existingSong || existingSong.user_id !== userId) {
        throw new Error("Song not found.");
      }

      const deletedSong: Song = {
        ...existingSong,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await saveSongToIndexedDb(deletedSong);
      removeSongFromList(songs.value, songId);
      upsertSongInList(deletedSongs.value, deletedSong);
      deletedSongs.value = [...deletedSongs.value].sort((a, b) => {
        const aDeletedAt = a.deleted_at ? new Date(a.deleted_at).getTime() : 0;
        const bDeletedAt = b.deleted_at ? new Date(b.deleted_at).getTime() : 0;
        return bDeletedAt - aDeletedAt;
      });

      await queueSongMutation("soft_delete", deletedSong);
      if (isOnline.value) {
        void syncSongs();
      }

      return deletedSong;
    } catch (error) {
      setSongsError(error);
      return null;
    } finally {
      deletingSong.value = false;
    }
  };

  const restoreSong = async (songId: string) => {
    const userId = requireUserId();
    if (!userId) return null;

    restoringSong.value = true;
    setSongsError(null);

    try {
      const existingSong = await getSongFromIndexedDb(songId);
      if (!existingSong || existingSong.user_id !== userId) {
        throw new Error("Song not found.");
      }

      const restoredSong: Song = {
        ...existingSong,
        deleted_at: null,
        updated_at: new Date().toISOString(),
      };

      await saveSongToIndexedDb(restoredSong);
      removeSongFromList(deletedSongs.value, songId);
      upsertSongInList(songs.value, restoredSong);
      songs.value = sortSongsByCreatedAtDesc(songs.value);

      await queueSongMutation("restore", restoredSong);
      if (isOnline.value) {
        void syncSongs();
      }

      return restoredSong;
    } catch (error) {
      setSongsError(error);
      return null;
    } finally {
      restoringSong.value = false;
    }
  };

  const resetSongsState = () => {
    songs.value = [];
    deletedSongs.value = [];
    songsError.value = null;
  };

  watch(
    () => userSession.session?.user?.id,
    (userId, previousUserId) => {
      if (!userId || userId !== previousUserId) {
        resetSongsState();
      }
    },
  );

  watch(
    isOnline,
    (online, wasOnline) => {
      if (online && wasOnline === false) {
        void syncSongs();
      }
    },
    { flush: "post" },
  );

  return {
    songs,
    deletedSongs,
    songsError,
    loadingSongs,
    loadingDeletedSongs,
    creatingSong,
    updatingSong,
    deletingSong,
    restoringSong,
    syncingSongs,
    isAuthenticated,
    loadSongs,
    loadDeletedSongs,
    createSong,
    updateSong,
    softDeleteSong,
    restoreSong,
    syncSongs,
    resetSongsState,
  };
}
