import Vue from 'vue'
import VueI18n from 'vue-i18n'
import storage from 'store'
import moment from 'moment'
import zhCN from './lang/zh-CN'
import enUS from './lang/en-US'
import copilotOverrides from './copilot-overrides'

Vue.use(VueI18n)

// Internal deployment default: Simplified Chinese.
export const defaultLang = 'zh-CN'

const messages = {
  'zh-CN': {
    ...zhCN,
    ...(copilotOverrides['zh-CN'] || {})
  },
  'en-US': {
    ...enUS,
    ...(copilotOverrides['en-US'] || {})
  }
}

const localeLoaders = {
  'zh-CN': () => import('./lang/zh-CN.js'),
  'en-US': () => import('./lang/en-US.js')
}

const i18n = new VueI18n({
  silentTranslationWarn: true,
  silentFallbackWarn: true,
  locale: defaultLang,
  fallbackLocale: 'en-US',
  messages
})

const loadedLanguages = ['zh-CN', 'en-US']

function sanitizeLocaleMessage (message) {
  if (Array.isArray(message)) {
    return message
      .map(item => sanitizeLocaleMessage(item))
      .filter(item => item !== undefined)
  }

  if (message && typeof message === 'object') {
    return Object.keys(message).reduce((result, key) => {
      const value = sanitizeLocaleMessage(message[key])
      if (value !== undefined) {
        result[key] = value
      }
      return result
    }, {})
  }

  if (typeof message === 'string') {
    return message.includes('\uFFFD') ? undefined : message
  }

  return message
}

function setI18nLanguage (lang) {
  i18n.locale = lang
  const html = document.documentElement
  const isRtl = /^ar/i.test(lang)
  if (html) {
    html.setAttribute('lang', lang)
    html.setAttribute('dir', isRtl ? 'rtl' : 'ltr')
  }
  if (document.body) {
    document.body.setAttribute('dir', isRtl ? 'rtl' : 'ltr')
    document.body.classList.toggle('rtl', isRtl)
  }
  return lang
}

function mergeLocaleOverrides (lang) {
  const overrides = copilotOverrides[lang]
  if (!overrides) return
  i18n.setLocaleMessage(lang, {
    ...(i18n.getLocaleMessage(lang) || {}),
    ...overrides
  })
}

export async function loadLanguageAsync (lang = defaultLang) {
  const supported = Object.keys(localeLoaders)
  if (!supported.includes(lang)) {
    lang = defaultLang
  }
  storage.set('lang', lang)
  if (i18n.locale === lang) {
    mergeLocaleOverrides(lang)
    return setI18nLanguage(lang)
  }

  if (!loadedLanguages.includes(lang)) {
    const loadLocale = localeLoaders[lang]
    if (!loadLocale) return setI18nLanguage(defaultLang)

    const msg = await loadLocale()
    const locale = sanitizeLocaleMessage({
      ...msg.default,
      ...(copilotOverrides[lang] || {})
    })
    i18n.setLocaleMessage(lang, locale)
    loadedLanguages.push(lang)
    if (locale.momentName && locale.momentLocale) {
      moment.updateLocale(locale.momentName, locale.momentLocale)
    }
  }

  mergeLocaleOverrides(lang)
  return setI18nLanguage(lang)
}

export function i18nRender (key) {
  return i18n.t(`${key}`)
}

export default i18n
