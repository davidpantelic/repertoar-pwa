<script setup lang="ts">
import { useUserSession } from "../stores/userSession";
import { useMainStore } from "../stores/mainStore";

const { t, locale } = useI18n();
const userSessionStore = useUserSession();
const mainStore = useMainStore();
const avatarFailed = ref(false);

const avatarUrl = computed(() => {
  return userSessionStore.currentProfile?.avatar_url ?? null;
});

const avatarLabel = computed(() => {
  const displayName = userSessionStore.currentProfile?.display_name?.trim();
  const email = userSessionStore.currentProfile?.email?.trim();
  const base = displayName || email || "U";
  return base.charAt(0).toUpperCase();
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
  () => avatarUrl.value,
  () => {
    avatarFailed.value = false;
  },
);

watch(
  () => userSessionStore.session,
  (newSession, oldSession) => {
    // Close dialog only when transitioning from logged-out to logged-in.
    if (!oldSession && newSession) {
      mainStore.profileDialogShow = false;
    }
  },
);
</script>

<template>
  <Button
    :icon="!userSessionStore.session ? 'pi pi-sign-in' : undefined"
    severity="secondary"
    size="large"
    class="p-0!"
    :variant="userSessionStore.session ? 'text' : 'simple'"
    @click="mainStore.profileDialogShow = true"
  >
    <Avatar
      v-if="userSessionStore.session"
      :image="avatarUrl && !avatarFailed ? avatarUrl : undefined"
      :label="!avatarUrl || avatarFailed ? avatarLabel : undefined"
      class="[&>img]:object-contain"
      size="large"
      @error="avatarFailed = true"
    />
  </Button>

  <Dialog
    v-model:visible="mainStore.profileDialogShow"
    modal
    :header="$t('words.profile')"
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
            @click="mainStore.profileDialogShow = false"
          >
            {{ $t("privacyPolicy.title") }}
          </RouterLink>
        </Button>
        <Button asChild v-slot="slotProps" variant="link" size="small">
          <RouterLink
            to="/terms"
            class="p-0! w-fit hover:underline"
            :class="slotProps.class"
            @click="mainStore.profileDialogShow = false"
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
        @click="mainStore.profileDialogShow = false"
      />
    </template>
  </Dialog>

  <Toast group="userSignToastGroup" />
</template>
