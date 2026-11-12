import type { ProviderRateLimits } from '../../../../shared/rate-limit-types'

// Deca never reads Gemini CLI OAuth credentials, so Gemini quota stays unreported.
export async function fetchGeminiRateLimits(): Promise<ProviderRateLimits> {
  return {
    provider: 'gemini',
    session: null,
    weekly: null,
    updatedAt: Date.now(),
    error: null,
    status: 'unavailable'
  }
}
