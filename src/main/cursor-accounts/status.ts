import type { CursorAccountStatus } from '../../shared/rate-limit-types'

// Why: Deca never reads Cursor's Keychain token or desktop state DB.
export async function getCursorAccountStatus(): Promise<CursorAccountStatus> {
  return {
    signedIn: false,
    email: null,
    displayName: null,
    credentialSource: null,
    planType: null,
    tokenFresh: false,
    error: null
  }
}
