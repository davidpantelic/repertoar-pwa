export type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type FormValues = { username?: string };
export type FormErrors = Record<string, { message: string }[]>;

export type AppRecord = {
  id: string;
  user_id?: string;
  title: string;
  body?: string;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string | null;
  deletedAt?: string | null;
};

export type StorageKind = "local" | "remote";

export type StorageAdapter = {
  kind: StorageKind;
  create: (record: AppRecord) => Promise<void>;
  update: (record: AppRecord) => Promise<void>;
  remove: (id: string) => Promise<void>;
  getById: (id: string) => Promise<AppRecord | null>;
  list: () => Promise<AppRecord[]>;
};

export type QueueOperation = "upsert";

export type QueueItem = {
  id: string;
  type: QueueOperation;
  record: AppRecord;
  createdAt: string;
  retries: number;
};

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
