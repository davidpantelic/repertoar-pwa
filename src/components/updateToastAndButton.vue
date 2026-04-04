<script setup lang="ts">
const {
  needRefresh,
  reloadToUpdate,
  dismissUpdate,
  showRefreshToast,
  isApplyingUpdate,
} = usePwaUpdate();

const { t } = useI18n();
const toast = useToast();
const confirmDialog = useConfirm();

watch(showRefreshToast, (val) => {
  if (val) {
    toast.removeGroup("updatePwaToastGroup");
    toast.add({
      group: "updatePwaToastGroup",
      severity: "warn",
      summary: t("toasts.updatePwaToastGroup.warn.summary"),
      detail: t("toasts.updatePwaToastGroup.warn.detail"),
    });
  } else {
    toast.removeGroup("updatePwaToastGroup");
  }
});

const askToReloadToUpdate = () => {
  confirmDialog.require({
    group: "updateConfirm",
    message: t("dialogs.updateDialogConfirm.message"),
    header: t("dialogs.updateDialogConfirm.header"),

    rejectProps: {
      label: t("dialogs.updateDialogConfirm.reject"),
      severity: "secondary",
      outlined: true,
    },
    acceptProps: {
      label: t("dialogs.updateDialogConfirm.accept"),
    },
    accept: () => {
      reloadToUpdate();
    },
    reject: () => {},
  });
};

onMounted(() => {
  const justUpdated = sessionStorage.getItem("pwa_just_updated") === "1";
  if (justUpdated) {
    sessionStorage.removeItem("pwa_just_updated");

    toast.add({
      group: "successUpdateToastGroup",
      severity: "success",
      summary: t("toasts.updatePwaToastGroup.success.summary"),
      life: 3000,
    });
  }
});
</script>

<template>
  <Transition name="update-button" appear>
    <Button
      v-if="!showRefreshToast && needRefresh"
      severity="warn"
      size="large"
      @click="askToReloadToUpdate"
    >
      <IconMslInstallDesktopRounded class="text-xl" />
      <span class="hidden xxs:inline">{{ t("words.update") }}</span>
    </Button>
  </Transition>

  <Toast group="updatePwaToastGroup" @close="dismissUpdate">
    <template #message="{ message }">
      <div class="flex items-start gap-3">
        <div class="flex-1">
          <div class="font-semibold mb-1">{{ message.summary }}</div>
          <div class="text-sm opacity-90">{{ message.detail }}</div>

          <div class="mt-3 flex gap-2">
            <Button
              size="small"
              severity="secondary"
              :label="t('words.later')"
              @click="
                () => {
                  dismissUpdate();
                }
              "
            />
            <Button
              size="small"
              :label="t('words.update')"
              :disabled="isApplyingUpdate"
              :loading="isApplyingUpdate"
              @click="() => void reloadToUpdate()"
            />
          </div>
        </div>
      </div>
    </template>
  </Toast>

  <Toast group="successUpdateToastGroup" />

  <ConfirmDialog group="updateConfirm" class="update-dialog"></ConfirmDialog>
</template>

<style scoped>
.update-button-enter-active,
.update-button-leave-active {
  transition:
    opacity 180ms ease,
    transform 220ms ease;
}

.update-button-enter-from,
.update-button-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
