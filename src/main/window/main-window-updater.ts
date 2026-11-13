import { app, ipcMain } from 'electron'
import type { BrowserWindow, IpcMainInvokeEvent } from 'electron'
import { isTrustedUIRenderer } from '../ipc/ui'
import type { ReleaseBuildListResult, UpdateCheckOptions } from '../../shared/update-status-types'
import { RELEASE_CHANNELS, type ReleaseChannel } from '../../shared/release-channel'
import type { Store } from '../persistence/loading-store/store'
import { updaterCodedMessage } from '../../shared/updater-failure-copy'
import {
  checkForUpdatesFromMenu,
  dismissAvailableUpdate,
  dismissNudge,
  downloadUpdate,
  getLinuxPackageInstallInstructions,
  getUpdateStatus,
  listAvailableReleaseBuilds,
  quitAndInstall,
  showLinuxPackage,
  type PreQuitCleanupFailureMode,
  type UpdateInstallMode
} from '../updater/updater-service'

// Deca has no in-app updater; these keep the renderer's updater IPC answering with idle state.
export function ensureAutoUpdaterConfigured(): void {}

type UpdaterSetupHooks = {
  onBeforeUpdateQuit?: () => void | Promise<void>
  onBeforeUpdateQuitFailure?: PreQuitCleanupFailureMode
  updateInstallMode?: UpdateInstallMode
}

export function setupHeadlessServeAutoUpdater(_store: Store, _options: UpdaterSetupHooks): void {}

export function scheduleMainWindowAutoUpdaterSetup(
  _mainWindow: BrowserWindow,
  _store: Store,
  _options?: UpdaterSetupHooks
): void {}

export function registerUpdaterHandlers(_store: Store): void {
  const handlers: Record<string, (...args: never[]) => unknown> = {
    'updater:getStatus': () => getUpdateStatus(),
    'updater:getVersion': () => app.getVersion(),
    'updater:check': (_event: unknown, options?: UpdateCheckOptions) =>
      checkForUpdatesFromMenu(options),
    'updater:download': () => downloadUpdate(),
    'updater:quitAndInstall': () => quitAndInstall(),
    'updater:dismissNudge': () => dismissNudge(),
    'updater:dismissAvailableUpdate': () => dismissAvailableUpdate(),
    'updater:getLinuxPackageInstallInstructions': (event: IpcMainInvokeEvent) => {
      assertTrustedUpdaterRecoverySender(event)
      return getLinuxPackageInstallInstructions()
    },
    'updater:showLinuxPackage': (event: IpcMainInvokeEvent) => {
      assertTrustedUpdaterRecoverySender(event)
      return showLinuxPackage()
    },
    'updater:listBuilds': async (
      _event: unknown,
      channel: ReleaseChannel
    ): Promise<ReleaseBuildListResult> => {
      if (!RELEASE_CHANNELS.includes(channel)) {
        return { ok: false, channel, ...updaterCodedMessage('unknownReleaseChannel', { channel }) }
      }
      return { ok: true, channel, builds: await listAvailableReleaseBuilds(channel) }
    }
  }
  for (const [channel, handler] of Object.entries(handlers)) {
    ipcMain.removeHandler(channel)
    ipcMain.handle(channel, handler as Parameters<typeof ipcMain.handle>[1])
  }
}

function assertTrustedUpdaterRecoverySender(event: IpcMainInvokeEvent): void {
  if (!isTrustedUIRenderer(event.sender)) {
    throw new Error('Unauthorized updater package recovery sender')
  }
}
