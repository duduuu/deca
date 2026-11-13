import type { GlobalSettings } from '../../../../../shared/global-settings-types'
import { SettingsSwitchRow } from '../form-controls/SettingsFormControls'
import { getBrowserPasskeysSearchEntry } from './browser-passkeys-search'

type BrowserPasskeysSettingProps = {
  settings: Pick<GlobalSettings, 'browserPasskeysEnabled'>
  updateSettings: (updates: Partial<GlobalSettings>) => void
}

export function BrowserPasskeysSetting({
  settings,
  updateSettings
}: BrowserPasskeysSettingProps): React.JSX.Element {
  const { title, description } = getBrowserPasskeysSearchEntry()
  const enabled = settings.browserPasskeysEnabled === true
  return (
    <SettingsSwitchRow
      label={title}
      description={description}
      checked={enabled}
      onChange={() => updateSettings({ browserPasskeysEnabled: !enabled })}
    />
  )
}
