import type { AgentType } from '../contracts/agent-status-types'

// Share agent names across desktop and mobile.
const WELL_KNOWN_LABELS: Record<string, string> = {
  claude: 'Claude',
  codex: 'Codex',
  qodercli: 'Qoder CLI',
  gemini: 'Gemini',
  antigravity: 'Antigravity',
  copilot: 'GitHub Copilot',
  opencode: 'OpenCode',
  opencode2: 'OpenCode 2',
  cursor: 'Cursor',
  grok: 'Grok',
  devin: 'Devin'
}

export function formatAgentTypeLabel(agentType: AgentType | null | undefined): string {
  if (!agentType || agentType === 'unknown') {
    return 'Agent'
  }
  // Capitalize well-known names nicely; pass through custom names as-is
  return WELL_KNOWN_LABELS[agentType] ?? agentType
}
