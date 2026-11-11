import { isGeminiTerminalTitle } from '../../../../../shared/agent-status/title/agent-title-core'
import {
  AGY_AGENT_NAME_RE,
  titleHasAnyLegacyAgentName
} from '../../../../../shared/agent-status/title/agent-name-token-match'

const EXTRA_TITLE_AGENT_TOKEN_RE =
  /(?<![\w./\\-])cursor-agent(?:\.(?:exe|cmd|bat|ps1))?(?![\w./\\-])/i

export function titleHasExplicitAgentIdentity(title: string): boolean {
  if (!title) {
    return false
  }
  if (
    title.startsWith('. ') ||
    title.startsWith('* ') ||
    title.startsWith('\u2733') ||
    isGeminiTerminalTitle(title)
  ) {
    return true
  }
  return (
    titleHasAnyLegacyAgentName(title) ||
    AGY_AGENT_NAME_RE.test(title) ||
    EXTRA_TITLE_AGENT_TOKEN_RE.test(title)
  )
}
