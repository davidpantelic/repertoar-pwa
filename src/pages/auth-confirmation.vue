<script setup lang="ts">
import { AUTH_CONFIRMATION_REDIRECT_DELAY_MS } from "@/config/authRedirects";

const router = useRouter();

onMounted(() => {
  const query = new URLSearchParams(window.location.search);
  const shouldDelayRedirect = query.get("redirect_to_home") === "true";

  if (shouldDelayRedirect) {
    setTimeout(() => {
      void router.replace({ path: "/" });
    }, AUTH_CONFIRMATION_REDIRECT_DELAY_MS);
    return;
  }

  void router.replace({ path: "/" });
});
</script>

<template>
  <main class="text-center h-svh flex items-center justify-center">
    <div class="flex flex-col items-center gap-3">
      <i class="pi pi-check-circle text-2xl!" aria-hidden="true" />
      <h1>{{ $t("authConfirmation.title") }}</h1>
      <p>{{ $t("authConfirmation.text") }}</p>
    </div>
  </main>
</template>
