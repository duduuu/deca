import { Plus } from 'lucide-react'
import type { BrowserSessionProfile } from '../../../../../../shared/browser-workspace-types'
import { Button } from '../../../ui/button'
import { Label } from '../../../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select'
import { SearchableSetting } from '../../section-layout/SearchableSetting'
import { BrowserProfileRow } from './BrowserProfileRow'
import type { ExecutionHostId } from '../../../../../../shared/execution-host'
import { useTranslate } from '@/i18n/use-translate'

type BrowserSessionHostOption = {
  id: ExecutionHostId
  label: string
  detail: string
}

type BrowserSessionCookiesSectionProps = {
  defaultProfile: BrowserSessionProfile | undefined
  nonDefaultProfiles: BrowserSessionProfile[]
  hostOptions: readonly BrowserSessionHostOption[]
  selectedHostId: ExecutionHostId
  activeProfileId: string
  onAddProfile: () => void
  onSelectHost: (hostId: ExecutionHostId) => void
  onSelectDefaultProfile: () => void
  onSelectProfile: (profileId: string) => void
}

export function BrowserSessionCookiesSection({
  defaultProfile,
  nonDefaultProfiles,
  hostOptions,
  selectedHostId,
  activeProfileId,
  onAddProfile,
  onSelectHost,
  onSelectDefaultProfile,
  onSelectProfile
}: BrowserSessionCookiesSectionProps): React.JSX.Element {
  const t = useTranslate()
  const selectedHost = hostOptions.find((host) => host.id === selectedHostId) ?? hostOptions[0]
  return (
    <SearchableSetting
      id="browser-session-cookies"
      title={t('auto.components.settings.BrowserPane.bc44903d30', 'Session & cookies')}
      description={t(
        'auto.components.settings.BrowserPane.aa1074bfe9',
        'Manage browser profiles for browser tabs.'
      )}
      keywords={['cookies', 'session', 'auth', 'login', 'profile']}
      className="space-y-3 py-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <Label>{t('auto.components.settings.BrowserPane.ddd634b250', 'Session & cookies')}</Label>
          <p className="text-xs text-muted-foreground">
            {t(
              'auto.components.settings.BrowserPane.cd47bc9622',
              'Select a default profile for new browser tabs. Switch profiles per-tab via the'
            )}{' '}
            <strong>···</strong>{' '}
            {t('auto.components.settings.BrowserPane.e4aaf8051b', 'toolbar menu.')}
          </p>
        </div>
        <Button variant="outline" size="xs" onClick={onAddProfile} className="shrink-0 gap-1.5">
          <Plus className="size-3" />
          {t('auto.components.settings.BrowserPane.549f28cf10', 'Add profile')}
        </Button>
      </div>

      {hostOptions.length > 1 ? (
        <div
          data-settings-row=""
          className="flex items-center justify-between gap-3 rounded-md border border-border/70 px-3 py-2"
        >
          <div className="min-w-0 space-y-0.5">
            <Label className="text-xs">
              {t('auto.components.settings.BrowserPane.5e19a692f7', 'Host')}
            </Label>
            <p className="truncate text-[11px] text-muted-foreground">
              {selectedHost?.detail ??
                t(
                  'auto.components.settings.BrowserPane.6480776a03',
                  'Browser profiles for the selected host.'
                )}
            </p>
          </div>
          <Select
            value={selectedHostId}
            onValueChange={(value) => onSelectHost(value as ExecutionHostId)}
          >
            <SelectTrigger size="sm" className="max-w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {hostOptions.map((host) => (
                <SelectItem key={host.id} value={host.id}>
                  {host.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="space-y-2">
        <BrowserProfileRow
          profile={
            defaultProfile ?? {
              id: 'default',
              scope: 'default',
              partition: '',
              label: t('auto.components.settings.BrowserPane.4399c77caa', 'Default'),
              source: null
            }
          }
          isActive={activeProfileId === 'default'}
          onSelect={onSelectDefaultProfile}
          isDefault
        />
        {nonDefaultProfiles.map((profile) => (
          <BrowserProfileRow
            key={profile.id}
            profile={profile}
            isActive={activeProfileId === profile.id}
            onSelect={() => onSelectProfile(profile.id)}
          />
        ))}
      </div>
    </SearchableSetting>
  )
}
