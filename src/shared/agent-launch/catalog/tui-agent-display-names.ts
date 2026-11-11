import type { TuiAgent } from './tui-agent'

/** English names for shared/nonlocalized keybinding surfaces; keep aligned with renderer agent-catalog.tsx labels. */
export const TUI_AGENT_DISPLAY_NAMES: Record<TuiAgent, string> = {
  claude: 'Claude',
  'claude-agent-teams': 'Claude Agent Teams',
  codex: 'Codex',
  devin: 'Devin',
  opencode: 'OpenCode',
  opencode2: 'OpenCode 2',
  gemini: 'Gemini',
  antigravity: 'Antigravity',
  kiro: 'Kiro',
  cursor: 'Cursor',
  copilot: 'GitHub Copilot',
  grok: 'Grok'
}

/** Derive the exhaustive list here so shared modules need no renderer import. */
export const ALL_TUI_AGENTS = Object.keys(TUI_AGENT_DISPLAY_NAMES) as readonly TuiAgent[]

/** The display name of `agent`, or null when it names no TUI agent. */
export function tuiAgentDisplayName(agent: string): string | null {
  return Object.entries(TUI_AGENT_DISPLAY_NAMES).find(([id]) => id === agent)?.[1] ?? null
}
