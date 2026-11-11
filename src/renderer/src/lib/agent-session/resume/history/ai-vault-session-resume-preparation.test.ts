import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AiVaultSession } from '../../../../../../shared/ai-vault/contracts/ai-vault-types'
import { prepareAiVaultSessionForTerminalResume } from './ai-vault-session-resume-preparation'

const browseServerDir = vi.hoisted(() => vi.fn())
vi.mock('@/runtime/files/reads/runtime-server-directory-browser', () => ({
  browseRuntimeServerDirectory: browseServerDir
}))

afterEach(() => {
  vi.unstubAllGlobals()
  browseServerDir.mockReset()
})

describe('ordinary Resume against an older paired host', () => {
  it.each([
    new Error(
      "Error invoking remote method 'aiVault:prepareSessionResume': Error: aiVault.prepareSessionResume: method_not_found"
    ),
    Object.assign(new Error('Unknown method: aiVault.prepareSessionResume'), {
      code: 'method_not_found'
    })
  ])('retains neutral resumes but requires managed Codex home preparation', async (error) => {
    stubPreparation(vi.fn().mockRejectedValue(error))
    const remote = session({ agent: 'claude', executionHostId: 'runtime:paired' })
    await expect(prepareAiVaultSessionForTerminalResume(remote)).resolves.toBe(remote)
    await expect(
      prepareAiVaultSessionForTerminalResume(
        session({
          executionHostId: 'runtime:paired',
          codexHome: '/tmp/orca/codex-runtime-home/home'
        })
      )
    ).rejects.toBe(error)
  })
})

function stubPreparation(prepareSessionResume: ReturnType<typeof vi.fn>): void {
  vi.stubGlobal('window', { api: { aiVault: { prepareSessionResume } } })
}

function session(overrides: Partial<AiVaultSession> = {}): AiVaultSession {
  return {
    id: 'local:codex:session-1:/tmp/rollout.jsonl',
    executionHostId: 'local',
    agent: 'codex',
    sessionId: 'session-1',
    title: 'Legacy session',
    cwd: '/repo',
    branch: null,
    model: null,
    filePath: '/tmp/rollout.jsonl',
    codexHome: null,
    createdAt: null,
    updatedAt: null,
    modifiedAt: '2026-07-20T00:00:00.000Z',
    messageCount: 1,
    totalTokens: 0,
    previewMessages: [],
    queuedMessageCount: 0,
    subagentTranscriptCount: 0,
    resumeCommand: "codex resume 'session-1'",
    subagent: null,
    ...overrides
  }
}
