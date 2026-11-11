import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getPreferredSystemLanguages, isReady } = vi.hoisted(() => ({
  getPreferredSystemLanguages: vi.fn(),
  isReady: vi.fn()
}))
vi.mock('electron', () => ({ app: { getPreferredSystemLanguages, isReady } }))

beforeEach(() => {
  vi.resetModules()
  isReady.mockReturnValue(true)
  getPreferredSystemLanguages.mockReturnValue(['ko-KR', 'en-US'])
})

describe('native language snapshot', () => {
  it('reads preferences once after app readiness and shares the ordered result', async () => {
    const { getSystemLanguageDetection } = await import('./system-language')
    isReady.mockReturnValue(false)
    getPreferredSystemLanguages.mockReturnValueOnce(['en-GB'])
    // Pre-ready reads serve startup-failure dialogs without pinning the post-ready snapshot.
    expect(getSystemLanguageDetection()?.locale).toBe('en')
    isReady.mockReturnValue(true)
    expect(getSystemLanguageDetection()).toMatchObject({
      detectedTag: 'ko-KR',
      locale: 'ko',
      source: 'native'
    })
    getPreferredSystemLanguages.mockReturnValue(['en-US'])
    expect(getSystemLanguageDetection()?.locale).toBe('ko')
    expect(getPreferredSystemLanguages).toHaveBeenCalledTimes(2)
  })
})
