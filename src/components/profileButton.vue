<script setup lang="ts">
import { useUserSession } from "../stores/userSession";

const { t, locale } = useI18n();
const profileDialogShow = ref<boolean>(false);
const userSessionStore = useUserSession();

const avatarUrl = computed(() => {
  const metadata = userSessionStore.session?.user?.user_metadata ?? {};
  return metadata.avatar_url ?? metadata.picture ?? metadata.photo_url ?? null;
});

const userForms = computed(() => {
  const loginWord = t("words.login");
  const registerWord = t("words.register");
  return [loginWord, registerWord];
});

const selectedUserForm = ref(userForms.value[0]);

watch(
  () => locale.value,
  () => {
    selectedUserForm.value = userForms.value[0];
  },
);

watch(
  () => userSessionStore.session,
  (newSession, oldSession) => {
    // Close dialog only when transitioning from logged-out to logged-in.
    if (!oldSession && newSession) {
      profileDialogShow.value = false;
    }
  },
);
</script>

<template>
  <Button
    :icon="userSessionStore.session ? 'pi pi-user' : 'pi pi-sign-in'"
    severity="secondary"
    size="large"
    class="p-0!"
    :variant="avatarUrl ? 'text' : 'simple'"
    @click="profileDialogShow = true"
  >
    <Avatar
      v-if="userSessionStore.session && avatarUrl"
      :image="avatarUrl || undefined"
      size="large"
    />
  </Button>

  <Dialog
    v-model:visible="profileDialogShow"
    modal
    :header="$t('words.profile')"
    class="w-sm max-w-full mt-12!"
    position="top"
  >
    <ProfileView v-if="userSessionStore.session" />

    <div v-if="!userSessionStore.session">
      <SelectButton
        v-model="selectedUserForm"
        :options="userForms"
        :allowEmpty="false"
        fluid
        class="mb-3"
      />

      <GoogleAuthButton />

      <Divider align="center" type="solid">
        {{ $t("words.or") }}
      </Divider>

      <LoginForm v-if="selectedUserForm === userForms[0]" />
      <RegisterForm
        v-if="selectedUserForm === userForms[1]"
        @successful-registration="selectedUserForm = userForms[0]"
      />

      <div class="flex flex-wrap mt-3 justify-center gap-x-5">
        <Button asChild v-slot="slotProps" variant="link" size="small">
          <RouterLink
            to="/privacy"
            class="p-0! w-fit hover:underline"
            :class="slotProps.class"
            @click="profileDialogShow = false"
          >
            {{ $t("privacyPolicy.title") }}
          </RouterLink>
        </Button>
        <Button asChild v-slot="slotProps" variant="link" size="small">
          <RouterLink
            to="/terms"
            class="p-0! w-fit hover:underline"
            :class="slotProps.class"
            @click="profileDialogShow = false"
          >
            {{ $t("termsOfUse.title") }}
          </RouterLink>
        </Button>
      </div>
    </div>

    <template #closebutton>
      <Button
        severity="secondary"
        size="small"
        icon="pi pi-times"
        variant="text"
        @click="profileDialogShow = false"
      />
    </template>
  </Dialog>

  <Toast group="userSignToastGroup" />
</template>
