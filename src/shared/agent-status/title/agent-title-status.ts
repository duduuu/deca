import { cursorTitleStatus } from './providers/cursor-terminal-title'
import { AGY_AGENT_NAME_RE, titleHasAgentName } from './agent-name-token-match'
import {
  CLAUDE_IDLE,
  GEMINI_IDLE,
  GEMINI_PERMISSION,
  GEMINI_SILENT_WORKING,
  GEMINI_WORKING,
  QUARTER_CIRCLE_SPINNER_RE,
  containsAgentSpinnerGlyph,
  containsQuarterCircleSpinner
} from './agent-title-glyphs'
import {
  CURSOR_NATIVE_TITLE_LOWER,
  STRONG_IDLE_KEYWORDS_RE,
  STRONG_PERMISSION_KEYWORDS_RE,
  STRONG_WORKING_KEYWORDS_RE,
  containsLegacyAgentName,
  isClaudeManagementTitle,
  isGeminiTerminalTitle,
  isGrokRotatingWorkingTitle,
  type AgentStatus
} from './agent-title-core'
import { isOpenCodeNativeTitle } from './providers/opencode-terminal-title'
import { getWrapperTitleSegments } from './terminal-title-wrapper-segments'
import { resolveExplicitTerminalTitleAgentType } from './terminal-title-agent-type'
import { memoizeTitleClassification } from './terminal-title-classification-memo'

/** Where a working agent settled: at rest, or on a prompt that needs the user. */
export type AgentIdleStatus = Exclude<AgentStatus, 'working'>

/** Explicit OSC 7501 activity outranks glyphs; classify titles only without a program report. */
export function createAgentStatusTracker(
  onBecameIdle: (title: string, status: AgentIdleStatus) => void,
  onBecameWorking?: () => void,
  onAgentExited?: () => void,
  initialTitle?: string
): {
  handleTitle: (title: string) => void
  handleProgramActivity: (activity: AgentStatus | null) => void
  /** Adopt replayed activity without edges, as replayed titles move no status. */
  seedProgramActivity: (activity: AgentStatus | null) => void
  seedTitle: (title: string) => void
  restoreLastExit: (confirmedStatus?: AgentStatus) => AgentStatus | null
  reset: () => void
} {
  // Restore a silent baseline so hidden agents can still emit their later idle transition.
  let lastStatus: AgentStatus | null =
    initialTitle !== undefined ? detectAgentStatusFromTitle(initialTitle) : null
  let restorableExitStatus: AgentStatus | null = null
  let programActivity: AgentStatus | null = null
  let lastTitle = initialTitle ?? ''

  function transition(newStatus: AgentStatus | null, title: string): void {
    if (newStatus !== null) {
      restorableExitStatus = null
    }
    if (lastStatus === 'working' && newStatus !== null && newStatus !== 'working') {
      onBecameIdle(title, newStatus)
    }
    if (lastStatus !== 'working' && newStatus === 'working') {
      onBecameWorking?.()
    }
    // A shell title after idle/permission proves exit; during work it may be transient.
    if (lastStatus !== null && lastStatus !== 'working' && newStatus === null) {
      restorableExitStatus = lastStatus
      lastStatus = null
      onAgentExited?.()
    }
    if (newStatus !== null) {
      lastStatus = newStatus
    }
  }

  return {
    handleTitle(title: string): void {
      lastTitle = title
      transition(programActivity ?? detectAgentStatusFromTitle(title), title)
    },
    handleProgramActivity(activity: AgentStatus | null): void {
      programActivity = activity
      // Why no transition on null: the program stopped reporting, so the next title decides.
      if (activity !== null) {
        transition(activity, lastTitle)
      }
    },
    seedProgramActivity(activity: AgentStatus | null): void {
      programActivity = activity
      // The restored state is the baseline later live edges compare against.
      if (activity !== null) {
        lastStatus = activity
        restorableExitStatus = null
      }
    },
    seedTitle(title: string): void {
      lastTitle = title
      lastStatus = programActivity ?? detectAgentStatusFromTitle(title)
      restorableExitStatus = null
    },
    restoreLastExit(confirmedStatus?: AgentStatus): AgentStatus | null {
      const restoredStatus = confirmedStatus ?? (lastStatus === null ? restorableExitStatus : null)
      if (restoredStatus !== null) {
        lastStatus = restoredStatus
      }
      restorableExitStatus = null
      return restoredStatus
    },
    reset(): void {
      lastStatus = null
      restorableExitStatus = null
      programActivity = null
      lastTitle = ''
    }
  }
}

/**
 * Normalize high-churn agent titles into stable display labels before storage.
 */
