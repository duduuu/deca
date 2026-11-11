import type { TuiAgent } from './agent-launch/catalog/tui-agent'

/** Null segments use canonical .agents/skills without a separate placement; IDs match detected Orca agents. */
type SkillInstallProviderEntry = {
  id: TuiAgent
  displayName: string
  globalSegments: readonly string[] | null
  workspaceSegments: readonly string[] | null
  /** Env var relocating the agent's home (skills in `<home>/skills`). */
  homeEnv?: string
}

export const SKILL_INSTALL_PROVIDERS = Object.freeze([
  {
    id: 'codex',
    displayName: 'Codex',
    globalSegments: null,
    workspaceSegments: null
  },
  {
    id: 'claude',
    displayName: 'Claude Code',
    globalSegments: ['.claude', 'skills'],
    workspaceSegments: ['.claude', 'skills'],
    homeEnv: 'CLAUDE_CONFIG_DIR'
  },
  // Project skills use the canonical root; only global scope needs separate placement.
  {
    id: 'cursor',
    displayName: 'Cursor',
    globalSegments: ['.cursor', 'skills'],
    workspaceSegments: null
  },
  {
    id: 'gemini',
    displayName: 'Gemini CLI',
    globalSegments: ['.gemini', 'skills'],
    workspaceSegments: null
  },
  {
    id: 'grok',
    displayName: 'Grok',
    globalSegments: ['.grok', 'skills'],
    workspaceSegments: ['.grok', 'skills'],
    homeEnv: 'GROK_HOME'
  },
  {
    id: 'kiro',
    displayName: 'Kiro',
    globalSegments: ['.kiro', 'skills'],
    workspaceSegments: ['.kiro', 'skills'],
    homeEnv: 'KIRO_HOME'
  },
  {
    id: 'antigravity',
    displayName: 'Antigravity',
    globalSegments: ['.gemini', 'config', 'skills'],
    workspaceSegments: null
  },
  // Install into OpenClaude’s own roots; native-chat skillSourceOwner uses a separate mapping.
  {
    id: 'openclaude',
    displayName: 'OpenClaude',
    globalSegments: ['.openclaude', 'skills'],
    workspaceSegments: ['.openclaude', 'skills'],
    homeEnv: 'OPENCLAUDE_CONFIG_DIR'
  },
  {
    id: 'devin',
    displayName: 'Devin',
    globalSegments: null,
    workspaceSegments: null
  },
  {
    id: 'opencode',
    displayName: 'OpenCode',
    globalSegments: null,
    workspaceSegments: null
  },
  {
    id: 'copilot',
    displayName: 'GitHub Copilot',
    globalSegments: null,
    workspaceSegments: null
  },
  {
    id: 'opencode2',
    displayName: 'OpenCode 2',
    globalSegments: null,
    workspaceSegments: null
  }
] satisfies SkillInstallProviderEntry[])

export type SkillInstallProviderDefinition = (typeof SKILL_INSTALL_PROVIDERS)[number]
export type SkillInstallProviderId = SkillInstallProviderDefinition['id']

export function isSkillInstallProviderId(value: string): value is SkillInstallProviderId {
  return SKILL_INSTALL_PROVIDERS.some((provider) => provider.id === value)
}

/** Explicit choices include agents installed later; removal omits choices to clean every previously used root. */
export function selectedOrDetectedSkillProviders(
  detectedProviders: readonly string[],
  selectedProviders: readonly string[] | undefined
): readonly string[] {
  return selectedProviders ?? detectedProviders
}
