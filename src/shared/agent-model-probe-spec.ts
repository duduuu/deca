import {
  getCommitMessageAgentSpec,
  type CommitMessageAgentSpec
} from './source-control/ai/generation/commit-message-agent-spec'
import { GROK_MODEL_LIST_ARGS, parseGrokModelList } from './grok-model-list-probe'
import type { TuiAgent } from './agent-launch/catalog/tui-agent'

/** Exclude generation inputs so discovery-only agents stay outside the commit-message registry. */
export type AgentModelProbeSpec = Omit<
  CommitMessageAgentSpec,
  'promptDelivery' | 'buildArgs' | 'modelFlag' | 'effortFlag'
>

/** Agents that support model discovery but are not commit-message agents. */
const MODEL_DISCOVERY_ONLY_SPECS: Partial<Record<TuiAgent, AgentModelProbeSpec>> = {
  grok: {
    id: 'grok',
    label: 'Grok',
    binary: 'grok',
    modelSource: 'dynamic',
    modelDiscovery: {
      binary: 'grok',
      args: GROK_MODEL_LIST_ARGS,
      parse: parseGrokModelList
    },
    // Fall back to the catalog seed instead of maintaining a second model list.
    models: [],
    defaultModelId: 'grok-4.7'
  }
}

export function getAgentModelProbeSpec(agentId: TuiAgent): AgentModelProbeSpec | undefined {
  const spec = getCommitMessageAgentSpec(agentId) ?? MODEL_DISCOVERY_ONLY_SPECS[agentId]
  if (!spec) {
    return undefined
  }
  // OMP's `default` means the provider configured in its own settings, not a selectable model.
  if (agentId !== 'omp') {
    return spec
  }
  return {
    ...spec,
    models: spec.models.filter((model) => model.id !== 'default'),
    defaultModelId: spec.defaultModelId === 'default' ? '' : spec.defaultModelId
  }
}
