import type { ExecutionHostId } from '../../shared/execution-host'
import { ipcRenderer } from 'electron'
import type { PreloadApi } from '../api-types'
import type { AutomationsChangedPayload } from '../../shared/runtime-client-events'

export const automationsApi = {
  snapshotWorkspaceName: (args: {
    workspaceId: string
    hostId: ExecutionHostId
    displayName: string
  }): Promise<number> => ipcRenderer.invoke('automations:snapshotWorkspaceName', args),
  onChanged: (callback: (payload: AutomationsChangedPayload) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: AutomationsChangedPayload) =>
      callback(payload)
    ipcRenderer.on('automations:changed', listener)
    return () => ipcRenderer.removeListener('automations:changed', listener)
  }
} satisfies PreloadApi['automations']
