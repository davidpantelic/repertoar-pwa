import type { BIPEvent } from "@/types";

const DISMISS_KEY = "pwa_install_dismissed_until";
const INSTALLED_KEY = "pwa_is_installed";
// const installPromptDelayHours = 0.002;
const installPromptDelayHours = 2;

function isStandaloneMode() {
  // Android/Desktop: display-mode
  const mql = window.matchMedia?.("(display-mode: standalone)");
  const standaloneByDisplayMode = !!mql?.matches;

  // iOS Safari: navigator.standalone
  const standaloneByIOS = (window.navigator as any)?.standalone === true;

  return standaloneByDisplayMode || standaloneByIOS;
}

function getDismissedUntil(): number {
  const raw = localStorage.getItem(DISMISS_KEY);
  return raw ? Number(raw) : 0;
}

function setDismissedForHours(hours: number) {
  const seconds = Math.round(hours * 60 * 60);
  // console.log(`dismissed for ${seconds} seconds`);
  const until = Date.now() + hours * 60 * 60 * 1000;
  localStorage.setItem(DISMISS_KEY, String(until));
}

function getInstalledFlag(): boolean {
  return localStorage.getItem(INSTALLED_KEY) === "true";
}

function setInstalledFlag(value: boolean) {
  localStorage.setItem(INSTALLED_KEY, value ? "true" : "false");
}

export function useInstallPrompt() {
  const deferredPrompt = ref<BIPEvent | null>(null);
  const installed = ref(false);
  const dismissedUntil = ref(getDismissedUntil());

  const canPromptInstall = computed(() => !!deferredPrompt.value);
  const inStandalone = ref(false);

  function refreshStandaloneFlag() {
    inStandalone.value = isStandaloneMode();
  }

  const shouldShowInstallUI = computed(() => {
    // show only in browser (not standalone) + not installed + prompt available + not recently dismissed
    if (installed.value) return false;
    if (inStandalone.value) return false;
    if (!canPromptInstall.value) return false;
    if (Date.now() < dismissedUntil.value) return false;
    return true;
  });

  function onBeforeInstallPrompt(e: Event) {
    // Chrome/Edge/Android: capture the prompt
    e.preventDefault();
    installed.value = false;
    setInstalledFlag(false);
    deferredPrompt.value = e as BIPEvent;
    refreshStandaloneFlag();
  }

  function onAppInstalled() {
    installed.value = true;
    setInstalledFlag(true);
    deferredPrompt.value = null;
    refreshStandaloneFlag();
  }

  async function promptInstall(options?: { suppressDismiss?: boolean }) {
    if (!deferredPrompt.value) return { outcome: "dismissed" as const };

    await deferredPrompt.value.prompt();
    const choice = await deferredPrompt.value.userChoice;

    const dismissed = choice.outcome === "dismissed";

    // If user dismissed, don't keep showing the toast every navigation
    if (dismissed && !options?.suppressDismiss) {
      setDismissedForHours(0.0002);
      dismissedUntil.value = getDismissedUntil();
    }

    if (!dismissed || !options?.suppressDismiss) {
      deferredPrompt.value = null;
    }
    refreshStandaloneFlag();

    return choice;
  }

  function dismissForNow(hours = installPromptDelayHours) {
    setDismissedForHours(hours);
    dismissedUntil.value = getDismissedUntil();
  }

  onMounted(() => {
    refreshStandaloneFlag();
    installed.value = getInstalledFlag() || isStandaloneMode();
    dismissedUntil.value = getDismissedUntil();
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    // Keep standalone flag accurate if display-mode changes
    window
      .matchMedia?.("(display-mode: standalone)")
      ?.addEventListener?.("change", refreshStandaloneFlag);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.removeEventListener("appinstalled", onAppInstalled);
    window
      .matchMedia?.("(display-mode: standalone)")
      ?.removeEventListener?.("change", refreshStandaloneFlag);
  });

  return {
    canPromptInstall: computed(() => canPromptInstall.value),
    shouldShowInstallUI,
    isInstalled: computed(() => installed.value),
    isStandalone: computed(() => inStandalone.value),
    promptInstall,
    dismissForNow,
  };
}
