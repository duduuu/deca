import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parseAgentSessionFile } from '../session-scanner-agent-parser'
import {
  CODEX_FIXTURE_SESSION_ID,
  codexFixture
} from '../scanners/codex/session-scanner-codex-fixtures'
import { createSessionParseStats, parseAgentSessionFileCached } from './session-scanner-parse-cache'
import { resetSessionParseCacheForTests } from './session-parse-cache-store'
import type { SessionFileCandidate } from '../session-scanner-types'

let tempRoots: string[] = []

beforeEach(() => {
  resetSessionParseCacheForTests()
})

afterEach(async () => {
  await Promise.all(tempRoots.map((root) => rm(root, { recursive: true, force: true })))
  tempRoots = []
})

async function makeTempDir(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'orca-parse-cache-agents-'))
  tempRoots.push(root)
  return root
}

async function candidateFor(
  agent: SessionFileCandidate['agent'],
  path: string,
  codexHome: string | null = null
): Promise<SessionFileCandidate> {
  const fileStat = await stat(path)
  return {
    agent,
    file: {
      path,
      mtimeMs: fileStat.mtimeMs,
      modifiedAt: fileStat.mtime.toISOString(),
      sizeBytes: fileStat.size
    },
    codexHome
  }
}

describe('codex-specific resume behavior', () => {
  it('picks up a session_index title that appears after the transcript was cached', async () => {
    const root = await makeTempDir()
    const codexHome = join(root, 'codex-home')
    const sessionsDir = join(codexHome, 'sessions', '2026', '05', '01')
    await mkdir(sessionsDir, { recursive: true })
    const fixture = codexFixture()
    const path = join(sessionsDir, fixture.fileName)
    await writeFile(path, `${fixture.seedLines.join('\n')}\n`)

    const seeded = await parseAgentSessionFileCached(
      await candidateFor('codex', path, codexHome),
      process.platform
    )
    expect(seeded?.title).toBe('codex seed question')
    expect(seeded?.titleKind).toBe('fallback')

    // Index titles arrive independently of transcript writes.
    await writeFile(
      join(codexHome, 'session_index.jsonl'),
      `${JSON.stringify({ id: CODEX_FIXTURE_SESSION_ID, thread_name: 'Indexed thread title' })}\n`
    )
    const stats = createSessionParseStats()
    const renamed = await parseAgentSessionFileCached(
      await candidateFor('codex', path, codexHome),
      process.platform,
      stats
    )
    expect(stats.reused).toBe(1)
    expect(renamed?.title).toBe('Indexed thread title')
    expect(renamed?.titleKind).toBe('named')
    expect(renamed).toEqual(
      await parseAgentSessionFile(await candidateFor('codex', path, codexHome), process.platform)
    )
  })
})
