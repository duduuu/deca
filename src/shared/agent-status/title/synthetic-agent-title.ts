import type { AgentStatusState, AgentType } from '../contracts/agent-status-types'
import type { TuiAgent } from '../../agent-launch/catalog/tui-agent'
export type SyntheticAgentTitleProfile = {
  workingLabel: string
  permissionLabel: string
  idleLabel: string
  titleIdentityGroup?: string
  synthesizeTerminalTitle?: boolean
  synthesizeWorkingTitle?: boolean
}

export const SYNTHETIC_AGENT_TITLE_AGENTS = [
  'codex',
  'cursor',
  'opencode',
  'devin'
] as const satisfies readonly TuiAgent[]

export const SYNTHETIC_AGENT_TITLE_PROFILES: Record<string, SyntheticAgentTitleProfile> = {
  codex: {
    workingLabel: 'Codex',
    permissionLabel: 'Codex - action required',
    idleLabel: 'Codex ready',
    // Keep native Codex working/spinner titles; synthesize terminal states when its final OSC frame is missing.
    synthesizeWorkingTitle: false
  },
  cursor: {
    workingLabel: 'Cursor Agent',
    permissionLabel: 'Cursor - action required',
    idleLabel: 'Cursor ready',
    // cursor-agent paints its own chat-name title through a turn; reasserting ours makes the tab flicker.
    synthesizeWorkingTitle: false
  },
  opencode: {
    workingLabel: 'OpenCode',
    permissionLabel: 'OpenCode - action required',
    idleLabel: 'OpenCode ready',
    // Preserve OpenCode’s own semantic session titles.
    synthesizeTerminalTitle: false
  },
  devin: {
    workingLabel: 'Devin',
    permissionLabel: 'Devin - action required',
    idleLabel: 'Devin ready'
  }
}

const SYNTHETIC_PERMISSION_TITLES: ReadonlySet<string> = new Set(
  Object.values(SYNTHETIC_AGENT_TITLE_PROFILES)
    .filter((profile) => profile.synthesizeTerminalTitle !== false)
    .map((profile) => profile.permissionLabel.toLowerCase())
)

export function isSyntheticAgentPermissionTitle(title: string): boolean {
  return SYNTHETIC_PERMISSION_TITLES.has(title.trim().toLowerCase())
}

export function getSyntheticAgentTitleProfile(
  agentType: AgentType | null | undefined
): SyntheticAgentTitleProfile | null {
  if (!agentType) {
    return null
  }
  return SYNTHETIC_AGENT_TITLE_PROFILES[agentType] ?? null
}

export function getSyntheticAgentTerminalTitle(
  agentType: AgentType | null | undefined,
  state: AgentStatusState
): string | null {
  const profile = getSyntheticAgentTitleProfile(agentType)
  if (!profile || profile.synthesizeTerminalTitle === false || state === 'working') {
    return null
  }
  return state === 'blocked' || state === 'waiting' ? profile.permissionLabel : profile.idleLabel
}

export function shouldDriveSyntheticAgentTitleFromHook(
  agentType: AgentType | null | undefined,
  state: AgentStatusState
): boolean {
  const profile = getSyntheticAgentTitleProfile(agentType)
  if (!profile || profile.synthesizeTerminalTitle === false) {
    return false
  }
  return state !== 'working' || profile.synthesizeWorkingTitle !== false
}
