import { useState } from 'react'
import { Check, Plus, UserRound } from 'lucide-react'
import {
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from '@/components/ui/dropdown-menu'
import { useTranslate } from '@/i18n/use-translate'
import { translateBrowserSessionProfileLabel } from '@/lib/browser/profiles/browser-session-profile-label'
import type { BrowserSessionProfile } from '../../../../../shared/browser-workspace-types'

export type BrowserToolbarProfileSubProps = {
  browserPageId: string
  allProfiles: BrowserSessionProfile[]
  effectiveProfileId: string
  onSwitchProfile: (profileId: string | null) => void
  onNewProfile: () => void
}

/** Which browser profile the page uses. */
export function BrowserToolbarProfileSub({
  browserPageId,
  allProfiles,
  effectiveProfileId,
  onSwitchProfile,
  onNewProfile
}: BrowserToolbarProfileSubProps): React.JSX.Element {
  const t = useTranslate()
  const [open, setOpen] = useState(false)
  const currentProfile = allProfiles.find((profile) => profile.id === effectiveProfileId)
  return (
    <DropdownMenuSub open={open} onOpenChange={setOpen}>
      <DropdownMenuSubTrigger>
        <UserRound className="mr-2 size-3.5" />
        {t('browser.toolbar.profile', 'Profile')}
        <span className="ml-auto truncate pl-2 text-xs text-muted-foreground">
          {translateBrowserSessionProfileLabel(currentProfile?.label, effectiveProfileId)}
        </span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent className="w-56" data-browser-page-menu-id={browserPageId}>
          {allProfiles.map((profile) => {
            const isSelectedProfile = profile.id === effectiveProfileId
            return (
              <DropdownMenuItem
                key={profile.id}
                onSelect={() => onSwitchProfile(profile.id === 'default' ? null : profile.id)}
              >
                <Check
                  className={`mr-2 size-3.5 shrink-0 ${isSelectedProfile ? 'opacity-100' : 'opacity-0'}`}
                />
                <span className="truncate">
                  {translateBrowserSessionProfileLabel(profile.label, profile.id)}
                </span>
              </DropdownMenuItem>
            )
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onNewProfile}>
            <Plus className="mr-2 size-3.5" />
            {t('auto.components.browser.pane.BrowserToolbarMenu.cf7cdc67ef', 'New Profile…')}
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  )
}
