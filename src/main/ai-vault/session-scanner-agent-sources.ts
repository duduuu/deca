import { homedir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { pathSegments } from './session-file-discovery'
import { resolveAbsoluteDirOverride } from '../../shared/absolute-dir-override'
import type { AiVaultAgent } from '../../shared/ai-vault/contracts/ai-vault-types'
import type { AiVaultDeletableAgent } from '../../shared/ai-vault/contracts/ai-vault-session-deletion'
import { resolveGrokSessionsDir } from '../../shared/grok-session-paths'
import { resolveKiroHomeDir } from '../../shared/kiro-home'
import { uniqueCodexSessionsDirs } from './scanners/codex/session-scanner-codex-paths'
import { kiroTranscriptPathForMetadata } from '../../shared/ai-vault/session-display/ai-vault-session-log-resource'
import { cursorChatMetaPath } from './scanners/cursor/session-scanner-cursor-chat-meta'
import { devinSessionsDbDependencyPath } from './scanners/devin/session-scanner-devin-db'
import { isKiroSessionMetadataPath } from './scanners/kiro/session-scanner-kiro-parser'

import {
  claudeProjectsRootDirs,
  codexHomeSessionsDir,
  sessionRootDirs,
  wslHomeSessionDirs
} from './session-scanner-roots'
import { isClaudeProjectBucketDirectory } from './scanners/claude/claude-project-dir-encoding'
import type { AiVaultScanOptions } from './session-scanner-types'

export const DEFAULT_CODEX_HOME_DIR = join(homedir(), '.codex')
const GEMINI_SESSIONS_DIR = join(homedir(), '.gemini', 'tmp')
const COPILOT_SESSIONS_DIR = join(
  resolveAbsoluteDirOverride(process.env.COPILOT_HOME, join(homedir(), '.copilot')),
  'session-state'
)
const CURSOR_PROJECTS_DIR = join(homedir(), '.cursor', 'projects')
const DEVIN_TRANSCRIPTS_DIR = join(
  resolveAbsoluteDirOverride(
    process.env.DEVIN_HOME,
    process.platform === 'win32'
      ? join(process.env.APPDATA?.trim() || join(homedir(), 'AppData', 'Roaming'), 'devin', 'cli')
      : join(
          process.env.XDG_DATA_HOME?.trim() || join(homedir(), '.local', 'share'),
          'devin',
          'cli'
        )
  ),
  'transcripts'
)
const KIRO_SESSIONS_DIR = join(resolveKiroHomeDir(), 'sessions', 'cli')

/** Shared discovery rules constrain which paths the delete validator accepts. */
export type AiVaultAgentSource = {
  // Resolve lazily: module-time Grok resolution breaks cross-chunk initialization ordering.
  rootDirs: (options: AiVaultScanOptions, wslHomeDirs: readonly string[]) => string[]
  extensions: readonly string[]
  filePredicate?: (filePath: string) => boolean
  // Sidecar stats affect freshness and recency; async resolution supports non-derived paths.
  contentDependencyPath?: (filePath: string) => string | undefined | Promise<string | undefined>
  // Return false to skip a directory; depth 0 is a child of the root.
  directoryPredicate?: (name: string, depth: number) => boolean
  // Share the per-agent limit across alternate roots for one install.
  mergeRootDiscoveries?: boolean
}

type AiVaultAgentSourceTable = Record<AiVaultDeletableAgent, AiVaultAgentSource> &
  Partial<Record<AiVaultAgent, AiVaultAgentSource>>

// OpenCode and Antigravity use dedicated discovery for their storage layouts.
export const AI_VAULT_AGENT_SOURCES: AiVaultAgentSourceTable = {
  claude: {
    rootDirs: (options, wslHomeDirs) =>
      claudeProjectsRootDirs({
        claudeProjectsDir: options.claudeProjectsDir,
        wslHomeDirs,
        claudeProfileProjectsDirs: options.claudeProfileProjectsDirs
      }),
    extensions: ['.jsonl'],
    // Subagent transcripts are read under their parent instead of duplicating History rows.
    directoryPredicate: isClaudeProjectBucketDirectory
  },
  codex: {
    rootDirs: (options, wslHomeDirs) =>
      uniqueCodexSessionsDirs([
        options.codexSessionsDir ?? codexHomeSessionsDir(),
        ...wslHomeSessionDirs('codex', wslHomeDirs),
        ...(options.additionalCodexSessionsDirs ?? [])
      ]),
    // Codex archives rollouts idle 7+ days as .jsonl.zst (#40312); only rollout-named archives.
    extensions: ['.jsonl', '.zst'],
    filePredicate: (filePath) =>
      !filePath.toLowerCase().endsWith('.zst') ||
      /^rollout-.+\.jsonl\.zst$/.test(basename(filePath))
  },
  gemini: {
    rootDirs: (options, wslHomeDirs) =>
      sessionRootDirs(options.geminiSessionsDir ?? GEMINI_SESSIONS_DIR, wslHomeDirs, [
        '.gemini',
        'tmp'
      ]),
    extensions: ['.json', '.jsonl']
  },
  copilot: {
    rootDirs: (options, wslHomeDirs) =>
      sessionRootDirs(options.copilotSessionsDir ?? COPILOT_SESSIONS_DIR, wslHomeDirs, [
        '.copilot',
        'session-state'
      ]),
    extensions: ['.jsonl']
  },
  cursor: {
    rootDirs: (options, wslHomeDirs) =>
      sessionRootDirs(options.cursorProjectsDir ?? CURSOR_PROJECTS_DIR, wslHomeDirs, [
        '.cursor',
        'projects'
      ]),
    extensions: ['.jsonl'],
    filePredicate: (filePath) => pathSegments(filePath).includes('agent-transcripts'),
    contentDependencyPath: cursorChatMetaPath
  },
  grok: {
    rootDirs: (options, wslHomeDirs) => [
      options.grokSessionsDir ?? resolveGrokSessionsDir(),
      ...wslHomeSessionDirs('grok', wslHomeDirs)
    ],
    extensions: ['.json'],
    filePredicate: (filePath) => basename(filePath) === 'summary.json'
  },
  devin: {
    rootDirs: (options, wslHomeDirs) => [
      ...sessionRootDirs(options.devinTranscriptsDir ?? DEVIN_TRANSCRIPTS_DIR, wslHomeDirs, [
        '.local',
        'share',
        'devin',
        'cli',
        'transcripts'
      ]),
      // Devin 3000.10.31 exports ATIF to agent_logs by default.
      ...(options.devinTranscriptsDir ? [] : [join(dirname(DEVIN_TRANSCRIPTS_DIR), 'agent_logs')]),
      ...wslHomeDirs.map((homeDir) =>
        join(homeDir, '.local', 'share', 'devin', 'cli', 'agent_logs')
      )
    ],
    mergeRootDiscoveries: true,
    extensions: ['.json'],
    // Database-only title or visibility changes must refresh sessions without rereading transcripts.
    contentDependencyPath: devinSessionsDbDependencyPath
  },
  kiro: {
    rootDirs: (options, wslHomeDirs) =>
      sessionRootDirs(options.kiroSessionsDir ?? KIRO_SESSIONS_DIR, wslHomeDirs, [
        '.kiro',
        'sessions',
        'cli'
      ]),
    extensions: ['.json'],
    filePredicate: isKiroSessionMetadataPath,
    // Transcript appends must invalidate the cached metadata row.
    contentDependencyPath: kiroTranscriptPathForMetadata,
    // Per-session subdirectories hold background task state, not sessions.
    directoryPredicate: () => false
  }
}

export function sessionRowRootDirs(
  agent: AiVaultDeletableAgent,
  options: AiVaultScanOptions,
  wslHomeDirs: readonly string[]
): string[] {
  return AI_VAULT_AGENT_SOURCES[agent].rootDirs(options, wslHomeDirs)
}

export { isDiscoverableSessionFile } from './session-file-discovery'
