// @vitest-environment happy-dom

import type { ComponentProps, JSX } from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TooltipProvider } from '@/components/ui/tooltip'
import type {
  AiVaultSession,
  AiVaultSubagentListResult
} from '../../../../../../shared/ai-vault/contracts/ai-vault-types'
import { SessionSubagentsSection as ProductionSessionSubagentsSection } from './AiVaultSessionSubagents'

const listSubagentSessions = vi.fn<(args: unknown) => Promise<AiVaultSubagentListResult>>()

function SessionSubagentsSection(
  props: ComponentProps<typeof ProductionSessionSubagentsSection>
): JSX.Element {
  return (
    <TooltipProvider>
      <ProductionSessionSubagentsSection {...props} />
    </TooltipProvider>
  )
}

beforeEach(() => {
  listSubagentSessions.mockReset()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only window.api shim
  ;(window as any).api = {
    aiVault: { listSubagentSessions },
    shell: { openFilePath: vi.fn() }
  }
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function makeSession(overrides: Partial<AiVaultSession> = {}): AiVaultSession {
  return {
    id: 'local:claude:parent-session:/tmp/parent-session.jsonl',
    executionHostId: 'local',
    agent: 'claude',
    sessionId: 'parent-session',
    title: 'Parent session',
    cwd: '/repo',
    branch: null,
    model: null,
    filePath: '/tmp/parent-session.jsonl',
    codexHome: null,
    createdAt: null,
    updatedAt: null,
    modifiedAt: '2026-07-05T10:00:00.000Z',
    messageCount: 3,
    totalTokens: 0,
    previewMessages: [],
    queuedMessageCount: 0,
    subagentTranscriptCount: 1,
    resumeCommand: 'claude --resume parent-session',
    subagent: null,
    ...overrides
  }
}

function makeSubagent(title: string): AiVaultSession {
  return makeSession({
    id: `local:claude:parent-session:/tmp/parent-session/subagents/agent-${title}.jsonl`,
    title,
    filePath: `/tmp/parent-session/subagents/agent-${title}.jsonl`,
    subagent: { parentSessionId: 'parent-session', agentType: null, status: 'running' },
    subagentTranscriptCount: 0
  })
}

describe('SessionSubagentsSection', () => {
  it('keeps the loaded list visible while a rescan-triggered refetch is in flight', async () => {
    listSubagentSessions.mockResolvedValueOnce({
      sessions: [makeSubagent('First pass')],
      issues: []
    })
    const { rerender, queryByText } = render(<SessionSubagentsSection session={makeSession()} />)
    await act(async () => {})
    expect(queryByText('First pass')).not.toBeNull()

    // Hold the replacement read pending to verify retained rows do not flicker away.
    let resolveSecond: (result: AiVaultSubagentListResult) => void = () => {}
    listSubagentSessions.mockImplementationOnce(
      () => new Promise((resolve) => (resolveSecond = resolve))
    )
    rerender(
      <SessionSubagentsSection session={makeSession({ modifiedAt: '2026-07-05T10:05:00.000Z' })} />
    )
    await act(async () => {})
    expect(listSubagentSessions).toHaveBeenCalledTimes(2)
    expect(queryByText('First pass')).not.toBeNull()

    await act(async () => {
      resolveSecond({ sessions: [makeSubagent('Second pass')], issues: [] })
    })
    expect(queryByText('Second pass')).not.toBeNull()
    expect(queryByText('First pass')).toBeNull()
  })
})
