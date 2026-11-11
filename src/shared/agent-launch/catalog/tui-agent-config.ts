import type { TuiAgent } from './tui-agent'
import {
  getOrcaCliCommandNameForPlatform,
  skipsLinuxOrcaCliRename
} from '../../orca-cli-command-name'
import type { TuiAgentConfig, TuiAgentConfigSource } from './tui-agent-config-types'

function resolveTuiAgentConfig(source: TuiAgentConfigSource): TuiAgentConfig {
  return {
    ...source,
    launchCmd: source.launchCmd ?? source.detectCmd,
    expectedProcess: source.expectedProcess ?? source.detectCmd
  }
}

const TUI_AGENT_CONFIG_SOURCE: Record<TuiAgent, TuiAgentConfigSource> = {
  claude: {
    detectCmd: 'claude',
    promptInjectionMode: 'argv',
    pasteNeedsTypedRequest: true,
    // Native --prefill avoids paste-after-ready races (https://github.com/stablyai/orca/pull/926).
    draftPromptFlag: '--prefill',
    preflightTrust: 'claude',
    // Why: CLAUDE_CODE_DISABLE_TERMINAL_TITLE drops the `✳` title tui-idle waits on (#22655).
    draftPasteReadySignal: 'claude-composer-prompt',
    workerStartReadsComposerMarker: true,
    // Why: Claude decodes CSI-u Ctrl+Enter on local ConPTY; CR made a remapped ctrl+enter act as Enter (#29711).
    ctrlEnterEncoding: 'csi-u'
  },
  'claude-agent-teams': {
    // This launch mode uses Orca’s CLI wrapper rather than a separate agent binary.
    detectCmd: 'deca',
    detectCmdAliases: ['orca-dev', 'deca-ide'],
    // Orca’s always-present shim alone must not report installed Agent Teams without Claude.
    detectRequiredCommands: ['claude'],
    // Windows/WSL use Claude’s in-process fallback, not this native-pane/tmux wrapper.
    detectUnsupportedRuntimes: ['win32', 'wsl'],
    launchCmd: 'orca claude-teams',
    launchCmdByPlatform: {
      linux: `${getOrcaCliCommandNameForPlatform('linux')} claude-teams`,
      win32: `${getOrcaCliCommandNameForPlatform('win32')} claude-teams`
    },
    expectedProcess: 'claude',
    promptInjectionMode: 'stdin-after-start',
    pasteNeedsTypedRequest: true,
    preflightTrust: 'claude',
    draftPasteReadySignal: 'claude-composer-prompt',
    workerStartReadsComposerMarker: true,
    // Why: runs the same Claude binary, so Ctrl+Enter must match `claude`.
    ctrlEnterEncoding: 'csi-u'
  },
  codex: {
    detectCmd: 'codex',
    promptInjectionMode: 'argv',
    windowsInputRecordPasteNewline: 'alt-enter',
    preflightTrust: 'codex',
    draftPasteReadySignal: 'codex-composer-prompt',
    draftPasteReadyTimeoutMs: 20_000,
    submitRetryDelayMs: 1200
  },
  opencode: {
    detectCmd: 'opencode',
    promptInjectionMode: 'flag-prompt',
    // Why: opencode enables bracketed paste before its composer mounts; wait for the post-\x1b[?2004h show-cursor so paste lands.
    draftPasteReadySignal: 'render-cursor-after-bracketed-paste',
    // OpenCode 2 renders input before loading its agent list; only the later agent/model row proves submit readiness.
    submitPasteReadySignal: 'opencode-agent-row',
    // Two Windows ConPTY hosts enabled paste at ~4.8s and composer readiness at ~10s; the 8s default pasted blind. Signals arrived reliably (#22479).
    draftPasteReadyTimeoutMs: 20_000,
    // Why: OpenCode decodes CSI-u Ctrl+Enter without local ConPTY kitty negotiation (#25372).
    ctrlEnterEncoding: 'csi-u',
    composerReadyCaptures: [
      'opencode-1-18-32-timed-boot-slow',
      'opencode-1-18-32-timed-boot-hidden-pane',
      'opencode-1-18-32-timed-first-launch',
      'opencode-cmd-2-0-21-timed-warm-server'
    ]
  },
  opencode2: {
    detectCmd: 'opencode2',
    // The private server inherits this pane's hook endpoint and identity.
    launchCmd: 'opencode2 --standalone',
    promptInjectionMode: 'flag-prompt',
    draftPasteReadySignal: 'render-cursor-after-bracketed-paste',
    submitPasteReadySignal: 'opencode-agent-row',
    draftPasteReadyTimeoutMs: 20_000,
    composerReadyCaptures: [
      'opencode-2-0-18-timed-boot-hidden-pane',
      'opencode-2-0-21-timed-cold-standalone',
      'opencode-2-0-21-timed-cold-standalone-hidden-pane',
      'opencode-2-0-21-timed-natural-load-enter-dropped',
      'opencode-2-0-14-timed-cold-standalone'
    ]
  },
  gemini: {
    detectCmd: 'gemini',
    promptInjectionMode: 'flag-prompt-interactive'
  },
  antigravity: {
    detectCmd: 'agy',
    promptInjectionMode: 'flag-prompt-interactive',
    // Antigravity trust is exact-path, so every child workspace can show a menu that consumes paste; pre-write trust (agent-trust-presets.ts).
    preflightTrust: 'antigravity',
    // The shell's own 2004h armed the quiet window, so a slow agy start got the paste in cooked mode (#18088).
    draftPasteReadySignal: 'antigravity-composer-prompt',
    draftPasteReadyTimeoutMs: 20_000,
    // agy 1.2.x expands collapsed multiline pastes over seconds; byte ingest finishing does not prove submit readiness.
    submitLineSettleMsPerLine: 45
  },
  kiro: {
    // The installer ships kiro-cli; preserve kiro as the stored preference ID.
    detectCmd: 'kiro-cli',
    // Kiro trust flags belong to chat, not the top-level command.
    launchCmd: 'kiro-cli chat --tui',
    promptInjectionMode: 'stdin-after-start'
  },
  cursor: {
    detectCmd: 'cursor-agent',
    promptInjectionMode: 'argv',
    // Why: first-launch trust menu swallows the bracketed paste; pre-write the .workspace-trusted marker so it skips (agent-trust-presets.ts).
    preflightTrust: 'cursor'
  },
  copilot: {
    detectCmd: 'copilot',
    // Why: `--prompt` exits on completion (kills the hosted session); `-i/--interactive` keeps it interactive.
    promptInjectionMode: 'flag-interactive',
    // Why: first-launch trust menu swallows the bracketed paste; pre-write trust so it skips (see agent-trust-presets.ts).
    preflightTrust: 'copilot',
    draftPasteReadySignal: 'copilot-composer-prompt'
  },
  grok: {
    detectCmd: 'grok',
    // Why: argv (grok takes a positional prompt) so multi-line/special-char text isn't mangled as raw PTY keystrokes.
    promptInjectionMode: 'argv',
    // Why: separator so prompts like `help`/`--version` aren't parsed as Grok CLI syntax.
    argvPromptSeparator: '--',
    // Grok’s shimmering logo never satisfies render quiet; its composer glyph arrives around 0.6s instead of the 8s timeout.
    draftPasteReadySignal: 'grok-composer-prompt',
    ctrlEnterEncoding: 'csi-u'
  },
  // Why: stdin-after-start's follow-up wrote before Devin's input loop existed (#26302); `devin -- <prompt>` submits reliably.
  // prettier-ignore
  devin: { detectCmd: 'devin', promptInjectionMode: 'argv', argvPromptSeparator: '--' }
}

export const TUI_AGENT_CONFIG: Record<TuiAgent, TuiAgentConfig> = Object.fromEntries(
  Object.entries(TUI_AGENT_CONFIG_SOURCE).map(([agent, source]) => [
    agent,
    resolveTuiAgentConfig(source)
  ])
) as Record<TuiAgent, TuiAgentConfig>

export function isTuiAgent(value: unknown): value is TuiAgent {
  return typeof value === 'string' && Object.hasOwn(TUI_AGENT_CONFIG, value)
}

export function getTuiAgentDetectCommands(config: TuiAgentConfig): string[] {
  return [config.detectCmd, ...(config.detectCmdAliases ?? [])]
}

export function getTuiAgentLaunchCommand(
  config: TuiAgentConfig,
  platform: NodeJS.Platform,
  opts?: { isRemote?: boolean }
): string {
  if (platform === 'linux' && skipsLinuxOrcaCliRename(opts?.isRemote)) {
    return config.launchCmd
  }
  return config.launchCmdByPlatform?.[platform] ?? config.launchCmd
}
