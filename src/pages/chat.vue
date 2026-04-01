<script setup lang="ts">
import { useUserSession } from "@/stores/userSession";
import { useChat } from "@/composables/useChat";
import type { ChatListItem } from "@/types";

const userSession = useUserSession();
const { t } = useI18n();
const toast = useToast();

const {
  conversations,
  messages,
  selectedConversationId,
  loadingConversations,
  loadingMessages,
  creatingConversation,
  sendingMessage,
  chatError,
  loadConversations,
  openConversation,
  startConversationWithEmail,
  sendMessage,
} = useChat();

const messageText = ref("");
const messagesPanelRef = ref<any>(null);
const failedAvatars = ref<Record<string, boolean>>({});

const activeConversation = computed(() =>
  conversations.value.find(
    (c) => c.conversationId === selectedConversationId.value,
  ),
);

const selectedUser = computed(() =>
  chatList.value.find(
    (item) => item.conversationId === selectedConversationId.value,
  ),
);

const chatList = computed<ChatListItem[]>(() => {
  const byUserId = new Map<string, ChatListItem>();

  for (const c of conversations.value) {
    byUserId.set(c.otherUserId, {
      userId: c.otherUserId,
      email: c.otherEmail ?? null,
      displayName: c.otherDisplayName || c.otherEmail || "User",
      avatarUrl: c.otherAvatarUrl || "",
      conversationId: c.conversationId,
      lastMessageBody: c.lastMessageBody ?? null,
    });
  }

  for (const user of userSession.allUsers) {
    const existing = byUserId.get(user.id);
    if (existing) {
      byUserId.set(user.id, {
        ...existing,
        email: user.email ?? existing.email,
        displayName:
          user.display_name || user.email || existing.displayName || "User",
        avatarUrl: user.avatar_url ?? existing.avatarUrl,
      });
      continue;
    }

    byUserId.set(user.id, {
      userId: user.id,
      email: user.email ?? null,
      displayName: user.display_name || user.email || "User",
      avatarUrl: user.avatar_url ?? "",
      conversationId: null,
      lastMessageBody: null,
    });
  }

  return Array.from(byUserId.values()).sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );
});

const onStartConversation = async (targetEmail: string) => {
  try {
    await startConversationWithEmail(targetEmail);
  } catch (err: any) {
    toast.add({
      group: "userSignToastGroup",
      severity: "warn",
      summary: "Chat",
      detail: err?.message ?? "Unable to start conversation",
      life: 3000,
    });
  }
};

const onSelectChatItem = async (item: ChatListItem) => {
  if (item.conversationId) {
    await openConversation(item.conversationId);
    return;
  }

  if (!item.email) {
    toast.add({
      group: "userSignToastGroup",
      severity: "warn",
      summary: "Chat",
      detail: "Selected user has no email",
      life: 3000,
    });
    return;
  }

  await onStartConversation(item.email);
};

const onSendMessage = async () => {
  if (!messageText.value.trim()) return;
  try {
    await sendMessage(messageText.value);
    messageText.value = "";
  } catch (err: any) {
    toast.add({
      group: "userSignToastGroup",
      severity: "warn",
      summary: "Chat",
      detail: err?.message ?? "Unable to send message",
      life: 3000,
    });
  }
};

const scrollMessagesToBottom = async () => {
  await nextTick();
  const root = messagesPanelRef.value?.$el as HTMLElement | undefined;
  const content = root?.querySelector(
    ".p-scrollpanel-content",
  ) as HTMLElement | null;
  if (!content) return;
  content.scrollTop = content.scrollHeight;
};

const onAvatarError = (userId: string) => {
  failedAvatars.value[userId] = true;
};

const getInitials = (name?: string | null, email?: string | null) => {
  const base = (name || email || "U").trim();
  return base.slice(0, 1).toUpperCase();
};

onMounted(() => {
  void userSession.getAllUsers();
});

watch(
  messages,
  async () => {
    await scrollMessagesToBottom();
  },
  { deep: true },
);

// const chatList1 = [
//   ...chatList.value,
//   ...chatList.value,
//   ...chatList.value,
//   ...chatList.value,
//   ...chatList.value,
//   ...chatList.value,
//   ...chatList.value,
//   ...chatList.value,
//   ...chatList.value,
// ];
</script>

