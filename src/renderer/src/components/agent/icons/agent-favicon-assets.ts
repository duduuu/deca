import grokUrl from '../../../../../shared/agent-icons/grok.png?url'
import geminiUrl from '../../../../../shared/agent-icons/gemini.png?url'
import antigravityUrl from '../../../../../shared/agent-icons/antigravity.png?url'
import kiroUrl from '../../../../../shared/agent-icons/kiro.png?url'
import cursorUrl from '../../../../../shared/agent-icons/cursor.png?url'
import devinUrl from '../../../../../shared/agent-icons/devin.png?url'
import type { TuiAgent } from '../../../../../shared/agent-launch/catalog/tui-agent'
// Bundle favicons for offline/Google-blocked regions (#8451); shared/agent-icons also supplies mobile-agent-icon-assets.ts.
export const AGENT_FAVICON_ASSETS: Partial<Record<TuiAgent, string>> = {
  grok: grokUrl,
  gemini: geminiUrl,
  antigravity: antigravityUrl,
  kiro: kiroUrl,
  cursor: cursorUrl,
  devin: devinUrl
}
