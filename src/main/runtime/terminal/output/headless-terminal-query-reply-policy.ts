import type { TuiAgent } from '../../../../shared/agent-launch/catalog/tui-agent'

/* oxlint-disable no-control-regex -- query replies are ESC/DCS control sequences by definition */
const XTVERSION_REPLY = new RegExp('^\u001bP>\\|[^\u001b]*\u001b\\\\$')
/* oxlint-enable no-control-regex */

export function shouldForwardHeadlessTerminalQueryReply(
  launchAgent: TuiAgent | null | undefined,
  reply: string
): boolean {
  if (launchAgent === 'grok') {
    return !XTVERSION_REPLY.test(reply)
  }
  return true
}
