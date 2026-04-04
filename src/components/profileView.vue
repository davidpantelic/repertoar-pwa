<script setup lang="ts">
import { useUserSession } from "../stores/userSession";

const userSessionStore = useUserSession();
const toast = useToast();

const { t } = useI18n();
const editProfileForm = ref(false);
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

const isGoogleUser = computed(() => {
  const user = userSessionStore.session?.user as any;
  if (!user) return false;
  const providers = (user.identities ?? []).map(
    (identity: any) => identity.provider,
  );
  return (
    providers.includes("google") || user.app_metadata?.provider === "google"
  );
});

const showToast = () => {
  toast.removeGroup("resetPasswordRequestToastGroup");
  toast.add({
    group: "resetPasswordRequestToastGroup",
    severity: "info",
    detail: t("googleAuth.googleEmailLocked"),
    life: 4000,
  });
};

watch(
  () => avatarUrl.value,
  () => {
    avatarFailed.value = false;
  },
);
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="font-medium text-center">
      <Avatar
        :image="avatarUrl && !avatarFailed ? avatarUrl : undefined"
        :label="!avatarUrl || avatarFailed ? avatarLabel : undefined"
        size="xlarge"
        class="rounded-sm overflow-hidden"
        @error="avatarFailed = true"
      />
      <h3>
        {{
          userSessionStore.currentProfile?.display_name ??
          userSessionStore.session.user.user_metadata.full_name ??
          userSessionStore.session.user.user_metadata.display_name
        }}
      </h3>
      <h3>
        {{
          userSessionStore.currentProfile?.email ??
          userSessionStore.session.user.email
        }}
      </h3>
    </div>
    <div class="flex flex-col gap-4">
      <!-- <Button
          type="button"
          severity="secondary"
          :label="t('words.refresh')"
          @click="checkSession"
        /> -->

      <EditProfile
        v-if="editProfileForm"
        @close-edit="editProfileForm = false"
      />

      <template v-if="!editProfileForm">
        <Button
          type="button"
          severity="secondary"
          :label="t('userEdit.editButton')"
          icon="pi pi-user-edit"
          icon-pos="right"
          @click="editProfileForm = true"
        />

        <Button
          type="button"
          severity="secondary"
          :class="isGoogleUser ? 'hidden!' : ''"
          @pointerdown="showToast"
          :label="t('words.resetPassword')"
          :icon="
            userSessionStore.isResetPasswordRequestLoading
              ? 'pi pi-spin pi-spinner'
              : 'pi pi-key'
          "
          icon-pos="right"
          @click="userSessionStore.resetPasswordRequest"
        />

        <Button
          type="button"
          severity="danger"
          :label="t('words.logout')"
          :icon="
            userSessionStore.isLoggingOut
              ? 'pi pi-spin pi-spinner'
              : 'pi pi-sign-out'
          "
          icon-pos="right"
          @click="userSessionStore.logOut('local')"
        />

        <LogoutOthersButton />
      </template>
    </div>
  </div>
</template>
