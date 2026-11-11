import type { AgentHookInstallStatus } from '../../../shared/agent-hook-listener/configuration/agent-hook-types'
import type { HookInstallAgent } from '../../../shared/telemetry-daemon-event-schemas'
import { antigravityHookService } from '../../antigravity/hook-service'
import { claudeHookService } from '../../claude/hook-service'
import { codexHookService } from '../../codex/hooks/installation/hook-service'
import { copilotHookService } from '../../copilot/hook-service'
import { cursorHookService } from '../../cursor/hook-service'
import { devinHookService } from '../../devin/hook-service'
import { geminiHookService } from '../../gemini/hook-service'
import { grokHookService } from '../../grok/hook-service'
import { kiroHookService } from '../../kiro/hook-service'
export type ManagedAgentHookInstallOptions = { userInitiated?: boolean; cliVersion?: string }
export type ManagedAgentHookInstaller = readonly [
  HookInstallAgent,
  (
    options?: ManagedAgentHookInstallOptions
  ) => AgentHookInstallStatus | Promise<AgentHookInstallStatus>
]
export type ManagedAgentHookScriptRefresher = readonly [HookInstallAgent, () => Promise<void>]
export type ManagedAgentHookRemover = readonly [
  HookInstallAgent,
  () => AgentHookInstallStatus | Promise<AgentHookInstallStatus>
]
export type ManagedAgentHookAsyncRemover = readonly [
  HookInstallAgent,
  () => Promise<AgentHookInstallStatus>
]
export type ManagedAgentHookStatusReader = readonly [HookInstallAgent, () => AgentHookInstallStatus]

export const MANAGED_AGENT_HOOK_INSTALLERS: readonly ManagedAgentHookInstaller[] = [
  ['claude', (options) => claudeHookService.install({ claudeVersion: options?.cliVersion })],
  ['codex', () => codexHookService.reconcileHooks()],
  ['gemini', () => geminiHookService.install()],
  ['antigravity', () => antigravityHookService.install()],
  ['cursor', () => cursorHookService.install()],
  ['grok', (options) => grokHookService.install(options)],
  ['copilot', () => copilotHookService.install()],
  ['devin', () => devinHookService.install()],
  ['kiro', () => kiroHookService.install()]
]

// Refresh shared launchers even after CLI removal; Amp/Hermes manage provider-native plugins separately.
export const MANAGED_AGENT_HOOK_SCRIPT_REFRESHERS: readonly ManagedAgentHookScriptRefresher[] = [
  ['claude', () => claudeHookService.refreshManagedScripts()],
  ['codex', () => codexHookService.refreshManagedScripts()],
  ['gemini', () => geminiHookService.refreshManagedScripts()],
  ['antigravity', () => antigravityHookService.refreshManagedScripts()],
  ['cursor', () => cursorHookService.refreshManagedScripts()],
  ['grok', () => grokHookService.refreshManagedScripts()],
  ['copilot', () => copilotHookService.refreshManagedScripts()],
  ['devin', () => devinHookService.refreshManagedScripts()],
  ['kiro', () => kiroHookService.refreshManagedScripts()]
]

export const MANAGED_AGENT_HOOK_REMOVERS: readonly ManagedAgentHookRemover[] = [
  ['claude', () => claudeHookService.remove()],
  ['codex', () => codexHookService.remove()],
  ['gemini', () => geminiHookService.remove()],
  ['antigravity', () => antigravityHookService.remove()],
  ['cursor', () => cursorHookService.remove()],
  ['grok', () => grokHookService.remove()],
  ['copilot', () => copilotHookService.remove()],
  ['devin', () => devinHookService.remove()],
  ['kiro', () => kiroHookService.remove()]
]

export const MANAGED_AGENT_HOOK_ASYNC_REMOVERS: readonly ManagedAgentHookAsyncRemover[] = [
  ['grok', () => grokHookService.removeAsync()]
]

export const MANAGED_AGENT_HOOK_STATUS_READERS: readonly ManagedAgentHookStatusReader[] = [
  ['claude', () => claudeHookService.getStatus()],
  ['codex', () => codexHookService.getStatus()],
  ['gemini', () => geminiHookService.getStatus()],
  ['antigravity', () => antigravityHookService.getStatus()],
  ['cursor', () => cursorHookService.getStatus()],
  ['grok', () => grokHookService.getStatus()],
  ['copilot', () => copilotHookService.getStatus()],
  ['devin', () => devinHookService.getStatus()],
  ['kiro', () => kiroHookService.getStatus()]
]
