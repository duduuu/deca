import type { AgentHookSource } from './transport/agent-hook-relay'

export const HOOK_SOURCE_BY_PATHNAME: Readonly<Record<string, AgentHookSource>> = Object.freeze({
  '/hook/claude': 'claude',
  '/hook/codex': 'codex',
  '/hook/gemini': 'gemini',
  '/hook/antigravity': 'antigravity',
  '/hook/opencode': 'opencode',
  '/hook/opencode2': 'opencode2',
  '/hook/cursor': 'cursor',
  '/hook/grok': 'grok',
  '/hook/copilot': 'copilot',
  '/hook/devin': 'devin',
  '/hook/kiro': 'kiro'
})

export function resolveHookSource(pathname: string): AgentHookSource | null {
  return HOOK_SOURCE_BY_PATHNAME[pathname] ?? null
}