<template>
  <main class="h-svh min-h-96 pb-0">
    <h1 v-if="!userSession.session">{{ t("form.message.loggedRequired") }}</h1>
    <div v-else class="h-full flex flex-col gap-3 min-h-96 pb-5">
      <h1>Hello {{ userSession.session.user.user_metadata.display_name }}</h1>
      <Panel
        class="h-full min-h-0 [&_.p-panel-header]:hidden! [&_.p-panel-content-container]:h-full [&_.p-panel-content]:h-full [&_.p-panel-content-container]:max-h-full [&_.p-panel-content]:max-h-full [&_.p-panel-content]:pt-4.5!"
      >
        <div class="flex h-full">
          <ScrollPanel
            class="users-chat-scroll-panel grow min-w-52 max-w-full sm:block!"
            :class="!selectedConversationId ? 'block' : 'hidden'"
          >
            <p v-if="!chatList.length" class="text-sm text-muted-color">
              No users
            </p>
            <button
              v-else
              v-for="item in chatList"
              :key="item.userId"
              type="button"
              class="p-2 text-left cursor-pointer border transition-colors rounded-md hover:bg-emphasis flex items-center gap-2 md:gap-3"
              :class="
                item.conversationId &&
                selectedConversationId === item.conversationId
                  ? 'border-primary'
                  : 'border-transparent'
              "
              :disabled="creatingConversation"
              @click="() => void onSelectChatItem(item)"
            >
              <Avatar
                v-if="item.avatarUrl && !failedAvatars[item.userId]"
                :image="item.avatarUrl"
                @error="onAvatarError(item.userId)"
                size="large"
                shape="circle"
                class="aspect-square"
              />
              <Avatar
                v-else
                :label="getInitials(item.displayName, item.email)"
                size="large"
                shape="circle"
                class="aspect-square"
              />
              <div class="min-w-0 flex-1">
                <span class="text-base">{{ item.displayName }}</span>
                <span class="block text-xs text-muted-color truncate">
                  {{ item.lastMessageBody || "Start conversation" }}
                </span>
              </div>
            </button>
          </ScrollPanel>

          <div
            class="flex flex-col sm:transition-all sm:duration-300 overflow-x-hidden"
            :class="selectedConversationId ? 'w-full sm:ml-4' : 'w-0'"
          >
            <div class="sm:hidden pb-4.5 flex items-center gap-2">
              <Button
                icon="pi pi-arrow-left"
                severity="secondary"
                variant="text"
                size="small"
                class="mr-2"
                @click="selectedConversationId = null"
              />
              <Avatar
                v-if="
                  selectedUser?.avatarUrl &&
                  !failedAvatars[selectedUser?.userId]
                "
                :image="selectedUser?.avatarUrl"
                @error="onAvatarError(selectedUser?.userId)"
                size="normal"
                shape="circle"
                class="aspect-square"
              />
              <Avatar
                v-else
                :label="
                  getInitials(selectedUser?.displayName, selectedUser?.email)
                "
                size="normal"
                shape="circle"
                class="aspect-square"
              />
              <span class="text-base">{{
                selectedUser?.displayName || "Conversation"
              }}</span>
            </div>
            <Card class="chat-scroll-card h-full min-h-0">
              <template #content>
                <p v-if="chatError" class="text-sm text-red-500">
                  {{ chatError }}
                </p>
                <div v-else class="flex flex-col gap-5 justify-between h-full">
                  <ScrollPanel
                    ref="messagesPanelRef"
                    class="chat-scroll-panel min-h-0"
                  >
                    <p v-if="loadingMessages" class="text-muted-color">
                      Loading messages...
                    </p>
                    <p v-else-if="!messages.length" class="text-muted-color">
                      No messages yet.
                    </p>
                    <div
                      v-else
                      v-for="message in messages"
                      :key="message.id"
                      class="max-w-[85%] rounded-md p-2"
                      :class="
                        message.sender_id === userSession.session.user.id
                          ? 'self-end bg-primary text-primary-contrast'
                          : 'self-start bg-emphasis'
                      "
                    >
                      <div class="text-sm">{{ message.body }}</div>
                      <div class="text-[10px] opacity-70 mt-1">
                        {{ $d(new Date(message.created_at), "time") }}
                      </div>
                    </div>
                  </ScrollPanel>
                  <InputGroup v-if="selectedConversationId">
                    <InputText
                      v-model="messageText"
                      placeholder="Write a message..."
                      @keydown.enter="onSendMessage"
                    />
                    <Button
                      :icon="
                        sendingMessage ? 'pi pi-spinner pi-spin' : 'pi pi-send'
                      "
                      :disabled="sendingMessage || !messageText.trim()"
                      @click="onSendMessage"
                    />
                  </InputGroup>
                </div>
              </template>
            </Card>
          </div>
        </div>
      </Panel>
    </div>
  </main>
</template>
