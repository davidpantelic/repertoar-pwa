<script setup lang="ts">
import { useUserSession } from "../stores/userSession";

const userSessionStore = useUserSession();
const router = useRouter();

const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
const queryMessage = hashParams.get("message");

if (!queryMessage && !isLocalhost) {
  await userSessionStore.logOut("global", { silent: true });
  // await userSessionStore.checkSession();

  setTimeout(() => {
    void router.push({ path: "/" });
  }, 6000);
}
</script>

<template>
  <main class="text-center">
    <h1>{{ $t("authConfirmation.title") }}</h1>
    <br />
    <p v-if="queryMessage">{{ $t("userEdit.editEmailVerificationOne") }}</p>
    <p v-else>{{ $t("userEdit.editEmailVerificationBoth") }}</p>
  </main>
</template>
