import type React from 'react'
import { getAgentCatalog, getAgentLabel } from '../../../lib/agent-catalog/agent-catalog'
import { ClaudeIcon, OpenAIIcon } from '@/components/status-bar/icons'
import type { TerminalAgent } from '../../../../../shared/agent-status/identity/terminal-agent'
import { AgentLetterIcon, CopilotIcon, OpenCodeIcon } from './agent-icon-glyphs'
import { AGENT_FAVICON_ASSETS } from './agent-favicon-assets'

export function AgentIcon({
  agent,
  size = 14,
  className
}: {
  agent: TerminalAgent | null | undefined
  size?: number
  className?: string
}): React.JSX.Element {
  // Unknown identity gets a neutral glyph so Codex panes cannot briefly display Claude’s icon before hooks arrive.
  if (!agent) {
    return <AgentLetterIcon letter="?" size={size} className={className} />
  }
  if (agent === 'claude' || agent === 'claude-agent-teams') {
    return <ClaudeIcon size={size} className={className} />
  }
  if (agent === 'codex') {
    return <OpenAIIcon size={size} className={className} />
  }
  if (agent === 'copilot') {
    return <CopilotIcon size={size} className={className} />
  }
  if (agent === 'opencode' || agent === 'opencode2') {
    return <OpenCodeIcon size={size} className={className} />
  }
  const catalogEntry = getAgentCatalog().find((a) => a.id === agent)
  // Prefer bundled favicons for offline use and regions where Google’s service is unreachable (#8451).
  const bundledFaviconUrl = AGENT_FAVICON_ASSETS[agent]
  // Resolve src once so empty iconUrl cannot pass a truthy fallback guard yet render src="".
  const iconSrc = catalogEntry?.iconUrl ?? bundledFaviconUrl
  if (iconSrc) {
    return (
      <img
        src={iconSrc}
        width={size}
        height={size}
        className={className}
        alt=""
        aria-hidden
        style={{ borderRadius: 2 }}
      />
    )
  }
  // Why: Deca never asks Google's favicon service; agents without a bundled icon get a letter.
  return (
    <AgentLetterIcon
      letter={getAgentLabel(agent).charAt(0).toUpperCase()}
      size={size}
      className={className}
    />
  )
}
