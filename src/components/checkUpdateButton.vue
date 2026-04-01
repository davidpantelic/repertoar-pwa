<script setup lang="ts">
const { checkForUpdate, needRefresh, showRefreshToast } = usePwaUpdate();
const toast = useToast();
const checking = ref(false);
const { t } = useI18n();

const onCheckForUpdate = async () => {
  if (checking.value) return;
  checking.value = true;

  const hasUpdate = await checkForUpdate();
  if (!hasUpdate && !needRefresh.value && !showRefreshToast.value) {
    toast.add({
      group: "upToDateToastGroup",
      severity: "success",
      summary: t("toasts.upToDateToastGroup.success.summary"),
      detail: t("toasts.upToDateToastGroup.success.detail"),
      life: 3000,
    });
  }

  checking.value = false;
};
</script>

<template>
  <Transition name="update-check-button" appear>
    <Button
      :icon="checking ? 'pi pi-spinner pi-spin' : ''"
      class="w-12 h-12.25 p-0!"
      severity="secondary"
      size="large"
      :disabled="checking"
      @click="onCheckForUpdate"
    >
      <IconMslInstallDesktopRounded v-if="!checking" />
    </Button>
  </Transition>
</template>

<style scoped>
.update-check-button-enter-active,
.update-check-button-leave-active {
  transition:
    opacity 180ms ease,
    transform 220ms ease;
}

.update-check-button-enter-from,
.update-check-button-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
