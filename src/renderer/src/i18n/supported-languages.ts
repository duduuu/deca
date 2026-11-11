import { DEFAULT_UI_LOCALE, resolveRendererUiLocale } from '../../../shared/ui-locale'
import {
  UI_LANGUAGE_ENGLISH,
  UI_LANGUAGE_KOREAN,
  UI_LANGUAGE_SYSTEM,
  UI_LANGUAGE_NATIVE_NAMES,
  type BuiltInUiLanguage,
  type UiLanguage
} from '../../../shared/ui-language'

export const DEFAULT_LOCALE = DEFAULT_UI_LOCALE

export const SHOW_UI_LANGUAGE_SETTING = true

export type UiLanguageChoice = {
  value: BuiltInUiLanguage
  labelKey: string
}

export const UI_LANGUAGE_CHOICES: UiLanguageChoice[] = [
  { value: UI_LANGUAGE_SYSTEM, labelKey: 'settings.appearance.language.system' },
  { value: UI_LANGUAGE_ENGLISH, labelKey: 'settings.appearance.language.english' },
  { value: UI_LANGUAGE_KOREAN, labelKey: 'settings.appearance.language.korean' }
]

export function getUiLanguageChoiceLabel(
  choice: UiLanguageChoice,
  translateFn: (key: string, fallback: string) => string
): string {
  return translateFn(choice.labelKey, UI_LANGUAGE_NATIVE_NAMES[choice.value])
}

export function resolveUiLocale(language: UiLanguage): string {
  return resolveRendererUiLocale(language)
}

export function getUiLanguageNativeLabel(language: BuiltInUiLanguage): string {
  return UI_LANGUAGE_NATIVE_NAMES[language]
}
