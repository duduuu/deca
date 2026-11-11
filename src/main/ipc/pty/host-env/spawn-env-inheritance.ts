import { readSessionShellStartupEnvVar } from '../../../pty/shell-startup/shell-startup-env'
import { AGENT_HOOK_RUNTIME_ENV_KEYS, ORCA_AGENT_SESSION_CALLER_ENV_KEYS } from './spawn-env-keys'
import { CLAUDE_CHILD_SESSION_STAMP_ENV_KEYS } from '../../../../shared/agent-launch/startup/claude-parent-session-env'

export function mergePtyEnvDeletions(
  existingKeys: string[] | undefined,
  ...additionalKeyGroups: readonly (readonly string[])[]
): string[] | undefined {
  if (!existingKeys && additionalKeyGroups.every((keys) => keys.length === 0)) {
    return undefined
  }
  return Array.from(new Set([...(existingKeys ?? []), ...additionalKeyGroups.flat()]))
}

export function removeCodexHomeDeletionRequests(keys: string[] | undefined): string[] | undefined {
  // Resume provenance selects the home; late deletions must not fall back to current account.
  const filtered = keys?.filter((key) => key !== 'CODEX_HOME' && key !== 'ORCA_CODEX_HOME')
  return filtered?.length ? filtered : undefined
}

export function getInheritedAgentHookEnvKeysToDelete(
  spawnEnv: Record<string, string> | undefined
): string[] {
  const env = spawnEnv ?? {}
  // Providers later merge ambient env; delete stale hooks without removing freshly injected coordinates.
  return [
    ...AGENT_HOOK_RUNTIME_ENV_KEYS,
    'ORCA_CLAUDE_AGENT_VIEW_PLUGIN_DIR',
    'ORCA_CLAUDE_CONFIG_DIR',
    'ORCA_OPENCODE_AGENT',
    'ORCA_OPENCODE_CONFIG_DIR',
    'ORCA_OPENCODE_SOURCE_CONFIG_DIR'
  ].filter((key) => env[key] === undefined)
}

export function getInheritedAgentSessionStampEnvKeysToDelete(
  spawnEnv: Record<string, string> | undefined
): string[] {
  const env = spawnEnv ?? {}
  // Explicit nested-Claude stamps survive; structured-session caller keys never belong to terminal panes.
  return [
    ...CLAUDE_CHILD_SESSION_STAMP_ENV_KEYS.filter((key) => env[key] === undefined),
    ...ORCA_AGENT_SESSION_CALLER_ENV_KEYS,
    // A pane is never a Claude background job; an inherited job dir would silence its agent hooks.
    'CLAUDE_JOB_DIR'
  ]
}

export function resolveOpenCodeSourceConfigDir(
  baseEnv: Record<string, string>,
  inheritedEnv: NodeJS.ProcessEnv = process.env
): string | undefined {
  const configDir = baseEnv.OPENCODE_CONFIG_DIR ?? inheritedEnv.OPENCODE_CONFIG_DIR
  const orcaConfigDir = baseEnv.ORCA_OPENCODE_CONFIG_DIR ?? inheritedEnv.ORCA_OPENCODE_CONFIG_DIR
  if (configDir && orcaConfigDir && configDir !== orcaConfigDir) {
    return configDir
  }
  const sourceDir =
    baseEnv.ORCA_OPENCODE_SOURCE_CONFIG_DIR ?? inheritedEnv.ORCA_OPENCODE_SOURCE_CONFIG_DIR
  if (sourceDir) {
    return sourceDir
  }

  // Matching public/private paths identify Orca-owned state, not user config to mirror into child Orcas.
  if (configDir && orcaConfigDir && configDir === orcaConfigDir) {
    return undefined
  }

  return configDir ?? readSessionShellStartupEnvVar('OPENCODE_CONFIG_DIR', baseEnv)
}
