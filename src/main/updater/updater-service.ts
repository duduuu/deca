// Deca is distributed through the internal package channel, so the in-app updater is inert:
// no feed, release, changelog or nudge requests are ever made.
import { app } from 'electron'
import type { BrowserWindow } from 'electron'
import type {
  LinuxPackageInstallInstructions,
  UpdateCheckOptions,
  UpdateStatus
} from '../../shared/update-status-types'
import type {
  RemoteServerUpdateInstallResult,
  RemoteServerUpdaterSnapshot,
  RemoteServerUpdateSupport
} from '../../shared/remote-server-update'
import type { ReleaseBuild, ReleaseChannel } from '../../shared/release-channel'
import type { ReleaseBuildListOptions } from './releases/updater-release-build-cache'
import type { UpdaterSetupOptions } from './lifecycle/updater-setup'
import type { UpdateInstallMode } from './lifecycle/updater-state'

const IDLE_STATUS: UpdateStatus = { state: 'idle' }

export function resolveUpdateInstallMode(isServeMode: boolean): UpdateInstallMode {
  return isServeMode ? 'unsupported-headless-serve' : 'interactive'
}

export function getUpdateStatus(): UpdateStatus {
  return IDLE_STATUS
}

export function getRemoteServerUpdateSupport(): RemoteServerUpdateSupport {
  return {
    installMode: 'unsupported-headless-serve',
    automatic: false,
    reason: 'updater-unavailable'
  }
}

export function getRemoteServerUpdaterSnapshot(runtimeId: string): RemoteServerUpdaterSnapshot {
  return {
    appVersion: app.getVersion(),
    runtimeId,
    support: getRemoteServerUpdateSupport(),
    status: IDLE_STATUS
  }
}

export function checkForRemoteServerUpdate(
  _runtimeId: string,
  _options?: UpdateCheckOptions
): RemoteServerUpdaterSnapshot {
  throw new Error('remote_update_manual_required')
}

export function downloadRemoteServerUpdate(_runtimeId: string): RemoteServerUpdaterSnapshot {
  throw new Error('remote_update_manual_required')
}

export function installRemoteServerUpdate(_runtimeId: string): RemoteServerUpdateInstallResult {
  throw new Error('remote_update_manual_required')
}

export function checkForUpdates(): void {}

export function checkForUpdatesFromMenu(_options?: UpdateCheckOptions): void {}

export function downloadUpdate(): void {}

export function quitAndInstall(): void {}

export function isQuittingForUpdate(): boolean {
  return false
}

export async function getLinuxPackageInstallInstructions(): Promise<LinuxPackageInstallInstructions> {
  throw new Error('updater_disabled')
}

export async function showLinuxPackage(): Promise<void> {}

export async function listAvailableReleaseBuilds(
  _channel: ReleaseChannel,
  _options?: ReleaseBuildListOptions
): Promise<ReleaseBuild[]> {
  return []
}

export function dismissNudge(): void {}

export function dismissAvailableUpdate(): void {}

export function setupAutoUpdater(
  _mainWindow: BrowserWindow | null,
  _opts?: UpdaterSetupOptions
): void {}
