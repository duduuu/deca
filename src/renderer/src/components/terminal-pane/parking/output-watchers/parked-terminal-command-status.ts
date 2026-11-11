/** Keep store-level command status while parked; foreground confirmation and input-intent inference remain with mounted panes. */
import type { AgentStatusEntry } from '../../../../../../shared/agent-status/contracts/agent-status-types'
import { parseAppSshPtyId } from '../../../../../../shared/ssh-pty-id'
import { isShellProcess } from '../../../../../../shared/agent-status/process/shell-process-detection'
import { dispatchTerminalCommandFinishedEvent } from '@/hooks/terminal-command-finished-event'
import { isRetainedProgramResult } from '@/lib/program-status/row'
import { useAppStore } from '@/store/index'
import { isRemoteExecutionHostPtyId } from '../../../../../../shared/execution-host/remote-execution-host-pty-id'

export type ParkedTerminalCommandStatusPolicy = {
  onCommandFinished: (bestEffortExitCode: number | null) => void
  dispose: () => void
}

export function createParkedTerminalCommandStatusPolicy(options: {
  ptyId: string
  worktreeId: string
  tabId: string
  /** PaneManager pane id whose runtime-title slot the watcher writes; read for status title pairing. */
  paneId: number
  paneKey: string
}): ParkedTerminalCommandStatusPolicy {
  const { ptyId, worktreeId, paneKey } = options
  let disposed = false

  // Mirror mounted same-turn status drops without interrupt inference: parked panes receive no key events.
  const dropCommandFinishedStatusIfSameTurn = (entry: AgentStatusEntry | undefined): void => {
    const state = useAppStore.getState()
    if (!entry) {
      // An agent can exit before its first hook; clear launch identity on command exit like mounted panes.
      state.clearAgentLaunchConfig(paneKey)
      return
    }
    const current = state.agentStatusByPaneKey[paneKey]
    if (!current) {
      state.clearAgentLaunchConfig(paneKey)
      return
    }
    const unchanged =
      current.state === entry.state &&
      current.prompt === entry.prompt &&
      current.updatedAt === entry.updatedAt &&
      current.stateStartedAt === entry.stateStartedAt &&
      current.agentType === entry.agentType
    if (!unchanged) {
      return
    }
    if (!isRetainedProgramResult(current)) {
      state.dropAgentStatus(paneKey)
    }
  }

  // Confirm nested-shell 133;D once before retiring identity; mounted panes own the retry ladder.
  const retireForegroundAgentUnlessConfirmed = async (): Promise<void> => {
    const entry = useAppStore.getState().paneForegroundAgentByPaneKey[paneKey]
    if (!entry?.agent) {
      return
    }
    // Why: a parked pane holds no remote incarnation to fence host evidence with, so it has no answer.
    const remote = isRemoteExecutionHostPtyId(ptyId)
    let processName: string | null = null
    if (!remote) {
      try {
        processName = await window.api.pty.confirmForegroundProcess(ptyId)
      } catch {
        processName = null
      }
    }
    const state = useAppStore.getState()
    if (disposed || state.paneForegroundAgentByPaneKey[paneKey] !== entry) {
      return
    }
    if (processName === null || isShellProcess(processName)) {
      state.setPaneForegroundAgent(paneKey, { agent: null, shellForeground: false })
    }
  }

  return {
    onCommandFinished: (bestEffortExitCode: number | null): void => {
      if (disposed) {
        return
      }
      // Commands can change HEAD/index; nudge git UI immediately rather than wait for polling.
      dispatchTerminalCommandFinishedEvent(worktreeId, bestEffortExitCode)
      void retireForegroundAgentUnlessConfirmed()
      // Mirror SSH’s unprobed same-turn drop; local PTYs require mounted foreground confirmation against nested-shell 133;D.
      if (parseAppSshPtyId(ptyId) === null) {
        return
      }
      dropCommandFinishedStatusIfSameTurn(useAppStore.getState().agentStatusByPaneKey[paneKey])
    },

    dispose: (): void => {
      disposed = true
    }
  }
}
