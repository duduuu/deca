import { ipcMain } from 'electron'
import { browserSessionRegistry } from '../../browser/sessions/profiles/browser-session-registry'
import { isTrustedBrowserRenderer } from './browser-renderer-trust'
import type {
  BrowserSessionProfile,
  BrowserSessionProfileScope
} from '../../../shared/browser-workspace-types'
import type { ManagedBrowserProfileOwner } from '../../../shared/browser/profiles/browser-profile-scope'
import { ensureManagedBrowserProfile } from '../../browser/sessions/profiles/browser-managed-session-profiles'
import {
  getBrowserIdentityModeStatus,
  setBrowserIdentityMode
} from '../../browser/identity/mode/browser-identity-mode-store'
import {
  listBrowserSitePermissions,
  setBrowserSitePermissionDecisions
} from '../../browser/site-settings/permissions/browser-site-permission-store'
import {
  isBrowserSitePermission,
  isBrowserSitePermissionDecision,
  type BrowserSitePermissionEntry
} from '../../../shared/browser-site-permission'

export function registerBrowserSessionProfileHandlers(): void {
  ipcMain.removeHandler('browser:session:listProfiles')
  ipcMain.removeHandler('browser:session:createProfile')
  ipcMain.removeHandler('browser:session:deleteProfile')
  ipcMain.removeHandler('browser:session:ensureManagedProfile')
  ipcMain.removeHandler('browser:identity:get')
  ipcMain.removeHandler('browser:identity:set')
  ipcMain.removeHandler('browser:session:resolvePartition')
  ipcMain.removeHandler('browser:sitePermissions:list')
  ipcMain.removeHandler('browser:sitePermissions:set')

  ipcMain.handle('browser:session:listProfiles', (event): BrowserSessionProfile[] => {
    if (!isTrustedBrowserRenderer(event.sender)) {
      return []
    }
    return browserSessionRegistry.listProfiles()
  })

  ipcMain.handle(
    'browser:session:createProfile',
    async (
      event,
      args: { scope: BrowserSessionProfileScope; label: string }
    ): Promise<BrowserSessionProfile | null> => {
      if (!isTrustedBrowserRenderer(event.sender)) {
        return null
      }
      return await browserSessionRegistry.createProfile(args.scope, args.label)
    }
  )

  ipcMain.handle(
    'browser:session:ensureManagedProfile',
    (event, args: { owner: ManagedBrowserProfileOwner; label: string }) =>
      isTrustedBrowserRenderer(event.sender)
        ? ensureManagedBrowserProfile(args?.owner, args?.label)
        : null
  )

  ipcMain.handle('browser:identity:get', (event) => {
    if (!isTrustedBrowserRenderer(event.sender)) {
      return null
    }
    return getBrowserIdentityModeStatus()
  })

  ipcMain.handle('browser:identity:set', async (event, mode: unknown) => {
    if (!isTrustedBrowserRenderer(event.sender)) {
      return null
    }
    // Match RPC rejection: silently coercing future modes would report false success.
    if (mode !== 'clean' && mode !== 'native') {
      throw new Error(`Unsupported browser identity mode: ${String(mode)}`)
    }
    return setBrowserIdentityMode(mode)
  })

  ipcMain.handle(
    'browser:session:deleteProfile',
    async (event, args: { profileId: string }): Promise<boolean> => {
      if (!isTrustedBrowserRenderer(event.sender)) {
        return false
      }
      return browserSessionRegistry.deleteProfile(args.profileId)
    }
  )

  ipcMain.handle(
    'browser:session:resolvePartition',
    (event, args: { profileId: string | null }): string | null => {
      if (!isTrustedBrowserRenderer(event.sender)) {
        return null
      }
      return browserSessionRegistry.resolvePartition(args.profileId)
    }
  )

  ipcMain.handle(
    'browser:sitePermissions:list',
    (event, args: { profileId: string }): BrowserSitePermissionEntry[] => {
      if (
        !isTrustedBrowserRenderer(event.sender) ||
        !browserSessionRegistry.getProfile(args.profileId)
      ) {
        return []
      }
      return listBrowserSitePermissions(args.profileId)
    }
  )

  ipcMain.handle(
    'browser:sitePermissions:set',
    (
      event,
      args: { profileId: string; origin: string; permission: unknown; decision: unknown }
    ): BrowserSitePermissionEntry[] => {
      if (
        !isTrustedBrowserRenderer(event.sender) ||
        !browserSessionRegistry.getProfile(args.profileId)
      ) {
        return []
      }
      if (
        !isBrowserSitePermission(args.permission) ||
        (args.decision !== null && !isBrowserSitePermissionDecision(args.decision))
      ) {
        throw new Error('Unsupported site permission change')
      }
      setBrowserSitePermissionDecisions(
        args.profileId,
        args.origin,
        [args.permission],
        args.decision
      )
      return listBrowserSitePermissions(args.profileId)
    }
  )

  ipcMain.removeHandler('browser:session:clearDefaultCookies')

  ipcMain.handle('browser:session:clearDefaultCookies', async (event): Promise<boolean> => {
    if (!isTrustedBrowserRenderer(event.sender)) {
      return false
    }
    return browserSessionRegistry.clearDefaultSessionCookies()
  })
}
