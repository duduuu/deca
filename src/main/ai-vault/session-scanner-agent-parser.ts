import { throwIfAiVaultScanCancelled, waitForAiVaultScan } from './ai-vault-scan-cancellation'
import type { AiVaultSession } from '../../shared/ai-vault/contracts/ai-vault-types'
import { parseDevinSessionFile } from './scanners/devin/session-scanner-devin-parser'
import { parseAntigravitySessionFile } from './scanners/antigravity/session-scanner-antigravity-parser'
import { parseGrokSessionFile } from './scanners/grok/session-scanner-grok-parser'
import { splitOpenCodeSqliteCandidate } from '../../shared/opencode-sqlite-session-path'
import { parseKiroSessionFile } from './scanners/kiro/session-scanner-kiro-parser'
import {
  captureOpenCodeSqliteSessionViaWorker,
  captureOpenCode2SqliteSessionViaWorker,
  parseOpenCode2SqliteSessionViaWorker,
  parseOpenCodeSqliteSessionViaWorker
} from './scanners/opencode/reader-transport/session-scanner-opencode-sqlite-worker-spawn'
import { parseClaudeSessionFile } from './scanners/claude/session-scanner-primary-parsers'
import { parseGeminiSessionFile } from './scanners/gemini/session-scanner-gemini-parsers'
import { parseCodexSessionFile } from './scanners/codex/session-scanner-codex-parser'
import { parseCopilotSessionFile } from './scanners/copilot/session-scanner-copilot-parser'
import { parseCursorSessionFile } from './scanners/cursor/session-scanner-cursor-parser'
import { parseOpenCodeSessionFile } from './scanners/opencode/session-scanner-opencode-parser'
import type { SessionFileCandidate } from './session-scanner-types'
import type { TranscriptMessageSink } from './transcripts/session-transcript-consumers'
import type { SkippedTranscriptRecord } from './transcripts/session-transcript-record-budget'

/** Listing needs only a preview; active message sinks require the full transcript. */
async function readOpenCodeSqliteCandidate(
  sqliteCandidate: { dbPath: string; sessionId: string },
  platform: NodeJS.Platform,
  messages?: TranscriptMessageSink,
  signal?: AbortSignal,
  agent?: 'opencode2'
): Promise<AiVaultSession | null> {
  throwIfAiVaultScanCancelled(signal)
  const request = { ...sqliteCandidate, platform, signal }
  if (!messages?.active) {
    const parse =
      agent === 'opencode2'
        ? parseOpenCode2SqliteSessionViaWorker
        : parseOpenCodeSqliteSessionViaWorker
    const session = await waitForAiVaultScan(parse(request), signal)
    throwIfAiVaultScanCancelled(signal)
    return session
  }
  const capture =
    agent === 'opencode2'
      ? captureOpenCode2SqliteSessionViaWorker
      : captureOpenCodeSqliteSessionViaWorker
  const result = await waitForAiVaultScan(capture(request), signal)
  for (const message of result.messages) {
    throwIfAiVaultScanCancelled(signal)
    messages.push(message)
    await waitForAiVaultScan(messages.drain?.() ?? Promise.resolve(), signal)
  }
  throwIfAiVaultScanCancelled(signal)
  return result.session
}

export async function parseAgentSessionFile(
  candidate: SessionFileCandidate,
  platform: NodeJS.Platform,
  messages?: TranscriptMessageSink,
  signal?: AbortSignal,
  onSkippedRecords?: (records: SkippedTranscriptRecord[]) => void
): Promise<AiVaultSession | null> {
  switch (candidate.agent) {
    case 'claude':
      return parseClaudeSessionFile(candidate.file, platform, messages)
    case 'codex':
      return parseCodexSessionFile(
        candidate.file,
        platform,
        candidate.codexHome,
        undefined,
        messages
      )
    case 'gemini':
      return parseGeminiSessionFile(candidate.file, platform, messages, signal)
    case 'antigravity':
      return parseAntigravitySessionFile(candidate.file, platform, messages)
    case 'copilot':
      return parseCopilotSessionFile(candidate.file, platform, messages)
    case 'cursor':
      return parseCursorSessionFile(candidate.file, platform, messages)
    case 'opencode': {
      // Synthetic db#id paths identify SQLite sessions; real paths retain the legacy JSON parser.
      const sqliteCandidate = splitOpenCodeSqliteCandidate(candidate.file.path)
      if (sqliteCandidate) {
        return readOpenCodeSqliteCandidate(sqliteCandidate, platform, messages, signal)
      }
      return parseOpenCodeSessionFile(candidate.file, platform, messages, signal)
    }
    case 'opencode2': {
      const sqliteCandidate = splitOpenCodeSqliteCandidate(candidate.file.path)
      if (sqliteCandidate) {
        return readOpenCodeSqliteCandidate(sqliteCandidate, platform, messages, signal, 'opencode2')
      }
      return null
    }
    case 'grok':
      return parseGrokSessionFile(candidate.file, platform, messages, signal)
    case 'devin':
      return parseDevinSessionFile(candidate.file, platform, messages, signal)
    case 'kiro':
      return parseKiroSessionFile(candidate.file, platform, messages, onSkippedRecords, signal)
  }
}
