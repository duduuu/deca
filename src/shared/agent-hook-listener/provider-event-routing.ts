import type { AgentHookSource } from './transport/agent-hook-relay'
import { isKnownHarnessInjectedUserTurnText } from '../harness-injected-user-turns'
import type { ToolSnapshot } from './listener-event'
import type { ExtractedPromptText } from './prompt-fields'
import { extractClaudeToolFields } from './providers/claude-tool-fields'
import { extractCodexToolFields } from './providers/codex-tool-fields'
import { extractGeminiToolFields } from './providers/gemini-tool-fields'
import { extractAntigravityToolFields } from './providers/antigravity-tool-fields'
import { extractOpenCodeToolFields } from './providers/opencode-family-tool-fields'
import { extractCursorToolFields } from './providers/cursor-tool-fields'
import {
  extractCopilotToolFields,
  normalizeCopilotEventName
} from './providers/copilot-tool-fields'
import { isGrokEvent } from './provider-event-names'
import { extractGrokToolFields } from './providers/grok-tool-fields'
import { extractKiroToolFields } from './providers/kiro-tool-fields'

/** Share provider boundaries with observation stamping; avoid a second event-name list. */
export function isNewTurnEvent(source: AgentHookSource, eventName: unknown): boolean {
  // Why: exhaustive switch so a new AgentHookSource fails typecheck here instead of falling through to false.
  switch (source) {
    case 'claude':
      // SessionStart is idle but must clear previous-session tool/prompt caches (STA-3386).
      return eventName === 'SessionStart' || eventName === 'UserPromptSubmit'
    case 'codex':
      return eventName === 'SessionStart' || eventName === 'UserPromptSubmit'
    case 'gemini':
      return eventName === 'BeforeAgent'
    case 'antigravity':
      return eventName === 'PreInvocation'
    case 'opencode':
    case 'opencode2':
      return eventName === 'SessionStart'
    case 'cursor':
      return eventName === 'beforeSubmitPrompt' || eventName === 'sessionStart'
    case 'grok':
      return isGrokEvent(eventName, 'user_prompt_submit')
    case 'copilot': {
      const normalizedEventName = normalizeCopilotEventName(eventName)
      return normalizedEventName === 'SessionStart' || normalizedEventName === 'UserPromptSubmit'
    }
    case 'devin':
      // Devin handles SessionStart early; UserPromptSubmit is its turn boundary.
      return eventName === 'UserPromptSubmit'
    case 'kiro':
      // Why: agentSpawn opens a fresh session in the pane, so stale tool/prompt caches go too.
      return (
        eventName === 'agentSpawn' ||
        eventName === 'userPromptSubmit' ||
        eventName === 'UserPromptSubmit'
      )
  }
}

/** Only main-agent turn-end events count; reminders/session events/enrichment merely restate them. */
export function isTurnEndEvent(source: AgentHookSource, eventName: unknown): boolean {
  // Why: exhaustive switch so a new AgentHookSource fails typecheck here instead of falling through to false.
  switch (source) {
    case 'claude':
      return eventName === 'Stop' || eventName === 'StopFailure'
    case 'codex':
    case 'antigravity':
    case 'devin':
      return eventName === 'Stop'
    case 'gemini':
      return eventName === 'AfterAgent'
    case 'cursor':
    case 'kiro':
      return eventName === 'stop'
    case 'grok':
      return isGrokEvent(eventName, 'stop', 'stop_failure', 'stop_cancelled')
    case 'copilot':
      return normalizeCopilotEventName(eventName) === 'Stop'
    case 'opencode':
    case 'opencode2':
      // Why: their done events are status snapshots or milestones that can repeat within one turn.
      return false
  }
}

export function hasExplicitUserPrompt(
  source: AgentHookSource,
  eventName: unknown,
  extractedPrompt: ExtractedPromptText,
  resolvedPromptText: string,
  _hasTranscriptPromptEvidence = false
): boolean {
  if (
    source === 'antigravity' &&
    isNewTurnEvent(source, eventName) &&
    resolvedPromptText.trim().length > 0
  ) {
    return true
  }
  if (extractedPrompt.source === 'role_user_text') {
    return (source === 'opencode' || source === 'opencode2') && eventName === 'MessagePart'
  }
  if (extractedPrompt.text.length === 0) {
    return false
  }
  // Known harness tags confer no user-submit telemetry/stickiness; preserve real unknown-tag prompts.
  if (isKnownHarnessInjectedUserTurnText(extractedPrompt.text)) {
    return false
  }
  // message may be status/permission text; it cannot prove submission.
  if (extractedPrompt.source === 'message') {
    return false
  }
  if (
    extractedPrompt.source === 'user_prompt' ||
    extractedPrompt.source === 'userPrompt' ||
    extractedPrompt.source === 'user_message'
  ) {
    return isNewTurnEvent(source, eventName)
  }
  return isNewTurnEvent(source, eventName)
}

export function extractToolFields(
  source: AgentHookSource,
  eventName: unknown,
  hookPayload: Record<string, unknown>,
  options?: { grokHome?: string }
): ToolSnapshot {
  // Why: exhaustive switch so a new AgentHookSource fails typecheck here instead of silently routing through OpenCode's extractor.
  switch (source) {
    case 'claude':
      // Why: Kimi Code uses Claude's tool_name/tool_input payload fields verbatim.
      // falls through
      // Muse uses Claude-compatible tool fields.
      // falls through
      // DSH's own Claude-Code hook bridge emits Claude's tool_name/tool_input verbatim.
      // falls through
      // Why: ZCode's hook runner writes Claude's `tool_name`/`tool_input`/`tool_response` aliases.
      // falls through
      return extractClaudeToolFields(eventName, hookPayload)
    case 'codex':
      return extractCodexToolFields(eventName, hookPayload)
    case 'gemini':
      return extractGeminiToolFields(eventName, hookPayload)
    case 'antigravity':
      return extractAntigravityToolFields(eventName, hookPayload)
    case 'opencode':
    case 'opencode2':
      return extractOpenCodeToolFields(eventName, hookPayload)
    case 'cursor':
      return extractCursorToolFields(eventName, hookPayload)
    case 'grok':
      return extractGrokToolFields(eventName, hookPayload, options?.grokHome)
    case 'copilot':
      return extractCopilotToolFields(normalizeCopilotEventName(eventName), hookPayload)
    case 'devin':
      return extractClaudeToolFields(eventName, hookPayload)
    case 'kiro':
      return extractKiroToolFields(eventName, hookPayload)
  }
}
