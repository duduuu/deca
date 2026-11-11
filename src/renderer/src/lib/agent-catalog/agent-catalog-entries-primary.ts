import { getCatalogPlatform } from './agent-catalog-platform'
import {
  getTuiAgentLaunchCommand,
  TUI_AGENT_CONFIG
} from '../../../../shared/agent-launch/catalog/tui-agent-config'
import { translate } from '@/i18n/i18n'
import type { AgentCatalogEntry } from './agent-catalog'

/** Keep first-party entries separate from the community tail to stay within module budgets; buildAgentCatalogEntries preserves their order. */
export function primaryAgentCatalogEntries(): AgentCatalogEntry[] {
  return [
    {
      id: 'claude',
      label: translate('auto.lib.agent.catalog.0708ed89f1', 'Claude'),
      cmd: 'claude',
      homepageUrl: 'https://code.claude.com/docs'
    },
    {
      id: 'claude-agent-teams',
      label: translate('auto.lib.agent.catalog.bf53f09bf8', 'Claude Agent Teams'),
      cmd: getTuiAgentLaunchCommand(TUI_AGENT_CONFIG['claude-agent-teams'], getCatalogPlatform()),
      homepageUrl: 'https://code.claude.com/docs/en/agent-teams'
    },
    {
      id: 'codex',
      label: translate('auto.lib.agent.catalog.760bc6883d', 'Codex'),
      cmd: 'codex',
      homepageUrl: 'https://github.com/openai/codex'
    },
    {
      id: 'grok',
      label: translate('auto.lib.agent.catalog.0baad2d5d2', 'Grok'),
      cmd: 'grok',
      homepageUrl: 'https://x.ai/cli'
    },
    {
      id: 'copilot',
      label: translate('auto.lib.agent.catalog.706b0fe68b', 'GitHub Copilot'),
      cmd: 'copilot',
      homepageUrl: 'https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli'
    },
    {
      id: 'opencode2',
      label: translate('auto.lib.agent.catalog.opencode2_label', 'OpenCode 2'),
      cmd: 'opencode2',
      homepageUrl: 'https://opencode.ai/v2/docs/'
    },
    {
      id: 'opencode',
      label: translate('auto.lib.agent.catalog.e7a4ca5103', 'OpenCode'),
      cmd: 'opencode',
      homepageUrl: 'https://opencode.ai/docs/cli/'
    },
    {
      id: 'gemini',
      label: translate('auto.lib.agent.catalog.12e6baa4f7', 'Gemini'),
      cmd: 'gemini',
      homepageUrl: 'https://github.com/google-gemini/gemini-cli'
    },
    {
      id: 'antigravity',
      label: translate('auto.lib.agent.catalog.691dd11789', 'Antigravity'),
      cmd: 'agy',
      homepageUrl: 'https://antigravity.google/docs/cli-overview'
    }
  ]
}
