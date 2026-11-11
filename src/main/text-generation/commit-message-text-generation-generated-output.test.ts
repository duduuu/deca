import 'node:child_process'

import { describe, expect, it } from 'vitest'
import { generateCommitMessageFromContext } from './commit-message-text-generation'
import '../../shared/source-control/ai/generation/commit-message-agent-output'
import './source-control-agent-failure'

describe('generateCommitMessageFromContext', () => {
  it('drops prefilled reasoning from a custom command but not from a built-in agent', async () => {
    const stdout =
      "We need the message only.\r\nLet's final.</think>Fix typo in README.md\r\n\r\n- Correct spelling\r\n"
    const generate = (params: { agentId: 'custom' | 'claude'; model: string }) =>
      generateCommitMessageFromContext(
        { branch: 'main', stagedSummary: 'M\tREADME.md', stagedPatch: '+hello' },
        { ...params, customAgentCommand: 'llama-completion' },
        {
          kind: 'remote',
          cwd: '/repo',
          missingBinaryLocation: 'remote PATH',
          execute: async () => ({ stdout, stderr: '', exitCode: 0, timedOut: false })
        }
      )

    await expect(generate({ agentId: 'custom', model: '' })).resolves.toEqual({
      success: true,
      message: 'Fix typo in README.md\n\n- Correct spelling',
      agentLabel: 'llama-completion'
    })
    await expect(generate({ agentId: 'claude', model: 'sonnet' })).resolves.toMatchObject({
      success: true,
      message: expect.stringContaining("Let's final.</think>Fix typo in README.md")
    })
  })
})
