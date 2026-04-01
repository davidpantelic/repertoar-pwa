<script setup lang="ts">
const toast = useToast();
const { t } = useI18n();

const {
  canPromptInstall,
  shouldShowInstallUI,
  promptInstall,
  dismissForNow,
  isStandalone,
  isInstalled,
} = useInstallPrompt();
useInstallPrompt();

const cookies = useCookies(["webdak-pwa-cookie"]);

const isInstallToastVisible = ref(false);
const showInstallButton = ref(false);
const toastManuallyClosed = ref(false);
const installDialogVisible = ref(false);
const waitAfterMounted = ref(false);
const installButtonClicked = ref(false);
const hideInstallButton = ref(false);

const showInstallToast = () => {
  if (isInstallToastVisible.value) return;
  toast.add({
    group: "installToastGroup",
    severity: "secondary",
    summary: t("toasts.installToastGroup.secondary.summary"),
    detail: t("toasts.installToastGroup.secondary.detail"),
  });
  isInstallToastVisible.value = true;
};

// show / hide toast
watchEffect(() => {
  if (shouldShowInstallUI.value) {
    if (!toastManuallyClosed.value) {
      showInstallToast();
      showInstallButton.value = false;
    } else {
      showInstallButton.value = !isStandalone.value && !isInstalled.value;
    }
  } else {
    toast.removeGroup("installToastGroup");
    isInstallToastVisible.value = false;
    showInstallButton.value = !isStandalone.value && !isInstalled.value;
    toastManuallyClosed.value = false;
  }
});

async function onInstallClick() {
  installButtonClicked.value = true;
  sessionStorage.setItem("install_button_clicked", "1");

  if (!canPromptInstall.value) {
    installDialogVisible.value = true;
    return;
  }
  const res = await promptInstall({ suppressDismiss: true });
  if (res.outcome === "accepted") {
    toast.add({
      group: "successInstallToastGroup",
      severity: "success",
      summary: t("toasts.installToastGroup.success.summary"),
      detail: t("toasts.installToastGroup.success.detail"),
      life: 6000,
    });
  }
}

const onCancelClick = () => {
  toast.removeGroup("installToastGroup");
  dismissForNow();
};

onMounted(() => {
  installButtonClicked.value =
    sessionStorage.getItem("install_button_clicked") === "1";

  hideInstallButton.value =
    cookies.get("webdak-pwa-cookie") === "install-button-clicked";
  setTimeout(() => {
    waitAfterMounted.value = true;
  }, 500);
});

const copied = ref(false);
const copyAppLink = async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    copied.value = true;

    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (e) {
    console.error("Copy failed", e);
  }
};

const hideInstallButtonManually = () => {
  hideInstallButton.value = true;
  cookies.set(
    "webdak-pwa-cookie",
    "install-button-clicked",
    { maxAge: 3600 }, // s
  );
};
</script>

<template>
  <Transition name="install-button" appear>
    <Button
      v-if="waitAfterMounted && showInstallButton && !hideInstallButton"
      severity="primary"
      size="large"
      @click="onInstallClick"
    >
      <IconMslInstallDesktopRounded class="text-xl" />
      <span v-if="!installButtonClicked" class="hidden xxs:inline">{{
        t("words.install")
      }}</span>
    </Button>
  </Transition>

  <Toast
    group="installToastGroup"
    @close="
      showInstallButton = true;
      isInstallToastVisible = false;
      toastManuallyClosed = true;
    "
  >
    <template #message="{ message }">
      <div class="flex items-start gap-3">
        <div class="flex-1">
          <div class="font-semibold mb-1">{{ message.summary }}</div>
          <div class="text-sm opacity-90">{{ message.detail }}</div>

          <div class="mt-3 flex gap-2">
            <Button
              size="small"
              severity="secondary"
              :label="t('words.notNow')"
              outlined
              @click="onCancelClick"
            />
            <Button
              size="small"
              :label="t('words.install')"
              @click="onInstallClick"
            />
          </div>
        </div>
      </div>
    </template>
  </Toast>

  <Toast group="successInstallToastGroup" />

  <Dialog
    class="install-instructions-dialog"
    v-model:visible="installDialogVisible"
    modal
    header="Instalacija nije moguća u trenutnom pretraživaču."
  >
    <div class="flex flex-col gap-3 [&>p]:text-justify">
      <i18n-t scope="global" keypath="dialogs.installFailed.text1" tag="p">
        <strong>{{ $t("words.install") }}</strong>
      </i18n-t>
      <p>
        {{ t("dialogs.installFailed.text2") }}
      </p>
      <Button
        size="small"
        :label="!copied ? t('words.copyLink') : t('words.linkCopied')"
        :icon="!copied ? 'pi pi-copy' : 'pi pi-check'"
        :disabled="copied"
        icon-pos="right"
        @click="copyAppLink"
      />
      <p>
        {{ t("dialogs.installFailed.text3") }}
      </p>
      <Button
        size="small"
        :label="t('words.hideButton')"
        @click="hideInstallButtonManually"
      />
    </div>

    <template #closebutton>
      <Button
        severity="secondary"
        size="small"
        icon="pi pi-times"
        variant="text"
        @click="installDialogVisible = false"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.install-button-enter-active,
.install-button-leave-active {
  transition:
    opacity 180ms ease,
    transform 220ms ease;
}

.install-button-enter-from,
.install-button-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
