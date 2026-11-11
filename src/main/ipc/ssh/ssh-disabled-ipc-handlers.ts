import { ipcMain } from 'electron'

const SSH_UNAVAILABLE_MESSAGE = 'SSH hosts are not available in Deca.'

// Reads still answer so startup hydration and status surfaces stay quiet with no SSH hosts.
const EMPTY_SSH_READS: Record<string, () => unknown> = {
  'ssh:listTargets': () => [],
  'ssh:listRemovedTargetLabels': () => ({}),
  'ssh:getState': () => null,
  'ssh:needsPassphrasePrompt': () => false,
  'ssh:listPortForwards': () => [],
  'ssh:listUnrestoredPortForwards': () => [],
  'ssh:listDetectedPorts': () => []
}

const REFUSED_SSH_CHANNELS = [
  'ssh:addTarget',
  'ssh:updateTarget',
  'ssh:removeTarget',
  'ssh:importConfig',
  'ssh:listConfigHosts',
  'ssh:resolveConfigHost',
  'ssh:connect',
  'ssh:disconnect',
  'ssh:testConnection',
  'ssh:addPortForward',
  'ssh:updatePortForward',
  'ssh:removePortForward',
  'ssh:removeSavedPortForward',
  'ssh:browseDir',
  'ssh:submitCredential'
] as const

/** Deca keeps persisted SSH targets on disk but never lists, imports or connects them. */
export function registerDisabledSshIpcHandlers(): void {
  for (const [channel, read] of Object.entries(EMPTY_SSH_READS)) {
    ipcMain.removeHandler(channel)
    ipcMain.handle(channel, read)
  }
  for (const channel of REFUSED_SSH_CHANNELS) {
    ipcMain.removeHandler(channel)
    ipcMain.handle(channel, () => {
      throw new Error(SSH_UNAVAILABLE_MESSAGE)
    })
  }
}
