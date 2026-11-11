import { getDefaultSettings } from '../../constants'
import { legacyChatPermissionWrite } from '../../../main/persistence/applying-settings/legacy-chat-permission-write'
import { describe, expect, it } from 'vitest'
import {
  agentLaunchSettingsMutationUpdates,
  type AgentLaunchSettingsSource
} from '../choices/agent-launch-settings'
import {
  DEFAULT_TUI_AGENT_ARGS,
  DEFAULT_TUI_AGENT_ENV,
  resolveTuiAgentLaunchArgs
} from '../choices/tui-agent-launch-defaults'
import { applyAllAgentsPermission, resolveAgentPermission } from './tui-agent-permission-choice'
import { migrateAgentPermissionChoice } from './tui-agent-permission-lift'

const legacy = (
  args: Record<string, string>,
  env: Record<string, Record<string, string>> = {}
): AgentLaunchSettingsSource => ({
  agentDefaultArgs: { ...DEFAULT_TUI_AGENT_ARGS, ...args },
  agentDefaultEnv: { ...DEFAULT_TUI_AGENT_ENV, ...env }
})

describe('one-time move of permission flags out of Arguments', () => {
  it('cuts a flag beside quoted text, and leaves a quoted flag as the user’s own text', () => {
    const migrated = migrateAgentPermissionChoice(
      legacy({ claude: '--name "a b" --dangerously-skip-permissions' })
    )
    expect(migrated.agentDefaultArgs.claude).toBe('--name "a b"')
    const quoted = migrateAgentPermissionChoice(
      legacy({ claude: '"--dangerously-skip-permissions"' })
    )
    expect(quoted.agentPermissionOverrides.claude).toBe('own')
    expect(quoted.agentDefaultArgs.claude).toBe('"--dangerously-skip-permissions"')
  })
})

it.each(['typed', 'legacy', 'chat'] as const)(
  'keeps migration-owned and hand-set choices across global writes (%s)',
  (path) => {
    const settings = {
      ...getDefaultSettings('/synthetic'),
      ...migrateAgentPermissionChoice(legacy({ gemini: '', grok: '' }))
    }
    settings.agentPermissionOverrides.codex = 'ask'
    const original = { ...settings.agentPermissionOverrides }
    expect(Object.values(original).filter((value) => value === 'own').length).toBeGreaterThan(1)
    for (const choice of ['ask', 'auto', 'auto', 'full-access'] as const) {
      const mode = choice === 'ask' ? 'manual' : choice === 'auto' ? 'auto' : 'yolo'
      const before = { ...settings.agentPermissionOverrides }
      Object.assign(
        settings,
        path === 'chat'
          ? legacyChatPermissionWrite(settings, { nativeChatPermissionMode: choice })
          : agentLaunchSettingsMutationUpdates(
              settings,
              path === 'legacy' ? { type: 'permissions', mode } : { type: 'permission', choice },
              'linux'
            )
      )
      expect(settings.agentPermissionOverrides).toMatchObject(original)
      expect(settings.agentPermissionOverrides).toMatchObject(before)
    }
    expect(
      applyAllAgentsPermission({ agentPermissionDefault: 'auto' }, 'auto').agentPermissionOverrides
    ).toEqual({})
    expect(() =>
      agentLaunchSettingsMutationUpdates(
        settings,
        { type: 'permission', agent: 'gemini', choice: 'ask' },
        'linux'
      )
    ).toThrow('This agent does not offer that permission')
  }
)

describe('older clients against a host with the stored choice', () => {
  const host = {
    ...migrateAgentPermissionChoice(legacy({ codex: '--approve-for-me --search' })),
    nativeChatPermissionMode: 'ask'
  } satisfies AgentLaunchSettingsSource

  it('deleting the published flag means the agent’s own settings; another flag becomes the choice', () => {
    const deleted = agentLaunchSettingsMutationUpdates(
      host,
      { type: 'arguments', agent: 'codex', value: '--search' },
      'linux'
    )
    expect(resolveAgentPermission('codex', { ...host, ...deleted }).choice).toBe('own')
    const swapped = agentLaunchSettingsMutationUpdates(
      host,
      {
        type: 'arguments',
        agent: 'codex',
        value: '--dangerously-bypass-approvals-and-sandbox --search'
      },
      'linux'
    )
    expect({ ...host, ...swapped }.agentDefaultArgs?.codex).toBe('--search')
    expect(resolveAgentPermission('codex', { ...host, ...swapped }).choice).toBe('full-access')
    const manual = agentLaunchSettingsMutationUpdates(
      host,
      { type: 'permissions', mode: 'manual', agent: 'claude' },
      'linux'
    )
    expect(resolveTuiAgentLaunchArgs('claude', { ...host, ...manual })).toBe('')
  })
})
