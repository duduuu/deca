import type { SettingsSearchEntry } from '../search/settings-search'
import { translate } from '@/i18n/i18n'
import { translateSearchKeyword } from '../search/settings-search-keywords'
import { createLocalizedCatalog } from '@/i18n/localized-catalog'
import { getAccountsClaudeSearchEntries } from './accounts-claude-search'

export const getAccountsLocationSearchEntries = createLocalizedCatalog(() => [
  {
    title: translate('auto.components.settings.accounts.search.5e2101f61f', 'Account location'),
    description: translate(
      'auto.components.settings.accounts.search.b84a5b0c8a',
      'Choose whether provider accounts are inspected and added on this device or in WSL.'
    ),
    keywords: [
      ...translateSearchKeyword('auto.components.settings.accounts.search.06662af91e', 'account'),
      ...translateSearchKeyword('auto.components.settings.accounts.search.593720c17f', 'location'),
      ...translateSearchKeyword('auto.components.settings.accounts.search.bdbd1e668e', 'windows'),
      ...translateSearchKeyword('auto.components.settings.accounts.search.0b4d948eb5', 'wsl'),
      ...translateSearchKeyword('auto.components.settings.accounts.search.488a7e9206', 'linux'),
      ...translateSearchKeyword('auto.components.settings.accounts.search.9f70aa706c', 'provider'),
      ...translateSearchKeyword('auto.components.settings.accounts.search.e02c136ad0', 'auth')
    ]
  }
])

export const getAccountsCodexSearchEntries = createLocalizedCatalog(() => [
  {
    title: translate('auto.components.settings.accounts.search.54c541fc6e', 'Codex accounts'),
    description: translate(
      'auto.components.settings.accounts.search.b40d5b6570',
      'Optional account switching for Codex and live rate limit fetching.'
    ),
    keywords: [
      ...translateSearchKeyword('auto.components.settings.accounts.search.70d1b8def5', 'codex'),
      ...translateSearchKeyword('auto.components.settings.accounts.search.06662af91e', 'account'),
      ...translateSearchKeyword(
        'auto.components.settings.accounts.search.e949b08ffb',
        'rate limit'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.accounts.search.86edc96bc9',
        'status bar'
      ),
      ...translateSearchKeyword('auto.components.settings.accounts.search.c759741d77', 'quota'),
      ...translateSearchKeyword('auto.components.settings.accounts.search.f2d666a886', 'optional'),
      ...translateSearchKeyword(
        'auto.components.settings.accounts.search.77e32a2ad3',
        'reauthenticate'
      ),
      ...translateSearchKeyword('auto.components.settings.accounts.search.02c438bc7b', 'expired'),
      ...translateSearchKeyword(
        'auto.components.settings.accounts.search.042885c07c',
        'out of date'
      )
    ]
  },
  {
    title: translate('auto.components.settings.accounts.search.4518496456', 'Active Codex account'),
    description: translate(
      'auto.components.settings.accounts.search.87a4a8584e',
      'Choose which optional saved Codex account powers live quota reads.'
    ),
    keywords: [
      ...translateSearchKeyword('auto.components.settings.accounts.search.70d1b8def5', 'codex'),
      ...translateSearchKeyword('auto.components.settings.accounts.search.06662af91e', 'account'),
      ...translateSearchKeyword('auto.components.settings.accounts.search.5b3f18ef4a', 'switch'),
      ...translateSearchKeyword('auto.components.settings.accounts.search.8b06729e0f', 'active'),
      ...translateSearchKeyword(
        'auto.components.settings.accounts.search.86edc96bc9',
        'status bar'
      ),
      ...translateSearchKeyword('auto.components.settings.accounts.search.f2d666a886', 'optional'),
      ...translateSearchKeyword('auto.components.settings.accounts.search.35b461d817', 'sign in')
    ]
  }
])

export const getAccountsAntigravitySearchEntries = createLocalizedCatalog(() => [
  {
    title: translate('accounts.antigravity.fd47b5a5dd', 'Antigravity accounts'),
    description: translate(
      'accounts.antigravity.searchDescription',
      'Save and select native agy Google accounts on the execution host.'
    ),
    keywords: [
      ...translateSearchKeyword('accounts.antigravity.keyword.antigravity', 'antigravity'),
      ...translateSearchKeyword('accounts.antigravity.keyword.agy', 'agy'),
      ...translateSearchKeyword('accounts.antigravity.keyword.google', 'google'),
      ...translateSearchKeyword('accounts.antigravity.keyword.accounts', 'accounts'),
      ...translateSearchKeyword('auto.components.settings.accounts.search.a9f3d7b5c8', 'login'),
      ...translateSearchKeyword('auto.components.settings.accounts.search.cursor.kw.usage', 'usage')
    ]
  }
])

export const getAccountsPaneSearchEntries = createLocalizedCatalog((): SettingsSearchEntry[] => [
  ...getAccountsLocationSearchEntries(),
  ...getAccountsClaudeSearchEntries(),
  ...getAccountsCodexSearchEntries(),
  ...getAccountsAntigravitySearchEntries()
])
