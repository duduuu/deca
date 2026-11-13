import { EventEmitter } from 'node:events'
import { vi, type Mock } from 'vitest'
import type { ProviderRateLimits } from '../../../shared/rate-limit-types'
import type { RateLimitService } from './rate-limit-service'
import { fetchCodexRateLimits } from '../providers/codex/codex-fetcher'
import { fetchGeminiRateLimits } from '../providers/gemini/gemini-usage-fetcher'
import { fetchAntigravityRateLimits } from '../providers/antigravity/antigravity-usage-fetcher'
export type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
}

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

export function okProvider(
  provider: ProviderRateLimits['provider'],
  usedPercent: number,
  updatedAt = Date.now()
): ProviderRateLimits {
  return {
    provider,
    session: {
      usedPercent,
      windowMinutes: 300,
      resetsAt: null,
      resetDescription: null
    },
    weekly: null,
    updatedAt,
    error: null,
    status: 'ok'
  }
}

export function errorProvider(
  provider: ProviderRateLimits['provider'],
  message: string
): ProviderRateLimits {
  return {
    provider,
    session: null,
    weekly: null,
    updatedAt: Date.now(),
    error: message,
    status: 'error'
  }
}

export function unavailableProvider(
  provider: ProviderRateLimits['provider'],
  message = 'Not configured'
): ProviderRateLimits {
  return {
    provider,
    session: null,
    weekly: null,
    updatedAt: Date.now(),
    error: message,
    status: 'unavailable'
  }
}

// Mint timestamps at fetch time: suite-start snapshots become stale under fake timers and turn retry tests into full fetches.
export function mockFreshBackgroundProviderFetches(): void {
  vi.mocked(fetchCodexRateLimits).mockImplementation(async () => okProvider('codex', 24))
  vi.mocked(fetchGeminiRateLimits).mockImplementation(async () => okProvider('gemini', 0))
  vi.mocked(fetchAntigravityRateLimits).mockImplementation(async () =>
    unavailableProvider('antigravity')
  )
}

export function resetRateLimitProviderMocks(): void {
  vi.clearAllMocks()
  vi.mocked(fetchGeminiRateLimits).mockResolvedValue(okProvider('gemini', 0, Date.now()))
  vi.mocked(fetchAntigravityRateLimits).mockResolvedValue(unavailableProvider('antigravity'))
}

type RateLimitWindow = Parameters<RateLimitService['attach']>[0]

export type FakeWindowWebContents = {
  send: Mock<(channel: string, ...args: unknown[]) => void>
}

export class FakeRateLimitWindow extends EventEmitter {
  focused = true
  minimized = false
  visible = true

  webContents: FakeWindowWebContents = {
    send: vi.fn()
  }

  isDestroyed(): boolean {
    return false
  }

  isVisible(): boolean {
    return this.visible
  }

  isMinimized(): boolean {
    return this.minimized
  }

  isFocused(): boolean {
    return this.focused
  }
}

export function asRateLimitWindow(window: FakeRateLimitWindow): RateLimitWindow {
  return window as unknown as RateLimitWindow
}

export async function flushMicrotasks(times = 4): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve()
  }
}
