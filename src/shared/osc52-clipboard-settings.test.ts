import { describe, expect, it } from 'vitest'
import { normalizeOsc52ClipboardDefaultOn } from './osc52-clipboard-settings'

describe('normalizeOsc52ClipboardDefaultOn', () => {
  it('keeps OSC 52 off for a profile that never chose', () => {
    expect(normalizeOsc52ClipboardDefaultOn({})).toEqual({
      terminalAllowOsc52Clipboard: false,
      terminalAllowOsc52ClipboardDefaultedOnForAllUsers: true
    })
  })

  it('keeps an explicit choice', () => {
    expect(
      normalizeOsc52ClipboardDefaultOn({ terminalAllowOsc52Clipboard: false })
        .terminalAllowOsc52Clipboard
    ).toBe(false)
    expect(
      normalizeOsc52ClipboardDefaultOn({ terminalAllowOsc52Clipboard: true })
        .terminalAllowOsc52Clipboard
    ).toBe(true)
  })
})
