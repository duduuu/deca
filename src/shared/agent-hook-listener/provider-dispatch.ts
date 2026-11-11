import type { AgentMainAgentStatus } from '../agent-status/lifecycle/main-agent-status'
import type { ParsedAgentStatusPayload } from '../agent-status/contracts/agent-status-types'
import type { AgentHookSource } from './transport/agent-hook-relay'
import { readHostTurnSignals } from './state/agent-hook-turn-end-timing'
import type { AgentHookEventPayload } from './listener-event'
import { readGrokHomeEnvelope } from './grok-result-discovery'
import { readFirstString } from './interactive-tool'
import type { HookListenerState } from './listener-state'
import type { ExtractedPromptText } from './prompt-fields'
import { isNewTurnEvent } from './provider-event-routing'
import { readLastUserPromptFromTranscript } from './transcript-lines'
import { normalizeAntigravityEvent } from './providers/antigravity-events'
import { normalizeClaudeEvent } from './providers/claude-events'
import { codexHookEventForEndedTurn, normalizeCodexEvent } from './providers/codex-events'
import { codexHookEventForEphemeralThread } from './providers/codex-ephemeral-threads'
import { normalizeGeminiEvent } from './providers/gemini-events'
import { normalizeOpenCodeFamilyEvent } from './providers/opencode-family-events'
import { normalizeCursorEvent } from './providers/cursor-events'
import { normalizeGrokEvent } from './providers/grok-events'
import { normalizeCopilotEvent } from './providers/copilot-events'
import { normalizeDevinEvent } from './providers/devin-events'
import { normalizeKiroEvent } from './providers/kiro-events'

export type ProviderDispatchResult = {
  payload: ParsedAgentStatusPayload | null
  resolvedPromptText: string
  promptInteractionKey?: string
  hasTranscriptPromptEvidence: boolean
  /** The event the payload was normalized as, which a provider may restate (Codex ended turns). */
  eventName: unknown
  hostTurnSignals: Pick<AgentHookEventPayload, 'stopHookActive' | 'nativeTurnKey'>
  /** Full reply text this hook carried, outside the cached tool snapshot; refreshes carry none. */
  replyCandidate: string | undefined
}

/** Exhaustive provider routing with provider-specific transcript locality and attribution. */
export function normalizeProviderEvent(input: {
  state: HookListenerState
  source: AgentHookSource
  eventName: unknown
  promptText: string
  paneKey: string
  hookPayload: Record<string, unknown>
  envelope: Record<string, unknown>
  extractedPrompt: ExtractedPromptText
  previousOpenCodeMainAgent?: AgentMainAgentStatus
}): ProviderDispatchResult {
  const { state, source, promptText, paneKey, hookPayload, envelope, extractedPrompt } = input
  // Ephemeral side chats share the pane but must not replace its recorded main turn.
  const codexEventName =
    source === 'codex'
      ? codexHookEventForEphemeralThread(state, paneKey, input.eventName, hookPayload)
      : undefined
  const eventName =
    source !== 'codex'
      ? input.eventName
      : codexEventName === undefined
        ? undefined
        : codexHookEventForEndedTurn(state, paneKey, codexEventName, hookPayload)
  let resolvedPromptText = promptText
  let promptInteractionKey: string | undefined
  let hasTranscriptPromptEvidence = false
  let payload: ParsedAgentStatusPayload | null
  state.eventReplyCandidate = undefined

  switch (source) {
    case 'claude':
      payload = normalizeClaudeEvent(state, eventName, promptText, paneKey, hookPayload)
      break
    case 'codex':
      payload = normalizeCodexEvent(
        state,
        eventName,
        promptText,
        paneKey,
        hookPayload,
        input.eventName
      )
      break
    case 'gemini':
      payload = normalizeGeminiEvent(state, eventName, promptText, paneKey, hookPayload)
      break
    case 'antigravity':
      if (isNewTurnEvent('antigravity', eventName)) {
        resolvedPromptText =
          promptText ||
          readLastUserPromptFromTranscript(
            readFirstString(hookPayload, ['transcriptPath', 'transcript_path'])
          ) ||
          ''
      }
      payload = normalizeAntigravityEvent(state, eventName, promptText, paneKey, hookPayload)
      break
    case 'opencode':
    case 'opencode2':
    case 'mimo-code': {
      if (extractedPrompt.source === 'role_user_text') {
        const messageId = readFirstString(hookPayload, ['messageID', 'messageId', 'message_id'])
        const prefix = source === 'mimo-code' ? 'mimo-code-message' : `${source}-message`
        promptInteractionKey = messageId ? `${prefix}-${messageId}` : undefined
      }
      payload = normalizeOpenCodeFamilyEvent(
        source,
        state,
        eventName,
        promptText,
        paneKey,
        hookPayload,
        input.previousOpenCodeMainAgent
      )
      break
    }
    case 'cursor':
      payload = normalizeCursorEvent(state, eventName, promptText, paneKey, hookPayload)
      break
    case 'grok':
      payload = normalizeGrokEvent(
        state,
        eventName,
        promptText,
        paneKey,
        hookPayload,
        readGrokHomeEnvelope(envelope)
      )
      break
    case 'copilot':
      payload = normalizeCopilotEvent(state, eventName, promptText, paneKey, hookPayload)
      break
    case 'devin':
      payload = normalizeDevinEvent(state, eventName, promptText, paneKey, hookPayload)
      break
    case 'kiro':
      payload = normalizeKiroEvent(state, eventName, promptText, paneKey, hookPayload)
  }
  const replyCandidate = state.eventReplyCandidate
  state.eventReplyCandidate = undefined

  return {
    payload,
    resolvedPromptText,
    promptInteractionKey,
    hasTranscriptPromptEvidence,
    eventName,
    hostTurnSignals: readHostTurnSignals(source, hookPayload, promptInteractionKey),
    replyCandidate
  }
}
