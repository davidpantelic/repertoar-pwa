import type { Song, SongUpsertPayload } from "@/types";
import { useUserSession } from "@/stores/userSession";

const songSelect = `
  id,
  user_id,
  name,
  artist,
  note,
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

  const songs = ref<Song[]>([]);
  const deletedSongs = ref<Song[]>([]);
  const loadingSongs = ref(false);
  const loadingDeletedSongs = ref(false);
  const creatingSong = ref(false);
  const updatingSong = ref(false);
  const deletingSong = ref(false);
  const restoringSong = ref(false);
  const songsError = ref<string | null>(null);

  const isAuthenticated = computed(() =>
    Boolean(userSession.session?.user?.id),
  );

  const setSongsError = (error: unknown) => {
    songsError.value =
      error instanceof Error ? error.message : error ? String(error) : null;
  };

  const requireUser = () => {
    if (userSession.session?.user?.id) return true;
    setSongsError("User is not authenticated.");
    return false;
  };

  const sortSongsByCreatedAtDesc = (list: Song[]) =>
    [...list].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

  const loadSongs = async () => {
    if (!requireUser()) return [];

    loadingSongs.value = true;
    setSongsError(null);

    try {
      const { data, error } = await supabase
        .from("songs")
        .select(songSelect)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      songs.value = data ?? [];
      return songs.value;
    } catch (error) {
      setSongsError(error);
      return [];
    } finally {
      loadingSongs.value = false;
    }
  };

  const loadDeletedSongs = async () => {
    if (!requireUser()) return [];

    loadingDeletedSongs.value = true;
    setSongsError(null);

    try {
      const { data, error } = await supabase
        .from("songs")
        .select(songSelect)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (error) throw error;

      deletedSongs.value = data ?? [];
      return deletedSongs.value;
    } catch (error) {
      setSongsError(error);
      return [];
    } finally {
      loadingDeletedSongs.value = false;
    }
  };

  const createSong = async (payload: SongUpsertPayload) => {
    if (!requireUser()) return null;

    creatingSong.value = true;
    setSongsError(null);

    try {
      const normalizedPayload = normalizeSongPayload(payload);
      const { data, error } = await supabase
        .from("songs")
        .insert(normalizedPayload)
        .select(songSelect)
        .single();

      if (error) throw error;

      upsertSongInList(songs.value, data);
      songs.value = sortSongsByCreatedAtDesc(songs.value);
      return data;
    } catch (error) {
      setSongsError(error);
      return null;
    } finally {
      creatingSong.value = false;
    }
  };

  const updateSong = async (songId: string, payload: SongUpsertPayload) => {
    if (!requireUser()) return null;

    updatingSong.value = true;
    setSongsError(null);

    try {
      const normalizedPayload = normalizeSongPayload(payload);
      const { data, error } = await supabase
        .from("songs")
        .update(normalizedPayload)
        .eq("id", songId)
        .select(songSelect)
        .single();

      if (error) throw error;

      if (data.deleted_at) {
        upsertSongInList(deletedSongs.value, data);
        removeSongFromList(songs.value, data.id);
      } else {
        upsertSongInList(songs.value, data);
        removeSongFromList(deletedSongs.value, data.id);
        songs.value = sortSongsByCreatedAtDesc(songs.value);
      }

      return data;
    } catch (error) {
      setSongsError(error);
      return null;
    } finally {
      updatingSong.value = false;
    }
  };

  const softDeleteSong = async (songId: string) => {
    if (!requireUser()) return null;

    deletingSong.value = true;
    setSongsError(null);

    try {
      const { data, error } = await supabase
        .from("songs")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", songId)
        .is("deleted_at", null)
        .select(songSelect)
        .single();

      if (error) throw error;

      removeSongFromList(songs.value, songId);
      upsertSongInList(deletedSongs.value, data);
      deletedSongs.value = [...deletedSongs.value].sort((a, b) => {
        const aDeletedAt = a.deleted_at ? new Date(a.deleted_at).getTime() : 0;
        const bDeletedAt = b.deleted_at ? new Date(b.deleted_at).getTime() : 0;
        return bDeletedAt - aDeletedAt;
      });

      return data;
    } catch (error) {
      setSongsError(error);
      return null;
    } finally {
      deletingSong.value = false;
    }
  };

  const restoreSong = async (songId: string) => {
    if (!requireUser()) return null;

    restoringSong.value = true;
    setSongsError(null);

    try {
      const { data, error } = await supabase
        .from("songs")
        .update({ deleted_at: null })
        .eq("id", songId)
        .not("deleted_at", "is", null)
        .select(songSelect)
        .single();

      if (error) throw error;

      removeSongFromList(deletedSongs.value, songId);
      upsertSongInList(songs.value, data);
      songs.value = sortSongsByCreatedAtDesc(songs.value);

      return data;
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
    isAuthenticated,
    loadSongs,
    loadDeletedSongs,
    createSong,
    updateSong,
    softDeleteSong,
    restoreSong,
    resetSongsState,
  };
}
