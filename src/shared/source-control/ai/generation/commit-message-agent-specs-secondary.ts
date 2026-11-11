import type { TuiAgent } from '../../../agent-launch/catalog/tui-agent'
import type {
  CommitMessageAgentSpec,
  CommitMessageModel,
  ThinkingLevel
} from './commit-message-agent-spec'

type SecondaryAgentSpecDeps = {
  OPENAI_THINKING_LEVELS: ThinkingLevel[]
  parseCursorModels: (stdout: string) => CommitMessageModel[]
  parseAntigravityModels: (stdout: string) => CommitMessageModel[]
}

export function buildSecondaryCommitMessageAgentSpecs({
  OPENAI_THINKING_LEVELS,
  parseCursorModels,
  parseAntigravityModels
}: SecondaryAgentSpecDeps): Partial<Record<TuiAgent, CommitMessageAgentSpec>> {
  return {
    cursor: {
      id: 'cursor',
      modelFlag: [{ aliases: ['--model'] }],
      effortFlag: [],
      label: 'Cursor',
      binary: 'cursor-agent',
      promptDelivery: 'argv',
      buildArgs: ({ prompt, model }) => [
        '--print',
        '--mode',
        'ask',
        '--trust',
        '--output-format',
        'text',
        '--model',
        model,
        prompt
      ],
      modelSource: 'dynamic',
      modelDiscovery: { binary: 'cursor-agent', args: ['--list-models'], parse: parseCursorModels },
      models: [{ id: 'auto', label: 'Auto' }],
      defaultModelId: 'auto'
    },
    copilot: {
      id: 'copilot',
      modelFlag: [{ aliases: ['--model'] }],
      effortFlag: [{ aliases: ['--effort'] }],
      label: 'GitHub Copilot',
      binary: 'copilot',
      promptDelivery: 'argv',
      buildArgs: ({ prompt, model, thinkingLevel }) => [
        '--prompt',
        prompt,
        '--silent',
        '--stream',
        'off',
        '--no-custom-instructions',
        '--model',
        model,
        ...(thinkingLevel ? ['--effort', thinkingLevel] : []),
        '--available-tools=view,glob,grep',
        '--allow-tool=read',
        '--deny-tool=write',
        '--deny-tool=shell',
        '--deny-tool=memory',
        '--disable-builtin-mcps',
        '--allow-all-paths'
      ],
      modelSource: 'static',
      // Copilot filters the picker by account/org policy; retain the full hosted catalog for permitted selections.
      models: [
        { id: 'auto', label: 'Auto' },
        {
          id: 'claude-haiku-4.5',
          label: 'Claude Haiku 4.5'
        },
        {
          id: 'claude-sonnet-4.5',
          label: 'Claude Sonnet 4.5'
        },
        {
          id: 'claude-sonnet-4.6',
          label: 'Claude Sonnet 4.6'
        },
        { id: 'claude-opus-4.5', label: 'Claude Opus 4.5' },
        {
          id: 'claude-opus-4.6',
          label: 'Claude Opus 4.6'
        },
        {
          id: 'claude-opus-4.6-fast',
          label: 'Claude Opus 4.6 Fast'
        },
        {
          id: 'claude-opus-4.7',
          label: 'Claude Opus 4.7'
        },
        {
          id: 'gpt-4.1',
          label: 'GPT-4.1'
        },
        {
          id: 'gpt-5-mini',
          label: 'GPT-5 Mini',
          thinkingLevels: OPENAI_THINKING_LEVELS,
          defaultThinkingLevel: 'low'
        },
        {
          id: 'gpt-5.2',
          label: 'GPT-5.2',
          thinkingLevels: OPENAI_THINKING_LEVELS,
          defaultThinkingLevel: 'low'
        },
        {
          id: 'gpt-5.2-codex',
          label: 'GPT-5.2 Codex',
          thinkingLevels: OPENAI_THINKING_LEVELS,
          defaultThinkingLevel: 'low'
        },
        {
          id: 'gpt-5.3-codex',
          label: 'GPT-5.3 Codex',
          thinkingLevels: OPENAI_THINKING_LEVELS,
          defaultThinkingLevel: 'low'
        },
        {
          id: 'gpt-5.4',
          label: 'GPT-5.4',
          thinkingLevels: OPENAI_THINKING_LEVELS,
          defaultThinkingLevel: 'low'
        },
        {
          id: 'gpt-5.4-mini',
          label: 'GPT-5.4 Mini',
          thinkingLevels: OPENAI_THINKING_LEVELS,
          defaultThinkingLevel: 'low'
        },
        {
          id: 'gpt-5.5',
          label: 'GPT-5.5',
          thinkingLevels: OPENAI_THINKING_LEVELS,
          defaultThinkingLevel: 'low'
        }
      ],
      // Plans hide models they do not offer; Auto runs on any plan.
      defaultModelId: 'auto'
    },
    antigravity: {
      id: 'antigravity',
      modelFlag: [{ aliases: ['--model'] }],
      effortFlag: [{ aliases: ['--effort'] }],
      label: 'Antigravity',
      binary: 'agy',
      // Empty --print selects stream input without consuming the next flag (agy >= 1.1.15).
      promptDelivery: 'stdin',
      buildArgs: ({ model, thinkingLevel }) => [
        '--print=',
        '--input-format=stream-json',
        '--output-format=stream-json',
        '--sandbox',
        ...(model && model !== 'default' ? ['--model', model] : []),
        ...(thinkingLevel ? ['--effort', thinkingLevel] : [])
      ],
      singletonOptions: [['--model'], ['--effort']],
      modelSource: 'dynamic',
      modelDiscovery: { binary: 'agy', args: ['models'], parse: parseAntigravityModels },
      models: [{ id: 'default', label: 'Config default' }],
      defaultModelId: 'default'
    }
  }
}
