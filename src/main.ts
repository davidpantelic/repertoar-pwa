import "./assets/base.css";
import "./assets/style.scss";
import "primeicons/primeicons.css";

import { createApp } from "vue";
import { createPinia } from "pinia";
import { createHead } from "@unhead/vue/client";
import PrimeVue from "primevue/config";
import { PrimeVueCustomPreset } from "@/config/prime-vue-custom-preset.ts";
import ToastService from "primevue/toastservice";
import ConfirmationService from "primevue/confirmationservice";
import { i18n } from "@/config/i18n";

import App from "./App.vue";
import router from "./router";

const app = createApp(App);
const head = createHead();

app.use(createPinia());
app.use(router);
app.use(head);
app.use(i18n);

watch(
  () =>
    isRef(i18n.global.locale)
      ? i18n.global.locale.value
      : (i18n.global.locale as string),
  (locale) => {
    document.documentElement.lang = String(locale ?? "en");
    localStorage.setItem("repertoar_selected_locale", String(locale));
  },
  { immediate: true },
);

app.use(PrimeVue, {
  // unstyled: true,
  // ripple: true,
  // inputVariant: "filled",
  theme: {
    preset: PrimeVueCustomPreset,
    options: {
      darkModeSelector: ".dark-mode",
    },
  },
});
app.use(ToastService);
app.use(ConfirmationService);

app.mount("#app");
