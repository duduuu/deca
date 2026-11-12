import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { BrowserSessionProfile } from '../../../../../../shared/browser-workspace-types'
import { Button } from '../../../ui/button'
import { useAppStore } from '../../../../store/index'
import { useTranslate } from '@/i18n/use-translate'
import { translateBrowserSessionProfileLabel } from '@/lib/browser/profiles/browser-session-profile-label'

export type BrowserProfileRowProps = {
  profile: BrowserSessionProfile
  isActive: boolean
  onSelect: () => void
  isDefault?: boolean
}

export function BrowserProfileRow({
  profile,
  isActive,
  onSelect,
  isDefault
}: BrowserProfileRowProps): React.JSX.Element {
  const t = useTranslate()
  // Use role=button because nested dropdown/trash buttons make a native button invalid and trigger hydration warnings.
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={`flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors cursor-pointer ${
        isActive
          ? 'border-foreground/20 bg-accent/15'
          : 'border-border/70 hover:border-border hover:bg-accent/8'
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">
            {translateBrowserSessionProfileLabel(profile.label, profile.id)}
          </span>
          {isActive ? (
            <span className="shrink-0 rounded border border-border/50 px-1.5 text-[10px] font-medium leading-4 text-foreground/80">
              {t('auto.components.settings.BrowserProfileRow.c29648fe5b', 'Active')}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
        {isDefault ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-destructive"
            onClick={async () => {
              const ok = await useAppStore.getState().clearDefaultSessionCookies()
              if (ok) {
                toast.success(
                  t(
                    'auto.components.settings.BrowserProfileRow.2d4bea7f35',
                    'Default cookies cleared.'
                  )
                )
              }
            }}
          >
            <Trash2 className="size-3" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-destructive"
            onClick={async () => {
              const ok = await useAppStore.getState().deleteBrowserSessionProfile(profile.id)
              if (ok) {
                toast.success(
                  t(
                    'auto.components.settings.BrowserProfileRow.8e636cae25',
                    'Profile "{{value0}}" removed.',
                    { value0: translateBrowserSessionProfileLabel(profile.label, profile.id) }
                  )
                )
              }
            }}
          >
            <Trash2 className="size-3" />
          </Button>
        )}
      </div>
    </div>
  )
}
