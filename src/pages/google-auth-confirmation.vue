<script setup lang="ts">
const router = useRouter();
const toast = useToast();
const { t } = useI18n();

onMounted(() => {
  const rawHash = window.location.hash; // includes #access_token...
  const hashParams = new URLSearchParams(rawHash.replace(/^#/, ""));

  const accessToken = hashParams.get("access_token");
  const providerToken = hashParams.get("provider_token");
  const error = hashParams.get("error_description");

  setTimeout(() => {
    console.log("setTimeout");
    router.push({ path: "/" });

    if (accessToken && providerToken && !error) {
      toast.removeGroup("userSignToastGroup");
      toast.add({
        group: "userSignToastGroup",
        severity: "success",
        summary: t("googleAuth.pageConfirmationTitle"),
        detail: t("googleAuth.pageConfirmationText"),
        life: 7000,
      });
    }
  }, 200);
});
</script>

<template></template>
