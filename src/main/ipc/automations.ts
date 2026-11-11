import { parseExecutionHostId } from '../../shared/execution-host'
import { hostWorktreeTarget } from '../../shared/worktree/host-qualified-identity'
import { ipcMain } from 'electron'
import type { Store } from '../persistence/loading-store/store'
import type { AutomationService } from '../automations/service'

export function registerAutomationHandlers(store: Store, _service: AutomationService): void {
  ipcMain.handle(
    'automations:snapshotWorkspaceName',
    (_event, args: { workspaceId: string; hostId?: string; displayName: string }): number => {
      const host = parseExecutionHostId(args.hostId)
      // No host, no label: a bare id would also relabel a same-id twin's runs.
      return host
        ? store.snapshotAutomationRunWorkspaceDisplayName(
            hostWorktreeTarget({ id: args.workspaceId, hostId: host.id }),
            args.displayName
          )
        : 0
    }
  )
}
