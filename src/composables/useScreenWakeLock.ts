export function useScreenWakeLock() {
  const { t } = useI18n();
  const toast = useToast();
  // keep a single wake lock instance across mounts
  let cached = (
    useScreenWakeLock as unknown as { _wl?: ReturnType<typeof useWakeLock> }
  )._wl;
  if (!cached) {
    cached = useWakeLock();
    (
      useScreenWakeLock as unknown as { _wl?: ReturnType<typeof useWakeLock> }
    )._wl = cached;
  }
  const wakeLock = cached;

  const isSupported = wakeLock.isSupported;
  const isActive = wakeLock.isActive;

  async function enable() {
    try {
      await wakeLock.request("screen");
      toast.add({
        group: "screenWakeLockToastGroup",
        severity: "success",
        summary: t("toasts.screenWakeLockToastGroup.success.summary"),
        detail: t("toasts.screenWakeLockToastGroup.success.detail"),
        life: 3000,
      });
    } catch (e) {
      // most common: not allowed without user gesture, or not supported
      console.warn("Wake Lock request failed:", e);
      toast.add({
        group: "screenWakeLockToastGroup",
        severity: "error",
        summary: t("toasts.screenWakeLockToastGroup.error.summary"),
        detail: t("toasts.screenWakeLockToastGroup.error.detail"),
        life: 3000,
      });
    }
  }

  async function disable() {
    try {
      await wakeLock.release();
    } catch (e) {
      console.warn("Wake Lock release failed:", e);
    }
  }

  async function toggleSWL() {
    if (!isSupported.value) return;
    if (isActive.value) {
      await disable();
    } else {
      await enable();
    }
  }

  return { isSupported, isActive, enable, disable, toggleSWL };
}
