import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RuntimeEnvironmentCallRequest } from '../../../../runtime/rpc/testing/runtime-compatibility-test-fixture'
import {
  createBrowserMockApi,
  createTestStore,
  resetBrowserRuntimeMocks
} from '../browser-slice-test-harness'

const createWebRuntimeSessionBrowserTabMock = vi.hoisted(() => vi.fn())
const runtimeEnvironmentCall = vi.fn()
const runtimeEnvironmentTransportCall = vi.fn()

vi.mock('@/runtime/browser/creation/web-runtime-browser-creation', () => ({
  createWebRuntimeSessionBrowserTab: createWebRuntimeSessionBrowserTabMock
}))

const mockApi = createBrowserMockApi(runtimeEnvironmentTransportCall)

// @ts-expect-error test window mock
globalThis.window = { api: mockApi }

describe('createBrowserSlice runtime guard', () => {
  beforeEach(() => {
    resetBrowserRuntimeMocks({
      runtimeEnvironmentCall,
      runtimeEnvironmentTransportCall,
      createWebRuntimeSessionBrowserTabMock
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not let a slower server response overwrite the newly selected host', async () => {
    let resolveWindowsProfiles: ((value: unknown) => void) | undefined
    runtimeEnvironmentCall.mockImplementation((request: RuntimeEnvironmentCallRequest) => {
      const { selector, method } = request as RuntimeEnvironmentCallRequest & {
        selector: string
      }
      if (method !== 'browser.profileList') {
        return Promise.resolve({
          id: `${selector}-${method}`,
          ok: true,
          result: { browsers: [] },
          _meta: { runtimeId: `runtime-${selector}` }
        })
      }
      if (selector === 'windows-2') {
        return new Promise((resolve) => {
          resolveWindowsProfiles = resolve
        })
      }
      return Promise.resolve({
        id: 'linux-profiles',
        ok: true,
        result: {
          profiles: [
            {
              id: 'linux-default',
              scope: 'default',
              partition: 'persist:linux',
              label: 'Linux Default',
              source: null
            }
          ]
        },
        _meta: { runtimeId: 'runtime-linux' }
      })
    })
    const store = createTestStore()

    void store.getState().setBrowserSessionHostId('runtime:windows-2')
    void store.getState().setBrowserSessionHostId('runtime:linux-3')
    await vi.waitFor(() =>
      expect(store.getState().browserSessionProfiles[0]?.id).toBe('linux-default')
    )
    resolveWindowsProfiles?.({
      id: 'windows-profiles',
      ok: true,
      result: {
        profiles: [
          {
            id: 'windows-default',
            scope: 'default',
            partition: 'persist:windows',
            label: 'Windows Default',
            source: null
          }
        ]
      },
      _meta: { runtimeId: 'runtime-windows' }
    })
    await vi.waitFor(() =>
      expect(store.getState().browserSessionProfilesByHostId['runtime:windows-2']?.[0]?.id).toBe(
        'windows-default'
      )
    )

    expect(store.getState().browserSessionHostIdOverride).toBe('runtime:linux-3')
    expect(store.getState().browserSessionProfiles[0]?.id).toBe('linux-default')
    expect(store.getState().settings?.activeRuntimeEnvironmentId).toBeNull()
  })
})
