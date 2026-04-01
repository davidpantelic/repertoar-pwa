<script setup lang="ts">
const { t } = useI18n();
const toast = useToast();
const supabase = useSupabaseClient();
const notificationsEnabled = ref(false);
const TABLE_NAME = "push_subscriptions";
const isLoading = ref(false);
const session = ref<any>(null);

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
};

const saveSubscription = async (subscription: PushSubscription) => {
  if (!session.value?.user?.id) {
    throw new Error("User not authenticated");
  }
  const user = session.value.user;
  const json = subscription.toJSON();
  const { endpoint, keys } = json;
  const { error } = await supabase.from(TABLE_NAME).upsert(
    {
      endpoint,
      user_id: user.id,
      p256dh: keys?.p256dh ?? null,
      auth: keys?.auth ?? null,
      subscription: json,
      createdAt: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );
  if (error) throw error;
};

const enablePush = async () => {
  isLoading.value = true;

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (!session || sessionError) {
      toast.add({
        group: "userSignToastGroup",
        severity: "warn",
        summary: t("words.login"),
        detail: t("form.message.loggedRequired"),
        life: 3000,
      });
      isLoading.value = false;
      return;
    }
  } finally {
    isLoading.value = false;
  }

  if (!("serviceWorker" in navigator)) {
    console.error("Service Worker nije podržan.");
    toast.add({
      group: "notificationsToastGroup",
      severity: "danger",
      summary: t("toasts.notificationsToastGroup.danger1.summary"),
      detail: t("toasts.notificationsToastGroup.danger1.detail1"),
      life: 3000,
    });
    return;
  }
  if (!("PushManager" in window)) {
    console.error("Push nije podržan.");
    toast.add({
      group: "notificationsToastGroup",
      severity: "danger",
      summary: t("toasts.notificationsToastGroup.danger1.summary"),
      detail: t("toasts.notificationsToastGroup.danger1.detail2"),
      life: 3000,
    });
    return;
  }

  isLoading.value = true;
  try {
    if (Notification.permission === "denied") {
      toast.add({
        group: "notificationsToastGroup",
        severity: "warn",
        summary: t("toasts.notificationsToastGroup.warn1.summary"),
        detail: t("toasts.notificationsToastGroup.warn1.detail"),
        life: 8000,
      });
      notificationsEnabled.value = false;
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === "default") {
      toast.add({
        group: "notificationsToastGroup",
        severity: "warn",
        summary: t("toasts.notificationsToastGroup.warn2.summary"),
        detail: t("toasts.notificationsToastGroup.warn2.detail"),
        life: 5000,
      });
      notificationsEnabled.value = false;
      return;
    }
    if (permission !== "granted") {
      toast.add({
        group: "notificationsToastGroup",
        severity: "warn",
        summary: t("toasts.notificationsToastGroup.warn3.summary"),
        detail: t("toasts.notificationsToastGroup.warn3.detail"),
        life: 3000,
      });
      notificationsEnabled.value = false;
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        console.error("VAPID public key nije postavljen.");
        toast.add({
          group: "notificationsToastGroup",
          severity: "danger",
          summary: t("toasts.notificationsToastGroup.danger2.summary"),
          life: 3000,
        });
        return;
      }
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    await saveSubscription(subscription);
    toast.add({
      group: "notificationsToastGroup",
      severity: "success",
      summary: t("toasts.notificationsToastGroup.success.summary"),
      life: 3000,
    });
    notificationsEnabled.value = true;
  } catch (err) {
    toast.add({
      group: "notificationsToastGroup",
      severity: "danger",
      summary: t("toasts.notificationsToastGroup.danger3.summary"),
      life: 3000,
    });
    notificationsEnabled.value = false;
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  // get current session
  const {
    data: { session: currentSession },
  } = await supabase.auth.getSession();
  session.value = currentSession;

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    notificationsEnabled.value = false;
    return;
  }
  if (Notification.permission !== "granted") {
    notificationsEnabled.value = false;
    return;
  }
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  notificationsEnabled.value = Boolean(subscription);
});
</script>

<template>
  <Button
    :icon="
      notificationsEnabled
        ? 'pi pi-bell'
        : isLoading
          ? 'pi pi-spinner pi-spin'
          : 'pi pi-bell-slash'
    "
    size="large"
    severity="secondary"
    @click="enablePush"
  />
</template>
