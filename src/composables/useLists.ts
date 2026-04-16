import type {
  Playlist,
  PlaylistSong,
  PlaylistUpsertPayload,
  Song,
  SyncQueueItem,
} from "@/types";
import { useUserSession } from "@/stores/userSession";
import {
  addSyncQueueItem,
  clearPlaylistsForUser,
  clearPlaylistSongsForPlaylists,
  getPlaylistFromIndexedDb,
  getSongFromIndexedDb,
  listPlaylistsFromIndexedDb,
  listPlaylistSongsFromIndexedDb,
  listSyncQueueItems,
  removePlaylistSongFromIndexedDb,
  removeSyncQueueItem,
  savePlaylistSongToIndexedDb,
  savePlaylistSongsToIndexedDb,
  savePlaylistToIndexedDb,
  savePlaylistsToIndexedDb,
} from "@/composables/useIndexedDb";

const remotePlaylistSelect = `
  id,
  user_id,
  name,
  note,
  songs_count,
  sort_order,
  deleted_at,
  created_at,
  updated_at
`;

const remotePlaylistSongSelect = `
  id,
  playlist_id,
  song_id,
  position,
  created_at,
  updated_at
`;

const normalizePlaylistPayload = (payload: PlaylistUpsertPayload) => ({
  name: payload.name.trim(),
  note: payload.note?.trim() || null,
});

const sortListsAlphabetically = (playlists: Playlist[]) =>
  [...playlists].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );

const sortPlaylistSongsByPosition = (playlistSongs: PlaylistSong[]) =>
  [...playlistSongs].sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

const upsertPlaylistInList = (list: Playlist[], playlist: Playlist) => {
  const existingIndex = list.findIndex((item) => item.id === playlist.id);
  if (existingIndex === -1) {
    list.push(playlist);
    return;
  }

  list.splice(existingIndex, 1, playlist);
};

const removePlaylistFromList = (list: Playlist[], playlistId: string) => {
  const existingIndex = list.findIndex((item) => item.id === playlistId);
  if (existingIndex !== -1) {
    list.splice(existingIndex, 1);
  }
};

