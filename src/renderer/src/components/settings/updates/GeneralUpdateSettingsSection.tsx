import type React from 'react'
import { useEffect, useState } from 'react'
import { SearchableSetting } from '../section-layout/SearchableSetting'
import { SettingsGroup } from '../section-layout/SettingsGroup'
import { useTranslate } from '@/i18n/use-translate'
import { GeneralRemoteServerUpdates } from './GeneralRemoteServerUpdates'

// Deca is updated through the internal package channel; About only reports the installed version.
export function GeneralUpdateSettingsSection({
  children
}: { children?: React.ReactNode } = {}): React.JSX.Element {
  const t = useTranslate()
  const [appVersion, setAppVersion] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void window.api.updater.getVersion().then((version) => {
      if (!cancelled) {
        setAppVersion(version)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <SettingsGroup key="updates" title={t('settings.general.about.title', 'About')}>
      <SearchableSetting
        title={t('settings.general.about.versionTitle', 'Version')}
        description={t(
          'settings.general.about.internalUpdates',
          'Updates are installed through your internal software distribution.'
        )}
        keywords={['about', 'version']}
        className="space-y-3 py-3"
      >
        <span className="text-sm">
          {t('settings.general.about.version', 'Orca {{version}}', {
            version: appVersion ?? '…'
          })}
        </span>
      </SearchableSetting>
      <GeneralRemoteServerUpdates />
      {children}
    </SettingsGroup>
  )
}
