import { parsePtyStartupIngressIntent } from '../../shared/terminal/pty/ingress/pty-startup-ingress-intent'
import { normalizeColorQueryReplyColors } from '../../shared/terminal/pty/ingress/pty-owner-color-query-colors'
import { recognizeAgentLaunchCommand } from '../../shared/agent-launch/startup/agent-command-line-intent'
import { isTuiAgent } from '../../shared/agent-launch/catalog/tui-agent-config'
import { agentKindSchema } from '../../shared/telemetry-events'
import type { SleepingAgentLaunchConfig } from '../../shared/agent-session/lifecycle/agent-session-resume'

function isAgentLaunch(args: {
  launchAgent?: unknown
  telemetry?: { agent_kind?: unknown } | undefined
  command?: string
  launchConfig?: SleepingAgentLaunchConfig
}): boolean {
  if (isTuiAgent(args.launchAgent)) {
    return true
  }
  const agentKindParse =
    args.telemetry?.agent_kind !== undefined
      ? agentKindSchema.safeParse(args.telemetry.agent_kind)
      : null
  if (agentKindParse?.success && agentKindParse.data !== 'other') {
    return true
  }
  const command = args.launchConfig?.agentCommand?.trim() || args.command?.trim() || ''
  return recognizeAgentLaunchCommand(command) !== null
}

export function getStartupTerminalIngressIntent(args: {
  launchAgent?: unknown
  telemetry?: { agent_kind?: unknown } | undefined
  command?: string
  launchConfig?: SleepingAgentLaunchConfig
  terminalColorQueryReplies?: unknown
  launcherColorQueryReplies?: unknown
  launcherViewAttributes?: unknown
  terminalKittyKeyboardProtocol?: boolean
}) {
  // Seed every PTY: agents launched later from plain shells can also query before viewer colors arrive.
  const colors = normalizeColorQueryReplyColors(args.terminalColorQueryReplies) ?? {}
  const launcherColors = normalizeColorQueryReplyColors(args.launcherColorQueryReplies)
  return parsePtyStartupIngressIntent({
    kittyKeyboardProtocol: args.terminalKittyKeyboardProtocol === true && isAgentLaunch(args),
    colors,
    ...(launcherColors ? { launcherColors, launcherAttributes: args.launcherViewAttributes } : {}),
    deadlineMs: 5_000
  })
}
