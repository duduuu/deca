import type { AiVaultAgent } from '../contracts/ai-vault-types'
import type { AiVaultSearchStatus } from './ai-vault-search-types'

// Frozen to the v1.4.211 parser; extending the current catalog must not widen old-host requests.
const LEGACY_SEARCH_AGENTS: readonly AiVaultAgent[] = [
  'claude',
  'codex',
  'cursor',
  'gemini',
  'antigravity',
  'copilot',
  'opencode',
  'opencode2',
  'grok',
  'devin'
]

export function compatibleSearchAgents(
  agents: readonly AiVaultAgent[],
  status: Pick<AiVaultSearchStatus, 'supportedAgents'>
): AiVaultAgent[] {
  const supported = new Set(status.supportedAgents ?? LEGACY_SEARCH_AGENTS)
  return agents.filter((agent) => supported.has(agent))
}
