import { ipcMain } from 'electron'
import { REMOTE_SERVERS_UNAVAILABLE_MESSAGE } from '../../../shared/remote-runtime/host-catalog/runtime-environments'

/** Pairing-code repair only exists for paired remote servers, which Deca never reaches. */
export function registerRuntimeEnvironmentRepairHandler(_options: {
  getUserDataPath: () => string
  invalidateTransport: (environmentId: string) => Promise<void> | void
}): void {
  ipcMain.handle('runtimeEnvironments:repairFromPairingCode', () => {
    throw new Error(REMOTE_SERVERS_UNAVAILABLE_MESSAGE)
  })
}
