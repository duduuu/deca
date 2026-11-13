import type { GrokAccountStatus } from '../../shared/rate-limit-types'

// Why: Deca never reads Grok CLI credentials.
export function getGrokAccountStatus(): GrokAccountStatus {
  return { signedIn: false, email: null, teamId: null, tokenFresh: false, error: null }
}
