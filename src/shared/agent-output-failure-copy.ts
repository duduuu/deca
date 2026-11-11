// Orca's own sentences for unreadable or failed agent CLI output; part of TEXT_GENERATION_FAILURE_COPY.
export const AGENT_OUTPUT_FAILURE_COPY = {
  openCodeInvalidEvents: 'OpenCode returned invalid JSON events.',
  antigravityInvalidEvents: 'Antigravity returned invalid JSON events.',
  antigravityInvalidResult: 'Antigravity returned an invalid result.',
  antigravityNoFinalResult: 'Antigravity returned no final result.'
} as const

export type AgentOutputFailureCode = keyof typeof AGENT_OUTPUT_FAILURE_COPY
