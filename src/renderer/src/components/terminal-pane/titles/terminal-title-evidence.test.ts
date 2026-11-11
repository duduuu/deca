import { describe, expect, it } from 'vitest'
import { resolvePaneTitleDecision } from './terminal-title-evidence'

describe('resolvePaneTitleDecision', () => {
  it.each([
    ['✦ Gemini CLI', '⠋ fix the gemini launcher', '⠋ fix the gemini launcher'],
    ['◇ Gemini CLI', '⠋ add ✦ icon to header', '⠋ add ✦ icon to header'],
    [
      '✋ Gemini CLI',
      '⠋ Codex: fix Gemini terminal behavior',
      '⠋ Codex: fix Gemini terminal behavior'
    ],
    ['✦ Gemini CLI', '✦ Analyze Codex', '✦ Gemini CLI'],
    ['⠋ Grok', '* | Grok', '* | Grok'],
    ['⠋ Grok', '⠋ Codex: fix parser - grok', '⠋ Codex: fix parser - grok'],
    ['⠋ Grok', '⠋ - Codex: fix parser - grok', '⠋ Grok'],
    // Normalized-only history cannot recover the original task; title-only reuse remains supported.
    ['✦ Gemini CLI', '✦ Gemini CLI', '✦ Gemini CLI']
  ])('corrects only disproved old stamps (%s, %s)', (normalizedTitle, rawTitle, displayTitle) => {
    const decision = resolvePaneTitleDecision({
      normalizedTitle,
      rawTitle,
      displayOwnerAgentType: 'claude',
      rendererOwnerAgentType: null,
      userGpuMode: 'auto'
    })
    expect(decision.displayTitle).toBe(displayTitle)
    expect(decision.rawTitle).toBe(rawTitle)
  })
})
