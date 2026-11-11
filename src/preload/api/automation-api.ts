import type { ExecutionHostId } from '../../shared/execution-host'
import type { AutomationsChangedPayload } from '../../shared/runtime-client-events'

// Automation CRUD uses runtime RPC; this IPC API handles desktop-only calls.
export type AutomationsApi = {
  snapshotWorkspaceName: (args: {
    workspaceId: string
    hostId: ExecutionHostId
    displayName: string
  }) => Promise<number>
  onChanged: (callback: (payload: AutomationsChangedPayload) => void) => () => void
}
