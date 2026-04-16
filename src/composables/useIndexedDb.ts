import { openDB } from "idb";
import type { Playlist, PlaylistSong, Song, SyncQueueItem } from "@/types";

const DB_NAME = "repertoar-pwa";
const DB_VERSION = 3;
const SONGS_STORE = "songs";
const PLAYLISTS_STORE = "playlists";
const PLAYLIST_SONGS_STORE = "playlist_songs";
const SYNC_QUEUE_STORE = "sync_queue";
const APP_META_STORE = "app_meta";

const getDb = () =>
  openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(SONGS_STORE)) {
        const songsStore = db.createObjectStore(SONGS_STORE, { keyPath: "id" });
        songsStore.createIndex("by_user_id", "user_id");
        songsStore.createIndex("by_user_deleted_at", ["user_id", "deleted_at"]);
      }
      if (!db.objectStoreNames.contains(PLAYLISTS_STORE)) {
        const playlistsStore = db.createObjectStore(PLAYLISTS_STORE, {
          keyPath: "id",
        });
        playlistsStore.createIndex("by_user_id", "user_id");
        playlistsStore.createIndex("by_user_deleted_at", [
          "user_id",
          "deleted_at",
        ]);
      }
      if (!db.objectStoreNames.contains(PLAYLIST_SONGS_STORE)) {
        const playlistSongsStore = db.createObjectStore(PLAYLIST_SONGS_STORE, {
          keyPath: "id",
        });
        playlistSongsStore.createIndex("by_playlist_id", "playlist_id");
        playlistSongsStore.createIndex("by_song_id", "song_id");
      }
      if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
        const syncQueueStore = db.createObjectStore(SYNC_QUEUE_STORE, {
          keyPath: "id",
        });
        syncQueueStore.createIndex("by_user_id", "user_id");
        syncQueueStore.createIndex("by_entity", "entity");
      }
      if (!db.objectStoreNames.contains(APP_META_STORE)) {
        db.createObjectStore(APP_META_STORE, { keyPath: "key" });
      }
    },
  });

export async function saveSongToIndexedDb(song: Song) {
  const db = await getDb();
  await db.put(SONGS_STORE, song);
}

export async function saveSongsToIndexedDb(songs: Song[]) {
  const db = await getDb();
  const tx = db.transaction(SONGS_STORE, "readwrite");
  for (const song of songs) {
    await tx.store.put(song);
  }
  await tx.done;
}

export async function listSongsFromIndexedDb(userId: string): Promise<Song[]> {
  const db = await getDb();
  const allSongs = await db.getAll(SONGS_STORE);
  return allSongs.filter((song) => song.user_id === userId);
}

export async function getSongFromIndexedDb(songId: string): Promise<Song | null> {
  const db = await getDb();
  return (await db.get(SONGS_STORE, songId)) ?? null;
}

export async function removeSongFromIndexedDb(songId: string) {
  const db = await getDb();
  await db.delete(SONGS_STORE, songId);
}

export async function clearSongsForUser(userId: string) {
  const db = await getDb();
  const allSongs = await db.getAll(SONGS_STORE);
  const tx = db.transaction(SONGS_STORE, "readwrite");
  for (const song of allSongs) {
    if (song.user_id === userId) {
      await tx.store.delete(song.id);
    }
  }
  await tx.done;
}

export async function savePlaylistToIndexedDb(playlist: Playlist) {
  const db = await getDb();
  await db.put(PLAYLISTS_STORE, playlist);
}

export async function savePlaylistsToIndexedDb(playlists: Playlist[]) {
  const db = await getDb();
  const tx = db.transaction(PLAYLISTS_STORE, "readwrite");
  for (const playlist of playlists) {
    await tx.store.put(playlist);
  }
  await tx.done;
}

