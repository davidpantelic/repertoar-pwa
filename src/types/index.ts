export type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type FormValues = { username?: string };
export type FormErrors = Record<string, { message: string }[]>;

export type userCredentials = {
  register: {
    username: string;
    email: string;
    password: string;
    passwordConfirm?: string;
  };
  login: {
    email: string;
    password: string;
    passwordConfirm?: string;
  };
  edit: {
    username: string;
    email: string;
  };
  passwordReset: {
    password: string;
    passwordConfirm?: string;
  };
};

export type ChatProfile = {
  id: string;
  email?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};

export type ChatConversationItem = {
  conversationId: string;
  otherUserId: string;
  otherDisplayName: string;
  otherEmail?: string | null;
  otherAvatarUrl?: string | null;
  lastMessageBody?: string | null;
  lastMessageAt?: string | null;
};

export type ChatListItem = {
  userId: string;
  email: string | null;
  displayName: string;
  avatarUrl?: string | "";
  conversationId: string | null;
  lastMessageBody: string | null;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type WorkView = "songs-view" | "playlists-view";

export type Song = {
  id: string;
  user_id: string;
  name: string;
  artist: string | null;
  note: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SongUpsertPayload = {
  name: string;
  artist?: string | null;
  note?: string | null;
};

export type SongView = {
  id: string;
  name: string;
  artist?: string | null;
  note?: string | null;
};

export type RemoteSongRow = {
  id: string;
  user_id: string;
  name: string;
  artist: string | null;
  note_encrypted: string | null;
  note_iv: string | null;
  note_version: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Playlist = {
  id: string;
  user_id: string;
  name: string;
  note: string | null;
  songs_count: number;
  sort_order: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PlaylistSong = {
  id: string;
  playlist_id: string;
  song_id: string;
  position: number;
  created_at: string;
  updated_at: string;
};

export type NoteKeyMaterial = {
  user_id: string;
  wrapped_key: string;
  key_version: number;
  created_at: string;
  updated_at: string;
};

export type SyncEntity = "song" | "playlist" | "playlist_song";
export type SyncOperation =
  | "upsert"
  | "soft_delete"
  | "restore"
  | "remove"
  | "reorder";

export type SyncQueueItem = {
  id: string;
  entity: SyncEntity;
  operation: SyncOperation;
  record_id: string;
  payload: Record<string, unknown>;
  user_id: string;
  created_at: string;
  retry_count: number;
};
