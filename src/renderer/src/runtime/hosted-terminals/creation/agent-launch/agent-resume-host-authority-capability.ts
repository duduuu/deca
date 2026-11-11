import type { ResumableTuiAgent } from '../../../../../../shared/agent-session/lifecycle/agent-session-resume'
import type { TuiAgent } from '../../../../../../shared/agent-launch/catalog/tui-agent'
import {
  AGENT_SESSION_CURSOR_RESUME_RUNTIME_CAPABILITY,
  AGENT_SESSION_OPENCODE2_RESUME_RUNTIME_CAPABILITY,
  AGENT_SESSION_KIRO_RESUME_RUNTIME_CAPABILITY
} from '../../../../../../shared/agent-session/lifecycle/agent-session-resume-runtime-capabilities'
import type { RuntimeCapability } from '../../../../../../shared/protocol-version'

// New resumable enum members can make older hosts return invalid_argument instead of legacy fallback, killing panes. Probe per-agent capability; exhaustive Record requires an explicit gate or deliberate undefined for additions.
const RESUME_HOST_AUTHORITY_CAPABILITY_BY_AGENT = {
  // These shipped inside agent-session.host-authority.v1's enum, so the generic probe covers them.
  claude: undefined,
  codex: undefined,
  cursor: AGENT_SESSION_CURSOR_RESUME_RUNTIME_CAPABILITY,
  gemini: undefined,
  antigravity: undefined,
  opencode: undefined,
  opencode2: AGENT_SESSION_OPENCODE2_RESUME_RUNTIME_CAPABILITY,
  grok: undefined,
  devin: undefined,
  // Ungated to match how main shipped copilot resume; gating it is its own change.
  copilot: undefined,
  kiro: AGENT_SESSION_KIRO_RESUME_RUNTIME_CAPABILITY
} satisfies Record<ResumableTuiAgent, RuntimeCapability | undefined>

export function agentResumeHostAuthorityCapability(
  agent: TuiAgent | null | undefined
): RuntimeCapability | undefined {
  if (!agent) {
    return undefined
  }
  return (
    RESUME_HOST_AUTHORITY_CAPABILITY_BY_AGENT as Partial<Record<TuiAgent, RuntimeCapability>>
  )[agent]
}