export async function listPlaylistsFromIndexedDb(
  userId: string,
): Promise<Playlist[]> {
  const db = await getDb();
  const allPlaylists = await db.getAll(PLAYLISTS_STORE);
  return allPlaylists.filter((playlist) => playlist.user_id === userId);
}

export async function getPlaylistFromIndexedDb(
  playlistId: string,
): Promise<Playlist | null> {
  const db = await getDb();
  return (await db.get(PLAYLISTS_STORE, playlistId)) ?? null;
}

export async function removePlaylistFromIndexedDb(playlistId: string) {
  const db = await getDb();
  await db.delete(PLAYLISTS_STORE, playlistId);
}

export async function clearPlaylistsForUser(userId: string) {
  const db = await getDb();
  const allPlaylists = await db.getAll(PLAYLISTS_STORE);
  const tx = db.transaction(PLAYLISTS_STORE, "readwrite");
  for (const playlist of allPlaylists) {
    if (playlist.user_id === userId) {
      await tx.store.delete(playlist.id);
    }
  }
  await tx.done;
}

export async function savePlaylistSongToIndexedDb(playlistSong: PlaylistSong) {
  const db = await getDb();
  await db.put(PLAYLIST_SONGS_STORE, playlistSong);
}

export async function savePlaylistSongsToIndexedDb(
  playlistSongs: PlaylistSong[],
) {
  const db = await getDb();
  const tx = db.transaction(PLAYLIST_SONGS_STORE, "readwrite");
  for (const playlistSong of playlistSongs) {
    await tx.store.put(playlistSong);
  }
  await tx.done;
}

export async function listPlaylistSongsFromIndexedDb(
  playlistIds?: string[],
): Promise<PlaylistSong[]> {
  const db = await getDb();
  const allPlaylistSongs = await db.getAll(PLAYLIST_SONGS_STORE);
  if (!playlistIds?.length) return allPlaylistSongs;

  const playlistIdSet = new Set(playlistIds);
  return allPlaylistSongs.filter((playlistSong) =>
    playlistIdSet.has(playlistSong.playlist_id),
  );
}

export async function getPlaylistSongFromIndexedDb(
  playlistSongId: string,
): Promise<PlaylistSong | null> {
  const db = await getDb();
  return (await db.get(PLAYLIST_SONGS_STORE, playlistSongId)) ?? null;
}

export async function removePlaylistSongFromIndexedDb(playlistSongId: string) {
  const db = await getDb();
  await db.delete(PLAYLIST_SONGS_STORE, playlistSongId);
}

export async function clearPlaylistSongsForPlaylists(playlistIds: string[]) {
  if (!playlistIds.length) return;

  const playlistIdSet = new Set(playlistIds);
  const db = await getDb();
  const allPlaylistSongs = await db.getAll(PLAYLIST_SONGS_STORE);
  const tx = db.transaction(PLAYLIST_SONGS_STORE, "readwrite");

  for (const playlistSong of allPlaylistSongs) {
    if (playlistIdSet.has(playlistSong.playlist_id)) {
      await tx.store.delete(playlistSong.id);
    }
  }

  await tx.done;
}

export async function addSyncQueueItem(item: SyncQueueItem) {
  const db = await getDb();
  await db.put(SYNC_QUEUE_STORE, item);
}

export async function listSyncQueueItems(
  userId?: string,
): Promise<SyncQueueItem[]> {
  const db = await getDb();
  const items = await db.getAll(SYNC_QUEUE_STORE);
  if (!userId) return items;
  return items.filter((item) => item.user_id === userId);
}

export async function removeSyncQueueItem(id: string) {
  const db = await getDb();
  await db.delete(SYNC_QUEUE_STORE, id);
}

export async function setAppMetaValue<T>(key: string, value: T) {
  const db = await getDb();
  await db.put(APP_META_STORE, { key, value });
}

export async function getAppMetaValue<T>(key: string): Promise<T | null> {
  const db = await getDb();
  const record = await db.get(APP_META_STORE, key);
  return record?.value ?? null;
}