export function useLists() {
  const supabase = useSupabaseClient();
  const userSession = useUserSession();
  const isOnline = useOnline();

  const lists = ref<Playlist[]>([]);
  const deletedLists = ref<Playlist[]>([]);
  const listSongs = ref<PlaylistSong[]>([]);
  const loadingLists = ref(false);
  const loadingDeletedLists = ref(false);
  const creatingList = ref(false);
  const updatingList = ref(false);
  const deletingList = ref(false);
  const restoringList = ref(false);
  const mutatingListSongs = ref(false);
  const syncingLists = ref(false);
  const listsError = ref<string | null>(null);

  const isAuthenticated = computed(() =>
    Boolean(userSession.session?.user?.id),
  );

  const setListsError = (error: unknown) => {
    listsError.value =
      error instanceof Error ? error.message : error ? String(error) : null;
  };

  const requireUserId = () => {
    const userId = userSession.session?.user?.id;
    if (userId) return userId;
    setListsError("User is not authenticated.");
    return null;
  };

  const applyListsToState = (
    allLists: Playlist[],
    allListSongs: PlaylistSong[],
  ) => {
    lists.value = sortListsAlphabetically(
      allLists.filter((playlist) => !playlist.deleted_at),
    );
    deletedLists.value = [...allLists]
      .filter((playlist) => Boolean(playlist.deleted_at))
      .sort((a, b) => {
        const aDeletedAt = a.deleted_at ? new Date(a.deleted_at).getTime() : 0;
        const bDeletedAt = b.deleted_at ? new Date(b.deleted_at).getTime() : 0;
        return bDeletedAt - aDeletedAt;
      });
    listSongs.value = sortPlaylistSongsByPosition(allListSongs);
  };

  const readListsFromLocalStore = async (userId: string) => {
    const localLists = await listPlaylistsFromIndexedDb(userId);
    const localListSongs = await listPlaylistSongsFromIndexedDb(
      localLists.map((playlist) => playlist.id),
    );

    applyListsToState(localLists, localListSongs);

    return { localLists, localListSongs };
  };

  const buildRemotePlaylistPayload = (playlist: Playlist) => ({
    id: playlist.id,
    user_id: playlist.user_id,
    name: playlist.name,
    note: playlist.note,
    songs_count: playlist.songs_count,
    sort_order: playlist.sort_order,
    deleted_at: playlist.deleted_at,
    created_at: playlist.created_at,
    updated_at: playlist.updated_at,
  });

  const queueListMutation = async (
    operation: SyncQueueItem["operation"],
    playlist: Playlist,
  ) => {
    await addSyncQueueItem({
      id: crypto.randomUUID(),
      entity: "playlist",
      operation,
      record_id: playlist.id,
      payload: buildRemotePlaylistPayload(playlist),
      user_id: playlist.user_id,
      created_at: new Date().toISOString(),
      retry_count: 0,
    });
  };

  const queueListSongMutation = async (
    operation: SyncQueueItem["operation"],
    playlistSong: PlaylistSong,
    userId: string,
  ) => {
    await addSyncQueueItem({
      id: crypto.randomUUID(),
      entity: "playlist_song",
      operation,
      record_id: playlistSong.id,
      payload: {
        id: playlistSong.id,
        playlist_id: playlistSong.playlist_id,
        song_id: playlistSong.song_id,
        position: playlistSong.position,
        created_at: playlistSong.created_at,
        updated_at: playlistSong.updated_at,
      },
      user_id: userId,
      created_at: new Date().toISOString(),
      retry_count: 0,
    });
  };

  const getActiveListById = async (playlistId: string) => {
    const playlist =
      lists.value.find((item) => item.id === playlistId) ??
      (await getPlaylistFromIndexedDb(playlistId));

    if (!playlist || playlist.deleted_at) {
      throw new Error("List not found.");
    }

    return playlist;
  };

  const getListSongEntries = (playlistId: string) =>
    sortPlaylistSongsByPosition(
      listSongs.value.filter((item) => item.playlist_id === playlistId),
    );

  const refreshListSongCount = async (playlistId: string) => {
    const playlist = await getPlaylistFromIndexedDb(playlistId);
    if (!playlist) return null;

    const nextSongsCount = getListSongEntries(playlistId).length;
    if (playlist.songs_count === nextSongsCount) return playlist;

    const updatedPlaylist: Playlist = {
      ...playlist,
      songs_count: nextSongsCount,
      updated_at: new Date().toISOString(),
    };

    await savePlaylistToIndexedDb(updatedPlaylist);

    if (updatedPlaylist.deleted_at) {
      upsertPlaylistInList(deletedLists.value, updatedPlaylist);
    } else {
      upsertPlaylistInList(lists.value, updatedPlaylist);
      lists.value = sortListsAlphabetically(lists.value);
    }

    await queueListMutation("upsert", updatedPlaylist);
    return updatedPlaylist;
  };

  const bootstrapListsFromRemote = async (userId: string) => {
    const { data: playlistsData, error: playlistsError } = await supabase
      .from("playlists")
      .select(remotePlaylistSelect)
      .eq("user_id", userId);

    if (playlistsError) throw playlistsError;

    const remoteLists = (playlistsData as Playlist[]) ?? [];
    const remoteListIds = remoteLists.map((playlist) => playlist.id);

    const { localLists } = await readListsFromLocalStore(userId);
    const localListIds = localLists.map((playlist) => playlist.id);
    const playlistIdsToClear = [
      ...new Set([...localListIds, ...remoteListIds]),
    ];

    let remoteListSongs: PlaylistSong[] = [];
    if (remoteListIds.length > 0) {
      const { data: playlistSongsData, error: playlistSongsError } =
        await supabase
          .from("playlist_songs")
          .select(remotePlaylistSongSelect)
          .in("playlist_id", remoteListIds);

      if (playlistSongsError) throw playlistSongsError;
      remoteListSongs = (playlistSongsData as PlaylistSong[]) ?? [];
    }

    await clearPlaylistsForUser(userId);
    await clearPlaylistSongsForPlaylists(playlistIdsToClear);
    await savePlaylistsToIndexedDb(remoteLists);
    await savePlaylistSongsToIndexedDb(remoteListSongs);

    applyListsToState(remoteLists, remoteListSongs);

    return { remoteLists, remoteListSongs };
  };

  const syncLists = async () => {
    const userId = requireUserId();
    if (!userId || !isOnline.value || syncingLists.value) return;

    syncingLists.value = true;
    setListsError(null);

    try {
      const queueItems = await listSyncQueueItems(userId);
      const playlistQueue = queueItems.filter(
        (item) => item.entity === "playlist",
      );
      const playlistSongQueue = queueItems.filter(
        (item) => item.entity === "playlist_song",
      );

      for (const item of playlistQueue) {
        const { error } = await supabase
          .from("playlists")
          .upsert(item.payload, { onConflict: "id" });

        if (error) throw error;
        await removeSyncQueueItem(item.id);
      }

      for (const item of playlistSongQueue) {
        if (item.operation === "remove") {
          const { error } = await supabase
            .from("playlist_songs")
            .delete()
            .eq("id", item.record_id);

          if (error) throw error;
          await removeSyncQueueItem(item.id);
          continue;
        }

        const { error } = await supabase
          .from("playlist_songs")
          .upsert(item.payload, { onConflict: "id" });

        if (error) throw error;
        await removeSyncQueueItem(item.id);
      }

      const pendingListQueue = (await listSyncQueueItems(userId)).filter(
        (item) => item.entity === "playlist" || item.entity === "playlist_song",
      );

      if (pendingListQueue.length > 0) return;

      await bootstrapListsFromRemote(userId);
    } catch (error) {
      setListsError(error);
    } finally {
      syncingLists.value = false;
    }
  };

  const loadLists = async (options?: { sync?: boolean }) => {
    const userId = requireUserId();
    if (!userId) return [];

    loadingLists.value = true;
    setListsError(null);

    try {
      const { localLists } = await readListsFromLocalStore(userId);

      if (localLists.length === 0 && isOnline.value) {
        await bootstrapListsFromRemote(userId);
      }

      if (isOnline.value && options?.sync !== false) {
        void syncLists();
      }

      return lists.value;
    } catch (error) {
      setListsError(error);
      return [];
    } finally {
      loadingLists.value = false;
    }
  };

  const loadDeletedLists = async () => {
    const userId = requireUserId();
    if (!userId) return [];

    loadingDeletedLists.value = true;
    setListsError(null);

    try {
      const { localLists } = await readListsFromLocalStore(userId);

      if (localLists.length === 0 && isOnline.value) {
        await bootstrapListsFromRemote(userId);
      }

      return deletedLists.value;
    } catch (error) {
      setListsError(error);
      return [];
    } finally {
      loadingDeletedLists.value = false;
    }
  };

  const createList = async (payload: PlaylistUpsertPayload) => {
    const userId = requireUserId();
    if (!userId) return null;

    creatingList.value = true;
    setListsError(null);

    try {
      const normalizedPayload = normalizePlaylistPayload(payload);
      const nowIso = new Date().toISOString();
      const localPlaylist: Playlist = {
        id: crypto.randomUUID(),
        user_id: userId,
        name: normalizedPayload.name,
        note: normalizedPayload.note,
        songs_count: 0,
        sort_order: 0,
        deleted_at: null,
        created_at: nowIso,
        updated_at: nowIso,
      };

      await savePlaylistToIndexedDb(localPlaylist);
      upsertPlaylistInList(lists.value, localPlaylist);
      lists.value = sortListsAlphabetically(lists.value);

      await queueListMutation("upsert", localPlaylist);
      if (isOnline.value) {
        void syncLists();
      }

      return localPlaylist;
    } catch (error) {
      setListsError(error);
      return null;
    } finally {
      creatingList.value = false;
    }
  };

  const renameList = async (
    playlistId: string,
    payload: PlaylistUpsertPayload,
  ) => {
    const userId = requireUserId();
    if (!userId) return null;

    updatingList.value = true;
    setListsError(null);

    try {
      const existingPlaylist = await getActiveListById(playlistId);
      if (existingPlaylist.user_id !== userId) {
        throw new Error("List not found.");
      }

      const normalizedPayload = normalizePlaylistPayload(payload);
      const updatedPlaylist: Playlist = {
        ...existingPlaylist,
        name: normalizedPayload.name,
        note: normalizedPayload.note,
        updated_at: new Date().toISOString(),
      };

      await savePlaylistToIndexedDb(updatedPlaylist);
      upsertPlaylistInList(lists.value, updatedPlaylist);
      lists.value = sortListsAlphabetically(lists.value);

      await queueListMutation("upsert", updatedPlaylist);
      if (isOnline.value) {
        void syncLists();
      }

      return updatedPlaylist;
    } catch (error) {
      setListsError(error);
      return null;
    } finally {
      updatingList.value = false;
    }
  };

  const softDeleteList = async (playlistId: string) => {
    const userId = requireUserId();
    if (!userId) return null;

    deletingList.value = true;
    setListsError(null);

    try {
      const existingPlaylist = await getActiveListById(playlistId);
      if (existingPlaylist.user_id !== userId) {
        throw new Error("List not found.");
      }

      const deletedPlaylist: Playlist = {
        ...existingPlaylist,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await savePlaylistToIndexedDb(deletedPlaylist);
      removePlaylistFromList(lists.value, playlistId);
      upsertPlaylistInList(deletedLists.value, deletedPlaylist);
      deletedLists.value = [...deletedLists.value].sort((a, b) => {
        const aDeletedAt = a.deleted_at ? new Date(a.deleted_at).getTime() : 0;
        const bDeletedAt = b.deleted_at ? new Date(b.deleted_at).getTime() : 0;
        return bDeletedAt - aDeletedAt;
      });

      await queueListMutation("soft_delete", deletedPlaylist);
      if (isOnline.value) {
        void syncLists();
      }

      return deletedPlaylist;
    } catch (error) {
      setListsError(error);
      return null;
    } finally {
      deletingList.value = false;
    }
  };

  const restoreList = async (playlistId: string) => {
    const userId = requireUserId();
    if (!userId) return null;

    restoringList.value = true;
    setListsError(null);

    try {
      const existingPlaylist = await getPlaylistFromIndexedDb(playlistId);
      if (!existingPlaylist || existingPlaylist.user_id !== userId) {
        throw new Error("List not found.");
      }

      const restoredPlaylist: Playlist = {
        ...existingPlaylist,
        deleted_at: null,
        updated_at: new Date().toISOString(),
      };

      await savePlaylistToIndexedDb(restoredPlaylist);
      removePlaylistFromList(deletedLists.value, playlistId);
      upsertPlaylistInList(lists.value, restoredPlaylist);
      lists.value = sortListsAlphabetically(lists.value);

      await queueListMutation("restore", restoredPlaylist);
      if (isOnline.value) {
        void syncLists();
      }

      return restoredPlaylist;
    } catch (error) {
      setListsError(error);
      return null;
    } finally {
      restoringList.value = false;
    }
  };

  const addSongToList = async (playlistId: string, songId: string) => {
    const userId = requireUserId();
    if (!userId) return null;

    mutatingListSongs.value = true;
    setListsError(null);

    try {
      const playlist = await getActiveListById(playlistId);
      const song = await getSongFromIndexedDb(songId);

      if (!song || song.user_id !== userId || song.deleted_at) {
        throw new Error("Song not found.");
      }

      const existingPlaylistSong = getListSongEntries(playlistId).find(
        (item) => item.song_id === songId,
      );

      if (existingPlaylistSong) {
        return existingPlaylistSong;
      }

      const nowIso = new Date().toISOString();
      const nextPosition = getListSongEntries(playlistId).length;
      const playlistSong: PlaylistSong = {
        id: crypto.randomUUID(),
        playlist_id: playlist.id,
        song_id: songId,
        position: nextPosition,
        created_at: nowIso,
        updated_at: nowIso,
      };

      await savePlaylistSongToIndexedDb(playlistSong);
      listSongs.value = sortPlaylistSongsByPosition([
        ...listSongs.value,
        playlistSong,
      ]);

      await refreshListSongCount(playlistId);
      await queueListSongMutation("upsert", playlistSong, userId);

      if (isOnline.value) {
        void syncLists();
      }

      return playlistSong;
    } catch (error) {
      setListsError(error);
      return null;
    } finally {
      mutatingListSongs.value = false;
    }
  };

  const removeSongFromList = async (playlistId: string, songId: string) => {
    const userId = requireUserId();
    if (!userId) return false;

    mutatingListSongs.value = true;
    setListsError(null);

    try {
      await getActiveListById(playlistId);

      const currentEntries = getListSongEntries(playlistId);
      const targetEntry = currentEntries.find(
        (item) => item.song_id === songId,
      );
      if (!targetEntry) {
        throw new Error("Song is not in the list.");
      }

      await removePlaylistSongFromIndexedDb(targetEntry.id);
      listSongs.value = listSongs.value.filter(
        (item) => item.id !== targetEntry.id,
      );

      const reorderedEntries = currentEntries
        .filter((item) => item.id !== targetEntry.id)
        .map((item, index) =>
          item.position === index
            ? item
            : {
                ...item,
                position: index,
                updated_at: new Date().toISOString(),
              },
        );

      const changedEntries = reorderedEntries.filter((item, index) => {
        const previousEntry = currentEntries.filter(
          (entry) => entry.id !== targetEntry.id,
        )[index];
        return previousEntry && previousEntry.position !== item.position;
      });

      if (changedEntries.length > 0) {
        await savePlaylistSongsToIndexedDb(changedEntries);
        listSongs.value = sortPlaylistSongsByPosition([
          ...listSongs.value.filter((item) => item.playlist_id !== playlistId),
          ...reorderedEntries,
        ]);
      }

      await addSyncQueueItem({
        id: crypto.randomUUID(),
        entity: "playlist_song",
        operation: "remove",
        record_id: targetEntry.id,
        payload: {},
        user_id: userId,
        created_at: new Date().toISOString(),
        retry_count: 0,
      });

      for (const changedEntry of changedEntries) {
        await queueListSongMutation("upsert", changedEntry, userId);
      }

      await refreshListSongCount(playlistId);

      if (isOnline.value) {
        void syncLists();
      }

      return true;
    } catch (error) {
      setListsError(error);
      return false;
    } finally {
      mutatingListSongs.value = false;
    }
  };

  const reorderSongsInList = async (
    playlistId: string,
    orderedSongIds: string[],
  ) => {
    const userId = requireUserId();
    if (!userId) return [];

    mutatingListSongs.value = true;
    setListsError(null);

    try {
      await getActiveListById(playlistId);

      const currentEntries = getListSongEntries(playlistId);
      if (currentEntries.length !== orderedSongIds.length) {
        throw new Error("Song order does not match current list state.");
      }

      const songIdSet = new Set(currentEntries.map((entry) => entry.song_id));
      const orderedSongIdSet = new Set(orderedSongIds);
      if (
        songIdSet.size !== orderedSongIdSet.size ||
        [...songIdSet].some((songId) => !orderedSongIdSet.has(songId))
      ) {
        throw new Error("Song order contains invalid list items.");
      }

      const orderedEntries = orderedSongIds.map((songId, index) => {
        const existingEntry = currentEntries.find(
          (entry) => entry.song_id === songId,
        );
        if (!existingEntry) {
          throw new Error("Song order contains invalid list items.");
        }

        return existingEntry.position === index
          ? existingEntry
          : {
              ...existingEntry,
              position: index,
              updated_at: new Date().toISOString(),
            };
      });

      const changedEntries = orderedEntries.filter((entry, index) => {
        const previousEntry = currentEntries[index];
        return (
          previousEntry?.id !== entry.id ||
          previousEntry.position !== entry.position
        );
      });

      if (changedEntries.length === 0) {
        return orderedEntries;
      }

      await savePlaylistSongsToIndexedDb(changedEntries);
      listSongs.value = sortPlaylistSongsByPosition([
        ...listSongs.value.filter((item) => item.playlist_id !== playlistId),
        ...orderedEntries,
      ]);

      for (const changedEntry of changedEntries) {
        await queueListSongMutation("upsert", changedEntry, userId);
      }

      if (isOnline.value) {
        void syncLists();
      }

      return orderedEntries;
    } catch (error) {
      setListsError(error);
      return [];
    } finally {
      mutatingListSongs.value = false;
    }
  };

  const getSongsForList = async (playlistId: string): Promise<Song[]> => {
    const entries = getListSongEntries(playlistId);
    const songsForList = await Promise.all(
      entries.map((entry) => getSongFromIndexedDb(entry.song_id)),
    );

    return songsForList.filter((song): song is Song =>
      Boolean(song && !song.deleted_at),
    );
  };

  const getListsForSong = (songId: string) => {
    const linkedListIds = new Set(
      listSongs.value
        .filter((item) => item.song_id === songId)
        .map((item) => item.playlist_id),
    );

    return lists.value.filter((playlist) => linkedListIds.has(playlist.id));
  };

  const resetListsState = () => {
    lists.value = [];
    deletedLists.value = [];
    listSongs.value = [];
    listsError.value = null;
  };

  watch(
    () => userSession.session?.user?.id,
    (userId, previousUserId) => {
      if (!userId || userId !== previousUserId) {
        resetListsState();
      }
    },
  );

  watch(
    isOnline,
    (online, wasOnline) => {
      if (online && wasOnline === false) {
        void syncLists();
      }
    },
    { flush: "post" },
  );

  return {
    lists,
    deletedLists,
    listSongs,
    listsError,
    loadingLists,
    loadingDeletedLists,
    creatingList,
    updatingList,
    deletingList,
    restoringList,
    mutatingListSongs,
    syncingLists,
    isAuthenticated,
    loadLists,
    loadDeletedLists,
    createList,
    renameList,
    softDeleteList,
    restoreList,
    addSongToList,
    removeSongFromList,
    reorderSongsInList,
    getListSongEntries,
    getSongsForList,
    getListsForSong,
    syncLists,
    resetListsState,
  };
}
