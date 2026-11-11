import { AGY_AGENT_NAME_RE, titleHasAgentName } from './agent-name-token-match'
import { CLAUDE_IDLE, containsAgentSpinnerGlyph } from './agent-title-glyphs'
import {
  isClaudeManagementTitle,
  isCursorAgentTitle,
  isGeminiTerminalTitle
} from './agent-title-core'
import { isOpenCodeNativeTitle } from './providers/opencode-terminal-title'
import { memoizeTitleClassification } from './terminal-title-classification-memo'

/** Scope prompt-cache timers to Claude title conventions. */
function computeIsClaudeAgent(title: string): boolean {
  if (!title || isClaudeManagementTitle(title) || isOpenCodeNativeTitle(title)) {
    return false
  }

  // Claude prefixes identify the owner more strongly than other agents named in task text.
  if (title.startsWith(`${CLAUDE_IDLE} `) || title === CLAUDE_IDLE) {
    return true
  }
  if (title.startsWith('. ') || title.startsWith('* ')) {
    return true
  }
  if (containsAgentSpinnerGlyph(title)) {
    // Other agents use braille too; require controlled Cursor identity rather than a task-text token.
    return !isCursorAgentTitle(title)
  }

  const trimmedTitle = title.trimStart()
  return (
    trimmedTitle.toLowerCase().startsWith('claude') && titleHasAgentName(trimmedTitle, 'claude')
  )
}

/** Pure in `title` — memoized so repeated selector reads skip the regex ladder. */
export const isClaudeAgent: (title: string) => boolean =
  memoizeTitleClassification(computeIsClaudeAgent)

function computeAgentLabel(title: string): string | null {
  if (isClaudeManagementTitle(title)) {
    return null
  }
  // OpenCode's native envelope owns session text even when it names other agents or carries their glyphs.
  if (isOpenCodeNativeTitle(title)) {
    return 'OpenCode'
  }
  // Why: Claude task titles can mention another CLI; the prefix is the identity
  // signal, not arbitrary task text.
  if (
    title.startsWith(`${CLAUDE_IDLE} `) ||
    title === CLAUDE_IDLE ||
    title.startsWith('. ') ||
    title.startsWith('* ')
  ) {
    return 'Claude Code'
  }
  if (isGeminiTerminalTitle(title)) {
    return 'Gemini CLI'
  }
  if (titleHasAgentName(title, 'codex')) {
    return 'Codex'
  }
  if (titleHasAgentName(title, 'copilot')) {
    return 'GitHub Copilot'
  }
  if (titleHasAgentName(title, 'grok')) {
    return 'Grok'
  }
  if (titleHasAgentName(title, 'devin')) {
    return 'Devin'
  }
  if (titleHasAgentName(title, 'antigravity') || AGY_AGENT_NAME_RE.test(title)) {
    return 'Antigravity'
  }
  if (titleHasAgentName(title, 'opencode')) {
    return 'OpenCode'
  }
  // Cursor is ordinary vocabulary: match its closed title set before Claude claims the braille frame (matching @cursor routing).
  if (isCursorAgentTitle(title)) {
    return 'Cursor'
  }
  if (isClaudeAgent(title)) {
    return 'Claude Code'
  }

  return null
}

/** Pure in `title` — memoized so repeated selector reads skip the regex ladder. */
export const getAgentLabel: (title: string) => string | null =
  memoizeTitleClassification(computeAgentLabel)
