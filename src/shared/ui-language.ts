export const UI_LANGUAGE_SYSTEM = 'system'
export const UI_LANGUAGE_ENGLISH = 'en'
export const UI_LANGUAGE_KOREAN = 'ko'

export type BuiltInUiLanguage =
  | typeof UI_LANGUAGE_SYSTEM
  | typeof UI_LANGUAGE_ENGLISH
  | typeof UI_LANGUAGE_KOREAN

export type PluginUiLanguage = `plugin:${string}`
export type UiLanguage = BuiltInUiLanguage | PluginUiLanguage

// Each language in its own script, so someone stuck in a language they cannot read can find theirs.
export const UI_LANGUAGE_NATIVE_NAMES: Record<BuiltInUiLanguage, string> = {
  [UI_LANGUAGE_SYSTEM]: 'System',
  [UI_LANGUAGE_ENGLISH]: 'English',
  [UI_LANGUAGE_KOREAN]: '한국어'
}

const UI_LANGUAGE_VALUES = new Set<BuiltInUiLanguage>([
  UI_LANGUAGE_SYSTEM,
  UI_LANGUAGE_ENGLISH,
  UI_LANGUAGE_KOREAN
])

const PLUGIN_UI_LANGUAGE_RE =
  /^plugin:[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i

export function isPluginUiLanguage(value: unknown): value is PluginUiLanguage {
  return typeof value === 'string' && PLUGIN_UI_LANGUAGE_RE.test(value)
}

export function normalizeUiLanguage(value: unknown): UiLanguage {
  if (isPluginUiLanguage(value)) {
    return value
  }
  return UI_LANGUAGE_VALUES.has(value as BuiltInUiLanguage)
    ? (value as BuiltInUiLanguage)
    : UI_LANGUAGE_SYSTEM
}
