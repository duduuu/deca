import type { AiVaultAgent } from '../../shared/ai-vault/contracts/ai-vault-types'

import { antigravityFixture } from './scanners/antigravity/session-scanner-antigravity-fixtures'
import { codexFixture } from './scanners/codex/session-scanner-codex-fixtures'
export type IncrementalAgentFixture = {
  agent: AiVaultAgent
  fileName: string
  seedLines: string[]
  appendLines: string[]
  truncatedLines: string[]
}

export function cursorFixture(): IncrementalAgentFixture {
  const line = (role: string, text: string, at: string) =>
    JSON.stringify({ role, message: { content: text }, timestamp: at })
  return {
    agent: 'cursor',
    fileName: 'agent-transcripts-aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jsonl',
    seedLines: [
      line('user', 'cursor seed question', '2026-05-01T10:00:00.000Z'),
      line('assistant', 'cursor seed answer', '2026-05-01T10:01:00.000Z')
    ],
    appendLines: [
      line('user', 'cursor follow-up', '2026-05-01T10:02:00.000Z'),
      line('assistant', 'cursor incremental answer', '2026-05-01T10:03:00.000Z')
    ],
    truncatedLines: [line('user', 'cursor rewritten', '2026-05-01T10:00:00.000Z')]
  }
}

export function copilotFixture(): IncrementalAgentFixture {
  const line = (type: string, data: Record<string, unknown>, at: string) =>
    JSON.stringify({ type, data, timestamp: at })
  return {
    agent: 'copilot',
    fileName: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jsonl',
    seedLines: [
      line(
        'session.start',
        { sessionId: 'copilot-session-1', startTime: '2026-05-01T10:00:00.000Z' },
        '2026-05-01T10:00:00.000Z'
      ),
      line('user.message', { content: 'copilot seed question' }, '2026-05-01T10:00:05.000Z'),
      line('assistant.message', { content: 'copilot seed answer' }, '2026-05-01T10:00:30.000Z')
    ],
    appendLines: [
      line('user.message', { content: 'copilot follow-up' }, '2026-05-01T10:05:00.000Z'),
      line(
        'assistant.message',
        { content: 'copilot incremental answer' },
        '2026-05-01T10:05:30.000Z'
      ),
      line(
        'session.shutdown',
        { currentModel: 'gpt-5.1', currentTokens: 340 },
        '2026-05-01T10:06:00.000Z'
      )
    ],
    truncatedLines: [
      line(
        'session.start',
        { sessionId: 'copilot-session-1', startTime: '2026-05-01T10:00:00.000Z' },
        '2026-05-01T10:00:00.000Z'
      )
    ]
  }
}

// OMP shares the graph format but writes model rather than modelId; session title is not authoritative.

export function geminiJsonlFixture(): IncrementalAgentFixture {
  return {
    agent: 'gemini',
    fileName: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jsonl',
    seedLines: [
      JSON.stringify({
        sessionId: 'gemini-session-1',
        startTime: '2026-05-01T10:00:00.000Z',
        type: 'user',
        content: 'gemini seed question',
        timestamp: '2026-05-01T10:00:00.000Z'
      }),
      JSON.stringify({
        type: 'gemini',
        content: 'gemini seed answer',
        model: 'gemini-3-pro',
        tokens: { input: 80, output: 30 },
        timestamp: '2026-05-01T10:00:30.000Z'
      })
    ],
    appendLines: [
      JSON.stringify({
        type: 'user',
        content: 'gemini follow-up',
        timestamp: '2026-05-01T10:01:00.000Z'
      }),
      JSON.stringify({ $set: { lastUpdated: '2026-05-01T10:01:05.000Z' } })
    ],
    truncatedLines: [
      JSON.stringify({
        sessionId: 'gemini-session-1',
        type: 'user',
        content: 'gemini rewritten',
        timestamp: '2026-05-01T10:00:00.000Z'
      })
    ]
  }
}

export function allIncrementalAgentFixtures(): IncrementalAgentFixture[] {
  return [
    codexFixture(),
    cursorFixture(),
    copilotFixture(),
    geminiJsonlFixture(),
    antigravityFixture()
  ]
}
