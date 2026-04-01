import { registerSW } from "virtual:pwa-register";

type UpdateSWFn = (reloadPage?: boolean) => Promise<void>;

const needRefresh = ref(false);
const showRefreshToast = ref(false);
const isApplyingUpdate = ref(false);
const swRegistration = ref<ServiceWorkerRegistration | null>(null);
const isInitialized = ref(false);
const isOnlineWatcherInitialized = ref(false);

let updateSW: UpdateSWFn | null = null;
let inFlightCheck: Promise<boolean> | null = null;
let inFlightRegistrationUpdate: Promise<void> | null = null;

function markUpdateAvailable() {
  needRefresh.value = true;
  showRefreshToast.value = true;
}

async function updateRegistrationOnce(
  registration: ServiceWorkerRegistration,
): Promise<void> {
  if (inFlightRegistrationUpdate) {
    await inFlightRegistrationUpdate;
    return;
  }

  inFlightRegistrationUpdate = (async () => {
    try {
      await registration.update();
    } catch (err) {
      console.warn("PWA update check failed", err);
    } finally {
      inFlightRegistrationUpdate = null;
    }
  })();

  await inFlightRegistrationUpdate;
}

function clearUpdatePrompt() {
  needRefresh.value = false;
  showRefreshToast.value = false;
}

export function usePwaUpdate() {
  onMounted(() => {
    if (isInitialized.value) return;
    isInitialized.value = true;

    // registerSW wires events and returns an update function
    updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        markUpdateAvailable();
      },
      onRegisteredSW(_, registration) {
        swRegistration.value = registration ?? null;
        if (registration?.waiting) {
          markUpdateAvailable();
        }
      },
      // onOfflineReady() {
      //   offlineReady.value = true;
      // },
    });
  });

  // Install a single online watcher for the entire app instance.
  if (!isOnlineWatcherInitialized.value) {
    isOnlineWatcherInitialized.value = true;
    const watcherScope = effectScope(true);
    watcherScope.run(() => {
      const online = useOnline();
      watch(
        online,
        async (isOnline, wasOnline) => {
          if (!isOnline || wasOnline !== false) return;
          await checkForUpdate();
        },
        { flush: "post" },
      );
    });
  }

  async function settleRefreshState() {
    // Give onNeedRefresh/onRegisteredSW a short window to fire.
    await delay(350);
    return (
      needRefresh.value ||
      showRefreshToast.value ||
      !!swRegistration.value?.waiting
    );
  }

  async function reloadToUpdate() {
    if (isApplyingUpdate.value) return;
    isApplyingUpdate.value = true;
    sessionStorage.setItem("pwa_just_updated", "1");
    clearUpdatePrompt();

    try {
      const registration = swRegistration.value;
      if (registration?.waiting) {
        let reloading = false;
        const reloadOnce = () => {
          if (reloading) return;
          reloading = true;
          window.location.reload();
        };

        navigator.serviceWorker.addEventListener(
          "controllerchange",
          reloadOnce,
          {
            once: true,
          },
        );
        registration.waiting.postMessage({ type: "SKIP_WAITING" });

        // Fallback in case controllerchange is missed/delayed.
        setTimeout(reloadOnce, 1500);
        return;
      }

      if (updateSW) {
        await updateSW(true);
        return;
      }

      window.location.reload();
    } finally {
      // If reload happens, this state is irrelevant; if it doesn't, allow retry.
      isApplyingUpdate.value = false;
    }
  }

  function waitForNeedRefresh(timeoutMs = 3000): Promise<boolean> {
    if (needRefresh.value) return Promise.resolve(true);

    return new Promise((resolve) => {
      const stop = watch(needRefresh, (val) => {
        if (val) {
          stop();
          clearTimeout(timer);
          resolve(true);
        }
      });

      const timer = setTimeout(() => {
        stop();
        resolve(false);
      }, timeoutMs);
    });
  }

  async function checkForUpdate(): Promise<boolean> {
    if (inFlightCheck) return inFlightCheck;

    inFlightCheck = (async () => {
      if (needRefresh.value) {
        showRefreshToast.value = true;
        return true;
      }

      const registration = swRegistration.value;
      if (registration) {
        await updateRegistrationOnce(registration);

        if (registration.waiting) {
          markUpdateAvailable();
          return true;
        }
        if (await waitForNeedRefresh()) {
          showRefreshToast.value = true;
          return true;
        }
        if (await settleRefreshState()) {
          showRefreshToast.value = true;
          return true;
        }
        return false;
      }

      if (updateSW) {
        await updateSW();
        if (needRefresh.value || (await waitForNeedRefresh())) {
          showRefreshToast.value = true;
          return true;
        }
        if (await settleRefreshState()) {
          showRefreshToast.value = true;
          return true;
        }
      }

      return false;
    })();

    try {
      return await inFlightCheck;
    } finally {
      inFlightCheck = null;
    }
  }

  function dismissUpdate() {
    // console.log("dismissUpdate");
    showRefreshToast.value = false;
  }

  return {
    needRefresh,
    // offlineReady,
    reloadToUpdate,
    checkForUpdate,
    dismissUpdate,
    showRefreshToast,
    isApplyingUpdate,
  };
}
