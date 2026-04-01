import type { ChatConversationItem, ChatMessage } from "@/types";
import { useUserSession } from "@/stores/userSession";

export function useChat() {
  const supabase = useSupabaseClient();
  const userSession = useUserSession();

  const conversations = ref<ChatConversationItem[]>([]);
  const messages = ref<ChatMessage[]>([]);
  const selectedConversationId = ref<string | null>(null);
  const loadingConversations = ref(false);
  const loadingMessages = ref(false);
  const creatingConversation = ref(false);
  const sendingMessage = ref(false);
  const chatError = ref<string | null>(null);

  let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

  const currentUserId = computed(() => userSession.session?.user?.id ?? null);

  const stopRealtime = () => {
    if (!realtimeChannel) return;
    void supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  };

  const startRealtime = () => {
    const userId = currentUserId.value;
    if (!userId) return;

    stopRealtime();

    realtimeChannel = supabase
      .channel(`chat-messages-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          const updatedUserId = payload.new?.id as string | undefined;
          if (!updatedUserId) return;
          const isConversationParticipant = conversations.value.some(
            (c) => c.otherUserId === updatedUserId,
          );
          if (!isConversationParticipant) return;
          void loadConversations();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_participants",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // New conversation membership for this user (e.g. created by another user).
          void loadConversations();
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const row = payload.new as ChatMessage;
          const knownConversation = conversations.value.some(
            (c) => c.conversationId === row.conversation_id,
          );
          if (!knownConversation) {
            // Conversation may be new for this user; refresh conversation list.
            void loadConversations();
            return;
          }

          if (
            selectedConversationId.value === row.conversation_id &&
            !messages.value.some((m) => m.id === row.id)
          ) {
            messages.value.push(row);
          }

          const conv = conversations.value.find(
            (c) => c.conversationId === row.conversation_id,
          );
          if (conv) {
            conv.lastMessageBody = row.body;
            conv.lastMessageAt = row.created_at;
          }
          conversations.value.sort((a, b) =>
            (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""),
          );
        },
      )
      .subscribe((status, err) => {
        // console.log("chat realtime status:", status, err ?? "");
      });
  };

  const loadMessages = async (conversationId: string) => {
    loadingMessages.value = true;
    chatError.value = null;
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, conversation_id, sender_id, body, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(300);
      if (error) throw error;
      messages.value = (data as ChatMessage[]) ?? [];
    } catch (err: any) {
      chatError.value = err?.message ?? "Failed to load messages";
    } finally {
      loadingMessages.value = false;
    }
  };

  const openConversation = async (conversationId: string) => {
    selectedConversationId.value = conversationId;
    await loadMessages(conversationId);
  };

  const loadConversations = async (options?: {
    skipMessageHydration?: boolean;
  }) => {
    const userId = currentUserId.value;
    if (!userId) {
      conversations.value = [];
      selectedConversationId.value = null;
      messages.value = [];
      return;
    }

    loadingConversations.value = true;
    chatError.value = null;
    try {
      const { data: summaries, error: summariesError } = await supabase.rpc(
        "get_chat_conversation_summaries",
      );
      if (summariesError) throw summariesError;

      const items = (summaries ?? []) as Array<{
        conversation_id: string;
        other_user_id: string;
        other_display_name: string | null;
        other_email: string | null;
        other_avatar_url: string | null;
        last_message_body: string | null;
        last_message_at: string | null;
      }>;

      conversations.value = items.map(
        (row): ChatConversationItem => ({
          conversationId: row.conversation_id,
          otherUserId: row.other_user_id,
          otherDisplayName: row.other_display_name || row.other_email || "User",
          otherEmail: row.other_email,
          otherAvatarUrl: row.other_avatar_url,
          lastMessageBody: row.last_message_body,
          lastMessageAt: row.last_message_at,
        }),
      );

      if (!conversations.value.length) {
        conversations.value = [];
        selectedConversationId.value = null;
        messages.value = [];
        return;
      }

      if (
        !options?.skipMessageHydration &&
        selectedConversationId.value &&
        conversations.value.some(
          (c) => c.conversationId === selectedConversationId.value,
        )
      ) {
        await loadMessages(selectedConversationId.value);
      } else {
        selectedConversationId.value = null;
        messages.value = [];
      }
    } catch (err: any) {
      chatError.value = err?.message ?? "Failed to load conversations";
    } finally {
      loadingConversations.value = false;
    }
  };

  const startConversationWithEmail = async (emailInput: string) => {
    const userId = currentUserId.value;
    if (!userId) throw new Error("You must be logged in");

    const email = trimLowerString(emailInput);
    if (!email) throw new Error("Email is required");

    creatingConversation.value = true;
    chatError.value = null;
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, display_name")
        .eq("email", email)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile) throw new Error("User not found");
      if (profile.id === userId) throw new Error("Cannot chat with yourself");

      const { data: conversationId, error: rpcError } = await supabase.rpc(
        "get_or_create_direct_conversation",
        { other_user_id: profile.id },
      );
      if (rpcError) throw rpcError;
      if (!conversationId) throw new Error("Conversation not created");

      await loadConversations({ skipMessageHydration: true });
      await openConversation(conversationId as string);
      startRealtime();
    } catch (err: any) {
      chatError.value = err?.message ?? "Failed to start conversation";
      throw err;
    } finally {
      creatingConversation.value = false;
    }
  };

  const sendMessage = async (bodyInput: string) => {
    const userId = currentUserId.value;
    const conversationId = selectedConversationId.value;
    const body = bodyInput.trim();
    if (!userId || !conversationId || !body) return;

    sendingMessage.value = true;
    chatError.value = null;
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          body,
        })
        .select("id, conversation_id, sender_id, body, created_at")
        .single();
      if (error) throw error;

      const newMessage = data as ChatMessage;
      if (!messages.value.some((m) => m.id === newMessage.id)) {
        messages.value.push(newMessage);
      }

      const conv = conversations.value.find(
        (c) => c.conversationId === conversationId,
      );
      if (conv) {
        conv.lastMessageBody = newMessage.body;
        conv.lastMessageAt = newMessage.created_at;
      }
      conversations.value.sort((a, b) =>
        (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""),
      );
    } catch (err: any) {
      chatError.value = err?.message ?? "Failed to send message";
      throw err;
    } finally {
      sendingMessage.value = false;
    }
  };

  watch(
    () => currentUserId.value,
    async (userId) => {
      if (!userId) {
        stopRealtime();
        conversations.value = [];
        messages.value = [];
        selectedConversationId.value = null;
        return;
      }
      await loadConversations();
      startRealtime();
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    stopRealtime();
  });

  return {
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
  };
}
