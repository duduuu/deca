import type { ProviderRateLimits } from '../../../shared/rate-limit-types'
// A null slot means loading to readers; a disabled meter must settle instead.
export function disabledUsageSnapshot(
  provider: ProviderRateLimits['provider'],
  now: number = Date.now()
): ProviderRateLimits {
  return {
    provider,
    session: null,
    weekly: null,
    updatedAt: now,
    error: null,
    status: 'idle'
  }
}

// Why: Deca never reads Cursor/Grok/OpenCode credentials or browser cookies, so their meters stay hidden.
export function unreportedUsageSnapshot(
  provider: ProviderRateLimits['provider'],
  now: number = Date.now()
): ProviderRateLimits {
  return { ...disabledUsageSnapshot(provider, now), status: 'unavailable' }
}
