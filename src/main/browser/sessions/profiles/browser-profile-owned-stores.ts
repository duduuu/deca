import { forgetBrowserSiteDisplay } from '../../site-settings/display/browser-site-display-store'
import { forgetBrowserSitePermissions } from '../../site-settings/permissions/browser-site-permission-store'

/** Drops everything Orca stores per browser profile outside its Chromium partition. */
export function forgetBrowserProfileOwnedStores(profileId: string): boolean {
  forgetBrowserSitePermissions(profileId)
  forgetBrowserSiteDisplay(profileId)
  return true
}
