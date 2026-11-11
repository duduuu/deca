import type { TuiAgent } from '../agent-launch/catalog/tui-agent'

export type NativeChatTranscriptAgent = 'claude' | 'codex' | 'grok' | 'opencode'

/** Agents whose transcripts the native chat view can parse and render. */
export const NATIVE_CHAT_SUPPORTED_AGENT_LIST: readonly TuiAgent[] = [
  'claude',
  'codex',
  'grok',
  'opencode',
  'opencode2'
]

export const NATIVE_CHAT_SUPPORTED_AGENTS: ReadonlySet<string> = new Set(
  NATIVE_CHAT_SUPPORTED_AGENT_LIST
)

export function isNativeChatSupportedAgent(agent: string | null | undefined): boolean {
  return agent != null && NATIVE_CHAT_SUPPORTED_AGENTS.has(agent)
}

/** Agents whose Model-A SSH transcript reader is not supported. */
export function nativeChatRequiresLocalTranscript(agent: string | null | undefined): boolean {
  const transcriptAgent = resolveNativeChatTranscriptAgent(agent)
  return transcriptAgent === 'grok' || transcriptAgent === 'opencode'
}

/** Selector TUIs require key steps rather than pasted option labels. */
export function shouldStepNativeChatAskAnswer(agent: string | null | undefined): boolean {
  const transcriptAgent = resolveNativeChatTranscriptAgent(agent)
  return (
    transcriptAgent === 'claude' || transcriptAgent === 'codex' || transcriptAgent === 'opencode'
  )
}

/** No kept agent needs asks answered in its terminal. */
export function nativeChatAskRequiresTerminal(_agent: string | null | undefined): boolean {
  return false
}

/** OpenCode confirms an interrupt with a second Escape; Claude Code and Codex read Esc-Esc at an idle prompt as rewind. */
export function nativeChatStopSendsSecondEscape(agent: string | null | undefined): boolean {
  return resolveNativeChatTranscriptAgent(agent) === 'opencode'
}

export function resolveNativeChatTranscriptAgent(
  agent: string | null | undefined
): NativeChatTranscriptAgent | null {
  if (agent === 'claude') {
    return 'claude'
  }
  if (agent === 'opencode' || agent === 'opencode2') {
    return 'opencode'
  }
  if (agent === 'codex' || agent === 'grok') {
    return agent
  }
  return null
}

export function nativeChatApprovalAcceptKey(agent: string | null | undefined): string {
  return resolveNativeChatTranscriptAgent(agent) === 'opencode' ? '\r' : '1'
}
