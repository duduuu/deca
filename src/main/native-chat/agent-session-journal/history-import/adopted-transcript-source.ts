import { dirname, join } from 'node:path'
import { sessionIdFromFileName } from '../../../ai-vault/session-scanner-accumulator'
import type { AgentType } from '../../../../shared/agent-status/contracts/agent-status-types'
import { normalizeRuntimePathForComparison } from '../../../../shared/cross-platform-path'
import { readNodeFileWithinLimit } from '../../../../shared/file-content/node-bounded-file-reader'
import { extractString, parseJsonObject } from '../../../ai-vault/session-scanner-values'
import { asRecord } from '../../../ai-vault/session-scanner-record-value'

import { readOpenCodeTranscriptSignalViaWorker } from '../../../ai-vault/scanners/opencode/reader-transport/session-scanner-opencode-sqlite-worker-spawn'
import { admitTranscriptPath } from '../../transcript-path-admission'
import { adoptedDirectoryProbes } from './adopted-directory-probe'

export type AdoptedTranscriptSource = {
  providerSessionId: string
  workspaceCwd: string
  /** Host-selected account store, never supplied by a wire caller or persisted. */
  conversationStore?: string
}

export async function assertAdoptedSourceIdentity(
  source: AdoptedTranscriptSource,
  actual: { sessionId: string | null; cwd: string | null },
  requireCwd = true,
  signal?: AbortSignal
): Promise<void> {
  if (actual.sessionId !== source.providerSessionId) {
    throw new Error('The saved conversation does not match the requested provider identity.')
  }
  if (!requireCwd) {
    return
  }
  if (!actual.cwd) {
    throw new Error('This conversation belongs to another directory.')
  }
  if (
    normalizeRuntimePathForComparison(actual.cwd.trim()) ===
    normalizeRuntimePathForComparison(source.workspaceCwd.trim())
  ) {
    return
  }
  const matched = await adoptedDirectoryProbes.matches(source.workspaceCwd, actual.cwd, signal)
  if (!matched) {
    throw new Error('This conversation belongs to another directory.')
  }
}

// Observe metadata from the same lines imported into the journal.
export function adoptedTranscriptSourceObserver(input: {
  agent: AgentType
  filePath: string
  source: AdoptedTranscriptSource
  maxSourceBytes: number
  signal?: AbortSignal
}) {
  let sessionId: string | null =
    input.agent === 'claude' || input.agent === 'codex'
      ? sessionIdFromFileName(input.filePath)
      : null
  let cwd: string | null = null
  let sawCodexMetadata = false
  return {
    observe(line: string) {
      const record = parseJsonObject(line)
      if (!record) {
        return
      }
      if (input.agent === 'claude') {
        sessionId = extractString(record.sessionId) ?? sessionId
        cwd ??= extractString(record.cwd)
      } else if (input.agent === 'codex' && record.type === 'session_meta' && !sawCodexMetadata) {
        sawCodexMetadata = true
        const payload = asRecord(record.payload)
        sessionId = extractString(payload?.id) ?? sessionId
      }
    },
    async validate() {
      if (input.agent === 'grok') {
        const summaryPath = join(dirname(input.filePath), 'summary.json')
        if (!(await admitTranscriptPath(dirname(input.filePath), summaryPath))) {
          throw new Error('The conversation summary is outside its storage directory.')
        }
        const { buffer } = await readNodeFileWithinLimit(summaryPath, input.maxSourceBytes, {
          regularFileOnly: true
        })
        const summary = asRecord(asRecord(JSON.parse(buffer.toString('utf8')))?.info)
        sessionId = extractString(summary?.id) ?? sessionIdFromFileName(dirname(input.filePath))
        cwd = extractString(summary?.cwd)
      }
      await assertAdoptedSourceIdentity(
        input.source,
        { sessionId, cwd },
        input.agent !== 'codex',
        input.signal
      )
    }
  }
}

export async function validateAdoptedOpenCodeSource(
  dbPath: string,
  source: AdoptedTranscriptSource,
  signal?: AbortSignal
): Promise<void> {
  const metadata = await readOpenCodeTranscriptSignalViaWorker(
    {
      dbPath,
      sessionId: source.providerSessionId
    },
    signal
  )
  await assertAdoptedSourceIdentity(
    source,
    {
      sessionId: metadata ? source.providerSessionId : null,
      cwd: metadata?.cwd ?? null
    },
    true,
    signal
  )
}
