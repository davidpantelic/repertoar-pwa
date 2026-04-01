<script setup lang="ts">
import { useUserSession } from "@/stores/userSession";

const userSessionStore = useUserSession();
const sendMessage = ref<string | null>(null);
const pushTitle = ref("Test notification");
const pushBody = ref("Hello from Repertoar");
const pushUrl = ref("/");
const toast = useToast();
const { t } = useI18n();
const supabase = useSupabaseClient();

const sendTestPush = async () => {
  sendMessage.value = null;
  userSessionStore.isLoading = true;
  try {
    userSessionStore.checkSession();

    if (!userSessionStore.session || userSessionStore.sessionError) {
      toast.add({
        group: "userSignToastGroup",
        severity: "warn",
        summary: t("words.login"),
        detail: t("form.message.loggedRequired"),
        life: 3000,
      });
      userSessionStore.isLoading = false;
      return;
    }
    const { error } = await supabase.functions.invoke("send-push", {
      // headers: {
      //   Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      // },
      body: {
        title: pushTitle.value,
        body: pushBody.value,
        url: pushUrl.value,
      },
    });

    if (error) throw error;
    sendMessage.value = t("form.message.success");
  } catch (err) {
    sendMessage.value = t("form.message.error");
    console.error(err);
  } finally {
    userSessionStore.isLoading = false;
  }
};
</script>

<template>
  <div>
    <div class="flex flex-col gap-2 max-w-lg">
      <InputText
        v-model="pushTitle"
        :placeholder="t('form.fields.title')"
        maxlength="50"
        fluid
      />
      <InputText
        v-model="pushBody"
        :placeholder="t('form.fields.body')"
        maxlength="200"
        fluid
      />
      <InputText
        v-model="pushUrl"
        maxlength="30"
        :placeholder="t('form.fields.url')"
        fluid
      />
    </div>
    <Button
      class="mt-2"
      :icon="
        userSessionStore.isLoading ? 'pi pi-spinner pi-spin' : 'pi pi-send'
      "
      :label="t('form.fields.button')"
      @click="sendTestPush"
    />
    <div v-if="sendMessage" class="mt-2 text-sm opacity-80">
      {{ sendMessage }}
    </div>
  </div>
</template>
