import { describe, expect, it } from 'vitest'
import {
  parseApprovalFromStatus,
  resolveNativeChatInteractivePromptCard
} from './native-chat-interactive-prompt'
import type { NativeChatMessage } from '../native-chat-types'
describe('parseApprovalFromStatus', () => {
  it('returns null for non-approval envelopes', () => {
    expect(parseApprovalFromStatus(null)).toBeNull()
    expect(parseApprovalFromStatus('not json')).toBeNull()
    expect(parseApprovalFromStatus('{}')).toBeNull()
    expect(parseApprovalFromStatus(JSON.stringify({ approval: {} }))).toBeNull()
    expect(parseApprovalFromStatus(JSON.stringify({ approval: { tool: '' } }))).toBeNull()
  })
})

describe('resolveNativeChatInteractivePromptCard', () => {
  const pendingAsk: NativeChatMessage = {
    id: 'm1',
    role: 'assistant',
    blocks: [
      {
        type: 'tool-call',
        name: 'AskUserQuestion',
        input: { questions: [{ question: 'Which path?', options: ['fast', 'safe'] }] }
      }
    ],
    timestamp: 0,
    source: 'transcript'
  }

  it('lets a live approval win over a pending transcript ask', () => {
    const resolve = (interactivePrompt: string | null) =>
      resolveNativeChatInteractivePromptCard({
        interactivePrompt,
        messages: [pendingAsk],
        transcriptSettled: true
      })
    expect(resolve(JSON.stringify({ approval: { tool: 'Bash' } }))?.kind).toBe('approval')
    expect(resolve(null)?.kind).toBe('question')
  })

  it("keeps Codex's async question on the transcript's copy, which drops answered questions", () => {
    const card = resolveNativeChatInteractivePromptCard({
      interactivePrompt: JSON.stringify({
        questions: [{ title: 'Which database?', options: ['Postgres'] }, { title: 'Table name?' }]
      }),
      toolName: 'request_user_input_async',
      agent: 'codex',
      messages: [pendingAsk],
      transcriptSettled: true
    })
    expect(card?.kind === 'question' && card.prompt.questions[0]?.question).toBe('Which path?')
  })
})
