import { translate } from '@/i18n/i18n'
import { translateSearchKeyword } from '../../search/settings-search-keywords'
import { createLocalizedCatalog } from '@/i18n/localized-catalog'

export const getBrowserUsePaneSearchEntries = createLocalizedCatalog(() => [
  {
    title: translate(
      'auto.components.settings.browser.use.search.e72d500ca5',
      'Install browser use skill'
    ),
    description: translate(
      'auto.components.settings.browser.use.search.a7e82445fa',
      "Install the Browser Use skill so agents can operate Deca's browser."
    ),
    keywords: [
      ...translateSearchKeyword(
        'auto.components.settings.browser.use.search.ba4eb53b72',
        'browser use'
      ),
      ...translateSearchKeyword('auto.components.settings.browser.use.search.a2d489263e', 'skill'),
      ...translateSearchKeyword('auto.components.settings.browser.use.search.9d97446873', 'agent'),
      ...translateSearchKeyword(
        'auto.components.settings.browser.use.search.e5a784bc54',
        'install'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.browser.use.search.f5b8fdddf5',
        'orca-cli'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.browser.use.search.a57c2172dc',
        'agent-browser'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.browser.use.search.cee44fb442',
        'automation'
      )
    ]
  }
])
