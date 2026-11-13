import type { SettingsSearchEntry } from '../search/settings-search'
import { translate } from '@/i18n/i18n'
import { translateSearchKeyword } from '../search/settings-search-keywords'
import { createLocalizedCatalog } from '@/i18n/localized-catalog'

export const getBrowserPasskeysSearchEntry = createLocalizedCatalog((): SettingsSearchEntry => ({
  title: translate('settings.browser.passkeys.title', 'Passkeys and security keys'),
  description: translate(
    'settings.browser.passkeys.description',
    'Let sites in the browser sign in with passkeys or USB security keys. Off by default.'
  ),
  keywords: [
    ...translateSearchKeyword('auto.components.settings.browser.search.2d2d995c58', 'browser'),
    ...translateSearchKeyword('settings.browser.passkeys.search.passkey', 'passkey'),
    ...translateSearchKeyword('settings.browser.passkeys.search.webauthn', 'webauthn'),
    ...translateSearchKeyword('settings.browser.passkeys.search.securityKey', 'security key')
  ]
}))
