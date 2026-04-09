<script setup lang="ts">
import {
  AUTH_CONFIRMATION_REDIRECT_DELAY_MS,
  GOOGLE_AUTH_SESSION_RETRY_DELAY_MS,
} from "@/config/authRedirects";
import { useUserSession } from "@/stores/userSession";

const router = useRouter();
const toast = useToast();
const { t } = useI18n();
const userSession = useUserSession();
const isFinishingAuth = ref(true);

const readHashParams = () => {
  const rawHash = window.location.hash;
  return new URLSearchParams(rawHash.replace(/^#/, ""));
};

const finishGoogleAuth = async () => {
  const hashParams = readHashParams();
  const authError =
    hashParams.get("error_description") ?? hashParams.get("error");

  if (authError) {
    toast.removeGroup("userSignToastGroup");
    toast.add({
      group: "userSignToastGroup",
      severity: "warn",
      summary: t("googleAuth.failedSigning"),
      detail: authError,
      life: 5000,
    });
    await router.replace({ path: "/login" });
    return;
  }

  await userSession.checkSession();

  if (!userSession.session) {
    await new Promise((resolve) =>
      setTimeout(resolve, GOOGLE_AUTH_SESSION_RETRY_DELAY_MS),
    );
    await userSession.checkSession();
  }

  if (userSession.session) {
    toast.removeGroup("userSignToastGroup");
    toast.add({
      group: "userSignToastGroup",
      severity: "success",
      summary: t("googleAuth.pageConfirmationTitle"),
      detail: t("googleAuth.pageConfirmationText"),
      life: AUTH_CONFIRMATION_REDIRECT_DELAY_MS + 4000,
    });

    await router.replace({ path: "/" });
    return;
  }

  toast.removeGroup("userSignToastGroup");
  toast.add({
    group: "userSignToastGroup",
    severity: "warn",
    summary: t("googleAuth.failedSigning"),
    life: 5000,
  });
  await router.replace({ path: "/login" });
};

onMounted(async () => {
  try {
    await finishGoogleAuth();
  } finally {
    isFinishingAuth.value = false;
  }
});
</script>

<template>
  <main class="h-svh flex items-center justify-center text-center">
    <div class="flex flex-col items-center gap-3">
      <i
        v-if="isFinishingAuth"
        class="pi pi-spinner pi-spin text-2xl!"
        aria-hidden="true"
      />
      <h1>{{ $t("googleAuth.pageConfirmationTitle") }}</h1>
      <p>{{ $t("googleAuth.pageConfirmationText") }}</p>
    </div>
  </main>
</template>
