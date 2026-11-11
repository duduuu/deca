// Probe before host-authority resume: older ensureAgentSession enums reject new agents with invalid_argument, which launch fallback cannot retry.
export const AGENT_SESSION_CURSOR_RESUME_RUNTIME_CAPABILITY =
  'agent-session.cursor-resume.v1' as const
export const AGENT_SESSION_OPENCODE2_RESUME_RUNTIME_CAPABILITY =
  'agent-session.opencode2-resume.v1' as const
export const AGENT_SESSION_KIRO_RESUME_RUNTIME_CAPABILITY = 'agent-session.kiro-resume.v1' as const

export const AGENT_SESSION_RESUME_RUNTIME_CAPABILITIES = [
  AGENT_SESSION_CURSOR_RESUME_RUNTIME_CAPABILITY,
  AGENT_SESSION_OPENCODE2_RESUME_RUNTIME_CAPABILITY,
  AGENT_SESSION_KIRO_RESUME_RUNTIME_CAPABILITY
] as const
