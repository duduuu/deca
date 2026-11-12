import type React from 'react'
import { useEffect, useState } from 'react'
import { SearchableSetting } from '../section-layout/SearchableSetting'
import { SettingsGroup } from '../section-layout/SettingsGroup'
import { useTranslate } from '@/i18n/use-translate'
import { DECA_VERSION } from '../../../../../shared/deca-version'

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
        <div className="space-y-0.5">
          <p className="text-sm">
            {t('settings.general.about.version', 'Deca {{version}}', { version: DECA_VERSION })}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('settings.general.about.baseVersion', 'Based on Orca {{version}}', {
              version: appVersion ?? '…'
            })}
          </p>
        </div>
      </SearchableSetting>
      {children}
    </SettingsGroup>
  )
}
