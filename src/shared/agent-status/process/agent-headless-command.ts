import { isPrintModeHeadlessOneShotCommand } from './print-mode-headless-command'
import type { TerminalAgent } from '../identity/terminal-agent'

// Agent-specific one-shot forms cannot accept pane prompts; DSH server/JSON-RPC modes must be excluded too.
const HEADLESS_ONE_SHOT_MATCHERS: Partial<
  Record<TerminalAgent, (tokens: readonly string[]) => boolean>
> = {
  claude: isPrintModeHeadlessOneShotCommand
}

export function isHeadlessOneShotAgentCommand(
  agent: TerminalAgent,
  tokens: readonly string[]
): boolean {
  return HEADLESS_ONE_SHOT_MATCHERS[agent]?.(tokens) ?? false
}

type AgentCommandRecognition = { agent: TerminalAgent } | null

export function filterHeadlessOneShotAgentCommand<T extends AgentCommandRecognition>(
  recognition: T,
  tokens: readonly string[]
): T | null {
  if (recognition && isHeadlessOneShotAgentCommand(recognition.agent, tokens)) {
    return null
  }
  return recognition
}
