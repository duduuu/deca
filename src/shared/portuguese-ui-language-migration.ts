import type { GlobalSettings } from './global-settings-types'
import { UI_LANGUAGE_SYSTEM, normalizeUiLanguage } from './ui-language'

type PortugueseUiLanguageSettings = Pick<
  GlobalSettings,
  'uiLanguage' | 'uiLanguagePortugueseMigrationApplied'
>

export function migratePortugueseUiLanguageOnLoad(
  settings: Partial<PortugueseUiLanguageSettings> | undefined
): PortugueseUiLanguageSettings {
  return {
    uiLanguage:
      settings?.uiLanguagePortugueseMigrationApplied !== true &&
      settings?.uiLanguage === 'plugin:stablyai.orca-portuguese/pt-BR'
        ? UI_LANGUAGE_SYSTEM
        : normalizeUiLanguage(settings?.uiLanguage),
    uiLanguagePortugueseMigrationApplied: true
  }
}
