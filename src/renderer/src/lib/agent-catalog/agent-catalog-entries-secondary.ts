import { translate } from '@/i18n/i18n'
import type { AgentCatalogEntry } from './agent-catalog'

export function secondaryAgentCatalogEntries(): AgentCatalogEntry[] {
  return [
    {
      id: 'kiro',
      label: translate('auto.lib.agent.catalog.e0247254f2', 'Kiro'),
      // Kiro installs as kiro-cli; match detection so the settings hint names the actual executable.
      cmd: 'kiro-cli',
      homepageUrl: 'https://kiro.dev/docs/cli/'
    },
    {
      id: 'cursor',
      label: translate('auto.lib.agent.catalog.667c104cff', 'Cursor'),
      cmd: 'cursor-agent',
      homepageUrl: 'https://cursor.com/cli'
    },
    {
      id: 'devin',
      label: translate('auto.lib.agent.catalog.fc80296033', 'Devin'),
      cmd: 'devin',
      homepageUrl: 'https://devin.ai/cli'
    }
  ]
}
