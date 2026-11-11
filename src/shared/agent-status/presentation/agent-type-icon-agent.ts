import type { AgentType } from '../contracts/agent-status-types'
import type { TerminalAgent } from '../identity/terminal-agent'
import { isTuiAgent } from '../../agent-launch/catalog/tui-agent-config'

const ICONABLE_AGENT_TYPES: Record<TerminalAgent, true> = {
  claude: true,
  'claude-agent-teams': true,
  codex: true,
  opencode: true,
  opencode2: true,
  gemini: true,
  antigravity: true,
  kiro: true,
  cursor: true,
  copilot: true,
  grok: true,
  devin: true
}

// Why: return null (not a 'claude' fallback) for unknown so Codex panes don't flash the Claude icon before the hook fires.
export function agentTypeToIconAgent(
  agentType: AgentType | null | undefined
): TerminalAgent | null {
  if (!agentType || agentType === 'unknown') {
    return null
  }
  if (agentType === 'dsb') {
    return 'dsb'
  }
  return isTuiAgent(agentType) && Object.hasOwn(ICONABLE_AGENT_TYPES, agentType) ? agentType : null
}
