import { createI18n } from "vue-i18n";
import type { I18n, I18nOptions } from "vue-i18n";
import srMessages from "@/locales/sr.json";
import enMessages from "@/locales/en.json";

const messages = {
  sr: srMessages,
  en: enMessages,
} as const;

const datetimeFormats = {
  sr: {
    numeric: {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    },
    short: {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
    long: {
      year: "numeric",
      month: "short",
      day: "numeric",
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
    },
    time: {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    },
  },
  en: {
    numeric: {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    },
    short: {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
    long: {
      year: "numeric",
      month: "short",
      day: "numeric",
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    },
    time: {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: true,
    },
  },
} as const;

const numberFormats = {
  sr: {
    currency: {
      style: "currency",
      currency: "RSD",
      currencyDisplay: "symbol",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true,
    },
    decimal: {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      useGrouping: true,
    },
    percent: {
      style: "percent",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      useGrouping: false,
    },
  },
  en: {
    currency: {
      style: "currency",
      currency: "USD",
      notation: "standard",
    },
    decimal: {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
    percent: {
      style: "percent",
      useGrouping: false,
    },
  },
} as const;

const getInitialLocale = () => {
  const stored = localStorage.getItem("repertoar_selected_locale");
  return stored || "sr";
};

const i18nOptions: I18nOptions = {
  // globalInjection: true,
  escapeParameter: true,
  legacy: false,
  locale: getInitialLocale(),
  fallbackLocale: "sr",
  messages,
  datetimeFormats,
  numberFormats,
};

export const i18n: I18n = createI18n(i18nOptions);
