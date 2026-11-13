import type { TuiAgent } from '../../../../shared/agent-launch/catalog/tui-agent'
import type { StatusBarItem } from '../../../../shared/ui-chrome-types'

// Hide missing CLI items and toggles after detection; unknown detection preserves them to avoid cold-start flicker.
const CLI_GATED_ITEMS: ReadonlySet<StatusBarItem> = new Set([
  'claude',
  'codex',
  'gemini',
  'antigravity',
  'grok'
])

// Why: Deca never fetches these meters (no browser cookies or foreign credential reads).
const UNREPORTED_USAGE_ITEMS: ReadonlySet<StatusBarItem> = new Set([
  'opencode-go',
  'grok',
  'cursor'
])

export function isStatusBarItemAvailable(
  id: StatusBarItem,
  detectedAgentIds: TuiAgent[] | null
): boolean {
  if (UNREPORTED_USAGE_ITEMS.has(id)) {
    return false
  }
  if (!CLI_GATED_ITEMS.has(id)) {
    return true
  }
  if (detectedAgentIds === null) {
    return true
  }
  return detectedAgentIds.includes(id as TuiAgent)
}
