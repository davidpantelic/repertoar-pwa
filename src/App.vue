<script setup lang="ts">
import { useUserSession } from "@/stores/userSession";

const { t } = useI18n();
const userSession = useUserSession();

useAppTheme();
useAutoSync();

userSession.initAuthListener();
userSession.checkSession();

onMounted(async () => {
  if ("clearAppBadge" in navigator) {
    (navigator as Navigator & { clearAppBadge?: () => Promise<void> })
      .clearAppBadge?.()
      .catch(() => {});
  }
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.active?.postMessage({ type: "CLEAR_BADGE" });
      })
      .catch(() => {});
  }
});

const metaDescription = computed(() => t("meta.description"));

const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

useHead({
  title: "Repertoar",
  meta: [
    {
      name: "description",
      content: metaDescription,
    },
  ],
  link: [
    { rel: "icon", href: "/favicon.ico" },
    { rel: "mask-icon", href: "/repertoar.svg", color: "#0f1c0d" },
    { rel: "apple-touch-icon", href: "/repertoar_192.png", sizes: "192x192" },
    { rel: "canonical", href: "https://example.com/" },
  ],
});

useSeoMeta({
  ogTitle: "Repertoar",
  ogDescription: metaDescription,
  ogImage: "/social_share.jpg",
});
</script>

<template>
  <header class="absolute w-full flex items-center gap-3 justify-between p-1">
    <RouterLink to="/">
      <img alt="Vue logo" class="logo size-16" src="@/assets/logo.svg" />
    </RouterLink>

    <div class="flex flex-wrap gap-1 xxs:gap-2 xs:gap-3 p-1 xs:p-2 max-w-full">
      <OfflineIndicator />
      <UpdateToastAndButton />
      <InstallToastAndButton v-if="!isLocalhost" />
      <Suspense>
        <ProfileButton />
      </Suspense>
      <DrawerButton />
    </div>
  </header>

  <Suspense>
    <RouterView class="p-5" />
  </Suspense>

  <ToastsGroup />
</template>
