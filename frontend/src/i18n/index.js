import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translations
import en from './locales/en.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import de from './locales/de.json'
import pt from './locales/pt.json'
import ar from './locales/ar.json'
import zh from './locales/zh.json'
import ja from './locales/ja.json'
import ko from './locales/ko.json'
import ms from './locales/ms.json'  // Malay
import id from './locales/id.json'  // Indonesian

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  pt: { translation: pt },
  ar: { translation: ar },
  zh: { translation: zh },
  ja: { translation: ja },
  ko: { translation: ko },
  ms: { translation: ms },
  id: { translation: id },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React already escapes
    },

    // RTL support
    react: {
      useSuspense: false,
    },
  })

// Handle RTL languages
export const isRTL = (lng) => ['ar', 'he', 'fa'].includes(lng)

i18n.on('languageChanged', (lng) => {
  document.documentElement.dir = isRTL(lng) ? 'rtl' : 'ltr'
  document.documentElement.lang = lng
})

export default i18n
