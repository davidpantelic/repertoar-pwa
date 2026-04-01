<script setup lang="ts">
const router = useRouter();

onMounted(() => {
  const query = new URLSearchParams(window.location.search);
  const shouldDelayRedirect = query.get("redirect_to_home") === "true";

  const isStandalonePwa =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true;

  if (isStandalonePwa) {
    void router.push({ path: "/" });
    return;
  }

  if (shouldDelayRedirect) {
    setTimeout(() => {
      void router.push({ path: "/" });
    }, 6000);
    return;
  }

  void router.push({ path: "/" });
});
</script>

<template>
  <main class="text-center">
    <h1>{{ $t("authConfirmation.title") }}</h1>
    <br />
    <p>{{ $t("authConfirmation.text") }}</p>
  </main>
</template>
