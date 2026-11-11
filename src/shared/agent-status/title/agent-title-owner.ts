import type { AgentStatusEntry, AgentType } from '../contracts/agent-status-types'
import { getSyntheticAgentTitleProfile } from './synthetic-agent-title'

export type CompatibleAgentOwnerOptions = {
  /** Whether the owner comes from explicit launch intent. */
  ownerIsLaunch?: boolean
}

function sharedIdentityGroup(
  left: AgentType | null | undefined,
  right: AgentType | null | undefined
): boolean {
  const leftGroup = getSyntheticAgentTitleProfile(left)?.titleIdentityGroup
  const rightGroup = getSyntheticAgentTitleProfile(right)?.titleIdentityGroup
  return Boolean(leftGroup && leftGroup === rightGroup)
}

/** Unknown-launch remote sessions need foreground ownership before emitting titles whose identity can be re-owned. */
export function hasCompatibleAgentTitleIdentity(_title: string): boolean {
  return false
}

/** Launch ownership preserves the selected agent when both kinds share a title identity group. */
export function resolveCompatibleAgentTypeForOwner(
  incomingAgentType: AgentType | null | undefined,
  ownerAgentType: AgentType | null | undefined,
  _options?: CompatibleAgentOwnerOptions
): AgentType | undefined {
  if (!incomingAgentType) {
    return undefined
  }
  return sharedIdentityGroup(incomingAgentType, ownerAgentType)
    ? (ownerAgentType as AgentType)
    : incomingAgentType
}

/** No kept agent re-brands another agent's titles, so titles pass through unchanged. */
export function normalizeCompatibleAgentTitleForOwner(
  title: string,
  _ownerAgentType: AgentType | null | undefined,
  _options?: CompatibleAgentOwnerOptions
): string {
  return title
}

/** Keep mirrored owner/title aligned so later snapshots cannot repaint the tab under its wrapper agent. */
export function normalizeCompatibleAgentStatusEntryForOwner(
  entry: AgentStatusEntry,
  ownerAgentType: AgentType | null | undefined,
  options?: CompatibleAgentOwnerOptions
): AgentStatusEntry {
  const agentType = resolveCompatibleAgentTypeForOwner(entry.agentType, ownerAgentType, options)
  if (!agentType || agentType === entry.agentType) {
    return entry
  }
  return { ...entry, agentType }
}

/** Returns whether two agents share the same title identity group. */
export function shareCompatibleTitleIdentityGroup(
  left: AgentType | null | undefined,
  right: AgentType | null | undefined
): boolean {
  if (!left || !right) {
    return false
  }
  return left === right || sharedIdentityGroup(left, right)
}

/** Whether two reported kinds can name one running agent: equal, one title identity group, or
 *  Claude Code's teams wrapper and Claude itself.
 *  Only a false answer for two known kinds is evidence; display keeps each kind's own branding. */
export function sameAgentIdentity(left: AgentType, right: AgentType): boolean {
  const unwrapped = (kind: AgentType): AgentType =>
    kind === 'claude-agent-teams' ? 'claude' : kind
  return shareCompatibleTitleIdentityGroup(unwrapped(left), unwrapped(right))
}
