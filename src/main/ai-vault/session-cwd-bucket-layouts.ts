import type { AiVaultAgent } from '../../shared/ai-vault/contracts/ai-vault-types'
import {
  claudeProjectBucketScopePrefixes,
  isClaudeProjectBucketInScope
} from './scanners/claude/claude-project-dir-encoding'

export type CwdBucketLayout = {
  agent: Extract<AiVaultAgent, 'claude'>
  encodeScopePrefixes: (scopePath: string) => string[]
  isDirInScope: (dirName: string, prefixes: ReadonlySet<string>) => boolean
  /** Folders whose children are cwd buckets; defaults to the root itself. */
  bucketDirs?: (rootDir: string) => string[]
}

export const CLAUDE_CWD_BUCKET_LAYOUT: CwdBucketLayout = {
  agent: 'claude',
  encodeScopePrefixes: claudeProjectBucketScopePrefixes,
  isDirInScope: isClaudeProjectBucketInScope
}
