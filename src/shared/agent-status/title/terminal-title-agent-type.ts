import { collectExplicitAgentTitleEvidence } from './agent-title-evidence'
import { AGY_AGENT_NAME_RE, titleHasAgentName } from './agent-name-token-match'
import { containsAgentSpinnerGlyph } from './agent-title-glyphs'
import { isCursorAgentTitle } from './agent-title-core'
import { isOpenCodeNativeTitle } from './providers/opencode-terminal-title'
import { resolveCanonicalPaneAgentIdentity } from '../identity/pane-agent-identity-adapter'
import { memoizeTitleClassification } from './terminal-title-classification-memo'
import type { TerminalAgent } from '../identity/terminal-agent'

export const CLAUDE_IDLE = '\u2733' // ✳ (eight-spoked asterisk — Claude Code idle prefix)
const CLAUDE_MANAGEMENT_TITLE_RE =
  /^\s*(?:"(?:.*[\\/])?claude(?:\.(?:exe|cmd|bat|ps1))?"|'(?:.*[\\/])?claude(?:\.(?:exe|cmd|bat|ps1))?'|(?:.*[\\/])?claude(?:\.(?:exe|cmd|bat|ps1))?)\s+agents\s*$/i

export const GEMINI_WORKING = '\u2726' // ✦
export const GEMINI_SILENT_WORKING = '\u23F2' // ⏲
export const GEMINI_IDLE = '\u25C7' // ◇
export const GEMINI_PERMISSION = '\u270B' // ✋

export function containsBrailleSpinner(title: string): boolean {
  for (const char of title) {
    const codePoint = char.codePointAt(0)
    if (codePoint !== undefined && codePoint >= 0x2800 && codePoint <= 0x28ff) {
      return true
    }
  }
  return false
}

export function isGeminiTerminalTitle(title: string): boolean {
  // Why: Gemini OSC glyphs are stronger evidence than any cwd/session text.
  if (
    title.includes(GEMINI_PERMISSION) ||
    title.includes(GEMINI_WORKING) ||
    title.includes(GEMINI_SILENT_WORKING) ||
    title.includes(GEMINI_IDLE)
  ) {
    return true
  }
  // Antigravity model names contain Gemini; defer token matches to agy identity while keeping explicit Gemini glyphs decisive.
  if (titleHasAgentName(title, 'antigravity') || AGY_AGENT_NAME_RE.test(title)) {
    return false
  }
  return titleHasAgentName(title, 'gemini')
}

/** Scope Claude-only prompt-cache timing to Claude title conventions. */
function computeIsClaudeAgent(title: string): boolean {
  if (!title || isClaudeManagementTitle(title) || isOpenCodeNativeTitle(title)) {
    return false
  }

  // Claude-specific status prefixes outrank agent names mentioned in task text.
  if (title.startsWith(`${CLAUDE_IDLE} `) || title === CLAUDE_IDLE) {
    return true
  }
  // Claude owns . / * status prefixes even when its task mentions another agent.
  if (title.startsWith('. ') || title.startsWith('* ')) {
    return true
  }
  if (containsAgentSpinnerGlyph(title)) {
    // Other agents use braille; reject Cursor identity, but keep Claude tasks merely mentioning a cursor.
    return !isCursorAgentTitle(title)
  }
  // Permission titles can omit status prefixes; token boundaries exclude claude-scratch paths and task mentions.
  const trimmedTitle = title.trimStart()
  if (
    trimmedTitle.toLowerCase().startsWith('claude') &&
    titleHasAgentName(trimmedTitle, 'claude')
  ) {
    return true
  }

  return false
}

/** Pure in `title` — memoized so repeated selector reads skip the regex ladder. */
export const isClaudeAgent: (title: string) => boolean =
  memoizeTitleClassification(computeIsClaudeAgent)

export function isClaudeManagementTitle(title: string): boolean {
  return CLAUDE_MANAGEMENT_TITLE_RE.test(title)
}

function computeAgentLabel(title: string): string | null {
  if (isClaudeManagementTitle(title)) {
    return null
  }
  // The native OpenCode marker owns the whole title; names/glyphs in its session text cannot rebrand it.
  if (isOpenCodeNativeTitle(title)) {
    return 'OpenCode'
  }
  // Claude’s prefix identifies the agent; task-text CLI mentions do not.
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
  // Prefer explicit agent tokens over Claude’s generic spinner; token boundaries exclude similarly named workspace paths.
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
  if (titleHasAgentName(title, 'opencode2')) {
    return 'OpenCode 2'
  }
  if (titleHasAgentName(title, 'opencode')) {
    return 'OpenCode'
  }
  // Use Cursor’s closed title set before Claude’s braille fallback; ordinary cursor mentions are not identity.
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

const TITLE_LABEL_TO_AGENT: Partial<Record<string, TerminalAgent>> = {
  'Claude Code': 'claude',
  Codex: 'codex',
  'Gemini CLI': 'gemini',
  'GitHub Copilot': 'copilot',
  Grok: 'grok',
  Devin: 'devin',
  Antigravity: 'antigravity',
  OpenCode: 'opencode',
  'OpenCode 2': 'opencode2',
  Cursor: 'cursor'
}

export function resolveTerminalTitleAgentType(title: string): TerminalAgent | null {
  const label = getAgentLabel(title)
  const parsed = label ? (TITLE_LABEL_TO_AGENT[label] ?? null) : null
  return resolveCanonicalPaneAgentIdentity({
    title,
    // Preserve this public parser’s legacy fallback; pane-identity consumers enforce the canonical resolver’s fence on raw titles.
    uncoveredFallback: { agent: parsed, titleOnly: false }
  }).agent
}

/** Activity and task mentions cannot establish identity for display or input routing. */
function computeExplicitTerminalTitleAgentType(title: string): TerminalAgent | null {
  return collectExplicitAgentTitleEvidence(title).agent
}

/** Pure in `title` — memoized so repeated selector reads skip the canonical/title parse. */
export const resolveExplicitTerminalTitleAgentType: (title: string) => TerminalAgent | null =
  memoizeTitleClassification(computeExplicitTerminalTitleAgentType)

/** Readiness and confirmed-shell cleanup retain their pre-existing title policy. */
function computeTerminalTitlePolicyAgentType(title: string): TerminalAgent | null {
  const agent = resolveTerminalTitleAgentType(title)
  const genericClaudeStatus =
    containsAgentSpinnerGlyph(title) ||
    title.startsWith(`${CLAUDE_IDLE} `) ||
    title === CLAUDE_IDLE ||
    title.startsWith('. ') ||
    title.startsWith('* ')
  return agent === 'claude' && genericClaudeStatus && !titleHasAgentName(title, 'claude')
    ? null
    : agent
}

export const resolveTerminalTitlePolicyAgentType: (title: string) => TerminalAgent | null =
  memoizeTitleClassification(computeTerminalTitlePolicyAgentType)
