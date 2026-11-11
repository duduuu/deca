import type { TuiAgent } from './tui-agent'

/** Google favicon-service domains for agents both apps draw from a favicon. */
export const TUI_AGENT_FAVICON_DOMAINS: Partial<Record<TuiAgent, string>> = {
  grok: 'x.ai',
  gemini: 'gemini.google.com',
  antigravity: 'antigravity.google',
  kiro: 'kiro.dev',
  cursor: 'cursor.com',
  devin: 'devin.ai'
}
