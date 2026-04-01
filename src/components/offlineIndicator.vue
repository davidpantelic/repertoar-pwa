<script setup lang="ts">
const toast = useToast();
const { t } = useI18n();
const { offline } = useOffline();
const offlineToastDisplayed = ref(false);

watch(offline, (val) => {
  offlineToastDisplayed.value =
    sessionStorage.getItem("offline_toast_displayed") === "true";
  if (offlineToastDisplayed.value) return;

  if (val) {
    showOfflineToast();
  } else {
    toast.removeGroup("offlineToastGroup");
    toast.add({
      group: "offlineToastGroup",
      severity: "success",
      summary: t("toasts.offlineToastGroup.success.summary"),
      detail: t("toasts.offlineToastGroup.success.detail"),
      life: 3000,
    });
    sessionStorage.setItem("offline_toast_displayed", "true");
  }
});

const showOfflineToast = () => {
  toast.add({
    group: "offlineToastGroup",
    severity: "warn",
    summary: t("toasts.offlineToastGroup.warn.summary"),
    detail: t("toasts.offlineToastGroup.warn.detail"),
    life: 10000,
  });
};
</script>

<template>
  <Transition name="offline-button" appear>
    <Button
      v-if="offline"
      class="offline-indicator"
      icon="pi pi-wifi"
      severity="warn"
      size="large"
      @click="showOfflineToast"
    />
  </Transition>
</template>

<style scoped>
.offline-button-enter-active,
.offline-button-leave-active {
  transition:
    opacity 180ms ease,
    transform 220ms ease;
}

.offline-button-enter-from,
.offline-button-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
