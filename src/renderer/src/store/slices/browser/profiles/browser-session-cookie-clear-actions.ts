import type { BrowserSlice, BrowserSliceGet } from '../browser-slice-contract'
import type { BrowserProfileClearDefaultCookiesResult } from '../../../../../../shared/browser/runtime/runtime-browser-contracts'
import { callRuntimeRpc } from '@/runtime/rpc/calls/runtime-rpc-call'
import {
  getBrowserSettingsHostId,
  getBrowserSettingsRuntimeEnvironmentId
} from '../hosts/browser-host-state'

export function createBrowserSessionCookieClearActions(
  get: BrowserSliceGet
): Pick<BrowserSlice, 'clearDefaultSessionCookies'> {
  return {
    clearDefaultSessionCookies: async () => {
      const hostId = getBrowserSettingsHostId(get())
      const runtimeEnvironmentId = getBrowserSettingsRuntimeEnvironmentId(get())
      if (runtimeEnvironmentId) {
        try {
          const result = await callRuntimeRpc<BrowserProfileClearDefaultCookiesResult>(
            { kind: 'environment', environmentId: runtimeEnvironmentId },
            'browser.profileClearDefaultCookies',
            undefined,
            { timeoutMs: 15_000 }
          )
          if (result.cleared && getBrowserSettingsHostId(get()) === hostId) {
            await get().fetchBrowserSessionProfiles()
          }
          return result.cleared
        } catch {
          return false
        }
      }
      try {
        const ok = await window.api.browser.sessionClearDefaultCookies()
        if (ok && getBrowserSettingsHostId(get()) === hostId) {
          await get().fetchBrowserSessionProfiles()
        }
        return ok
      } catch {
        return false
      }
    }
  }
}
