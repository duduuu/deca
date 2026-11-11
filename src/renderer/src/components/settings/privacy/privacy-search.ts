import { translate } from '@/i18n/i18n'
import { translateSearchKeyword } from '../search/settings-search-keywords'
import { createLocalizedCatalog } from '@/i18n/localized-catalog'

export const getPrivacyPaneSearchEntries = createLocalizedCatalog(() => [
  {
    title: translate('auto.components.settings.privacy.search.a966af0840', 'Privacy & telemetry'),
    description: translate(
      'auto.components.settings.privacy.search.aa3b794c17',
      'Anonymous product usage data, diagnostics, and telemetry controls.'
    ),
    keywords: [
      ...translateSearchKeyword('auto.components.settings.privacy.search.10124159f1', 'privacy'),
      ...translateSearchKeyword('auto.components.settings.privacy.search.77d3180def', 'telemetry'),
      ...translateSearchKeyword('auto.components.settings.privacy.search.4104f6f0f3', 'analytics'),
      ...translateSearchKeyword('auto.components.settings.privacy.search.79c319948b', 'usage'),
      ...translateSearchKeyword('auto.components.settings.privacy.search.b021b9cb81', 'anonymous'),
      ...translateSearchKeyword('auto.components.settings.privacy.search.3922051573', 'data'),
      ...translateSearchKeyword('auto.components.settings.privacy.search.27a27b2f63', 'opt out'),
      ...translateSearchKeyword('auto.components.settings.privacy.search.4d4bb76bf4', 'opt in')
    ]
  },
  {
    title: translate('auto.components.settings.privacy.search.6d258d2ed6', 'Diagnostics'),
    description: translate(
      'auto.components.settings.privacy.search.8b08f32366',
      'App diagnostics and support sharing controls.'
    ),
    keywords: [
      ...translateSearchKeyword(
        'auto.components.settings.privacy.search.c0494ff48a',
        'diagnostics'
      ),
      ...translateSearchKeyword('auto.components.settings.privacy.search.1686c07fee', 'support')
    ]
  }
])
