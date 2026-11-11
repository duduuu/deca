import type { SFTPWrapper } from 'ssh2'
import type {
  AgentHookInstallStatus,
  AgentHookTarget
} from '../../../shared/agent-hook-listener/configuration/agent-hook-types'
import { claudeHookService } from '../../claude/hook-service'
import { codexHookService } from '../../codex/hooks/installation/hook-service'
import { geminiHookService } from '../../gemini/hook-service'
import { antigravityHookService } from '../../antigravity/hook-service'
import { cursorHookService } from '../../cursor/hook-service'
import { copilotHookService } from '../../copilot/hook-service'
import { devinHookService } from '../../devin/hook-service'
import { grokHookService } from '../../grok/hook-service'
import { kiroHookService } from '../../kiro/hook-service'
export type RemoteManagedHookInstallOptions = {
  /** Redirected runtime CODEX_HOME, including managed WSL homes. */
  codexHomeDir?: string
  /** Skip the trust write when a redirected runtime config is seeded by the launch path. */
  deferTrustUntilConfigToml?: boolean
  grokHomeDir?: string
  /** Login-shell KIRO_HOME on the execution host; it replaces ~/.kiro outright. */
  kiroHomeDir?: string
  claudeVersion?: string
  /** Cancellation stops the next installer; individual mutations remain atomic. */
  signal?: AbortSignal
  /** Only positively detected, enabled agents may mutate configs; omitted/empty installs nothing. */
  agents?: readonly AgentHookTarget[]
}

type RemoteManagedHookInstaller = readonly [
  AgentHookInstallStatus['agent'],
  (
    sftp: SFTPWrapper,
    remoteHome: string,
    options?: RemoteManagedHookInstallOptions
  ) => Promise<AgentHookInstallStatus>
]

const REMOTE_MANAGED_HOOK_INSTALLERS: readonly RemoteManagedHookInstaller[] = [
  [
    'claude',
    (sftp, remoteHome, options) =>
      claudeHookService.installRemote(sftp, remoteHome, {
        claudeVersion: options?.claudeVersion
      })
  ],
  [
    'codex',
    (sftp, remoteHome, options) =>
      codexHookService.installRemote(sftp, remoteHome, {
        codexHomeDir: options?.codexHomeDir,
        deferTrustUntilConfigToml: options?.deferTrustUntilConfigToml
      })
  ],
  ['gemini', (sftp, remoteHome) => geminiHookService.installRemote(sftp, remoteHome)],
  ['antigravity', (sftp, remoteHome) => antigravityHookService.installRemote(sftp, remoteHome)],
  ['cursor', (sftp, remoteHome) => cursorHookService.installRemote(sftp, remoteHome)],
  ['copilot', (sftp, remoteHome) => copilotHookService.installRemote(sftp, remoteHome)],
  [
    'grok',
    (sftp, remoteHome, options) =>
      grokHookService.installRemote(sftp, remoteHome, options?.grokHomeDir)
  ],
  ['devin', (sftp, remoteHome) => devinHookService.installRemote(sftp, remoteHome)],
  [
    'kiro',
    (sftp, remoteHome, options) =>
      kiroHookService.installRemote(sftp, remoteHome, options?.kiroHomeDir)
  ]
]

export const REMOTE_MANAGED_HOOK_INSTALLER_AGENTS: readonly AgentHookInstallStatus['agent'][] =
  REMOTE_MANAGED_HOOK_INSTALLERS.map(([agent]) => agent)

export async function installRemoteManagedAgentHooks(
  sftp: SFTPWrapper,
  remoteHome: string,
  options?: RemoteManagedHookInstallOptions
): Promise<AgentHookInstallStatus[]> {
  // An empty allowlist must not create config homes for uninstalled CLIs.
  const allowedAgents = new Set(options?.agents ?? [])
  if (allowedAgents.size === 0) {
    return []
  }
  const results: AgentHookInstallStatus[] = []
  for (const [agent, install] of REMOTE_MANAGED_HOOK_INSTALLERS) {
    if (!allowedAgents.has(agent)) {
      continue
    }
    // Stop further config mutations when the owning relay request disappears.
    options?.signal?.throwIfAborted()
    try {
      const result = await install(sftp, remoteHome, options)
      results.push(result)
      if (result.state === 'error') {
        console.warn(
          `[agent-hooks] Remote ${agent} managed hook install failed for ${result.configPath}: ${
            result.detail ?? 'unknown error'
          }`
        )
      }
    } catch (error) {
      // Hook failures must not prevent SSH terminals, files, and Git from becoming available.
      const detail = error instanceof Error ? error.message : String(error)
      console.warn(`[agent-hooks] Remote ${agent} managed hook install threw: ${detail}`)
      results.push({
        agent,
        state: 'error',
        configPath: remoteHome,
        managedHooksPresent: false,
        detail
      })
    }
  }
  return results
}
