import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import zhHant from "./locales/zh-Hant.json";

export const SUPPORTED_LOCALES = ["zh-Hant", "en"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

const STORAGE_KEY = "hksdpcl.locale";

function resolveInitialLocale(): AppLocale {
  if (typeof window === "undefined") return "zh-Hant";
  let saved: string | null = null;
  try {
    saved = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    saved = null;
  }
  if (saved === "zh-Hant" || saved === "en") return saved;
  return "zh-Hant";
}

function applyDocumentLocale(locale: AppLocale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
}

const initialLocale = resolveInitialLocale();

void i18n.use(initReactI18next).init({
  resources: {
    "zh-Hant": { translation: zhHant },
    en: { translation: en },
  },
  lng: initialLocale,
  fallbackLng: "zh-Hant",
  interpolation: { escapeValue: false },
});

export function setAppLocale(locale: AppLocale) {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Locale changes still apply when local persistence is unavailable.
  }
  void i18n.changeLanguage(locale);
  applyDocumentLocale(locale);
}

applyDocumentLocale(initialLocale);

export default i18n;
