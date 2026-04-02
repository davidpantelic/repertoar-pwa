<script setup lang="ts">
import { useUserSession } from "../stores/userSession";

const userSessionStore = useUserSession();
const toast = useToast();

const { t } = useI18n();
const editProfileForm = ref(false);

const avatarUrl = computed(() => {
  const metadata = userSessionStore.session?.user?.user_metadata ?? {};
  return metadata.avatar_url ?? metadata.picture ?? metadata.photo_url ?? null;
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
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="font-medium text-center">
      <Avatar
        v-if="avatarUrl"
        :image="avatarUrl || undefined"
        size="xlarge"
        class="rounded-sm overflow-hidden"
      />
      <h3>
        {{
          userSessionStore.session.user.user_metadata.full_name ??
          userSessionStore.session.user.user_metadata.display_name
        }}
      </h3>
      <h3>
        {{ userSessionStore.session.user.email }}
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
          :disabled="isGoogleUser"
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