export function normalizeTerminalTitle(title: string): string {
  const proposal = proposeTerminalTitle(title)
  return proposal === title ||
    resolveExplicitTerminalTitleAgentType(title) === resolveExplicitTerminalTitleAgentType(proposal)
    ? proposal
    : title
}

const GEMINI_DISPLAY_LABEL = 'Gemini CLI'
const GROK_WORKING_TITLE = '\u280b Grok'
const DESTRUCTIVE_TITLE_STAMPS: ReadonlySet<string> = new Set([
  ...[GEMINI_WORKING, GEMINI_PERMISSION, GEMINI_IDLE].map(
    (glyph) => `${glyph} ${GEMINI_DISPLAY_LABEL}`
  ),
  GROK_WORKING_TITLE
])

export function isNormalizedAgentTitleStamp(title: string): boolean {
  return DESTRUCTIVE_TITLE_STAMPS.has(title)
}

function proposeTerminalTitle(title: string): string {
  if (!title) {
    return title
  }

  if (isGeminiTerminalTitle(title)) {
    const status = detectAgentStatusFromTitle(title)
    if (status === 'permission') {
      return `${GEMINI_PERMISSION} ${GEMINI_DISPLAY_LABEL}`
    }
    if (status === 'working') {
      return `${GEMINI_WORKING} ${GEMINI_DISPLAY_LABEL}`
    }
    // Require a glyph before stamping Gemini rest state; a bare shell auto-title is not readiness evidence.
    if (status === 'idle' && title.includes(GEMINI_IDLE)) {
      return `${GEMINI_IDLE} ${GEMINI_DISPLAY_LABEL}`
    }
  }

  // Collapse Grok spinner/status churn to one label; idle titles pass through so the final semantic title remains (#7863).
  if (isGrokRotatingWorkingTitle(title)) {
    return GROK_WORKING_TITLE
  }

  return title
}

// agy titles carry its conversation summary and its waits arrive only through hooks.
function hasPermissionTitleSegment(title: string): boolean {
  return getWrapperTitleSegments(title).some(
    (segment) =>
      !AGY_AGENT_NAME_RE.test(segment) &&
      !titleHasAgentName(segment, 'antigravity') &&
      containsLegacyAgentName(segment) &&
      STRONG_PERMISSION_KEYWORDS_RE.test(segment)
  )
}

function computeAgentStatusFromTitle(title: string): AgentStatus | null {
  const cursorStatus = cursorTitleStatus(title)
  if (cursorStatus) {
    return cursorStatus
  }
  if (!title || isClaudeManagementTitle(title)) {
    return null
  }
  if (title.trim().toLowerCase() === CURSOR_NATIVE_TITLE_LOWER) {
    return null
  }

  if (isOpenCodeNativeTitle(title)) {
    return containsAgentSpinnerGlyph(title) ? 'working' : 'idle'
  }

  if (title.includes(GEMINI_PERMISSION)) {
    return 'permission'
  }
  if (title.includes(GEMINI_WORKING) || title.includes(GEMINI_SILENT_WORKING)) {
    return 'working'
  }
  if (title.includes(GEMINI_IDLE)) {
    return 'idle'
  }

  if (title.startsWith(`${CLAUDE_IDLE} `) || title === CLAUDE_IDLE) {
    return 'idle'
  }
  if (containsAgentSpinnerGlyph(title)) {
    return 'working'
  }
  if (!containsLegacyAgentName(title) && !AGY_AGENT_NAME_RE.test(title)) {
    return null
  }
  if (hasPermissionTitleSegment(title)) {
    return 'permission'
  }
  // Why: boundary-aware regexes avoid cwd/path and substring false positives.
  if (STRONG_IDLE_KEYWORDS_RE.test(title)) {
    return 'idle'
  }
  if (STRONG_WORKING_KEYWORDS_RE.test(title)) {
    return 'working'
  }
  if (title.startsWith('. ')) {
    return 'working'
  }
  if (title.startsWith('* ')) {
    return 'idle'
  }

  return 'idle'
}

/** Memoize by unchanged title so sidebar/tab selector reads skip repeated parsing. */
export const detectAgentStatusFromTitle: (title: string) => AgentStatus | null =
  memoizeTitleClassification(computeAgentStatusFromTitle)

/** Quarter-circle-only titles prove activity, not ownership; pane writers need independent evidence (STA-4028, #13925). */
export function isQuarterCircleSpinnerOnlyAgentTitle(title: string | null | undefined): boolean {
  if (!title || !containsQuarterCircleSpinner(title)) {
    return false
  }
  return detectAgentStatusFromTitle(title.replace(QUARTER_CIRCLE_SPINNER_RE, '').trim()) === null
}
