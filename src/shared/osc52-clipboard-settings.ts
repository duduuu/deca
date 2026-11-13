import type { GlobalSettings } from './global-settings-types'

type Osc52ClipboardSettings = Pick<
  GlobalSettings,
  'terminalAllowOsc52Clipboard' | 'terminalAllowOsc52ClipboardDefaultedOnForAllUsers'
>

export function normalizeOsc52ClipboardDefaultOn(
  settings: Partial<Osc52ClipboardSettings> | undefined
): Osc52ClipboardSettings {
  return {
    // Why: Deca keeps OSC 52 off until the user opts in, so terminal output cannot silently rewrite the clipboard.
    terminalAllowOsc52Clipboard: settings?.terminalAllowOsc52Clipboard ?? false,
    terminalAllowOsc52ClipboardDefaultedOnForAllUsers: true
  }
}

/** Deca never flips a persisted opt-out on, so there is nothing to announce. */
export function osc52ClipboardDefaultOnOverridesPersistedOff(
  _settings: Partial<Osc52ClipboardSettings> | undefined
): boolean {
  return false
}
