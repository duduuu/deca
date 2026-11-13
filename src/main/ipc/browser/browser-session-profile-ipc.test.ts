// @orca-isolated-worker: browser registration retains grant listeners bound to this file's mocks.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { handleMock, removeHandlerMock, createProfileMock, setBrowserIdentityModeMock } = vi.hoisted(
  () => ({
    handleMock: vi.fn(),
    removeHandlerMock: vi.fn(),
    createProfileMock: vi.fn(),
    setBrowserIdentityModeMock: vi.fn(async () => ({ ok: true }))
  })
)

vi.mock('../../browser/identity/mode/browser-identity-mode-store', () => ({
  setBrowserIdentityMode: setBrowserIdentityModeMock,
  getBrowserIdentityModeStatus: vi.fn(() => ({ identity: {}, migrationNotice: null }))
}))

vi.mock('electron', () => ({
  BrowserWindow: { fromWebContents: vi.fn() },
  ipcMain: { handle: handleMock, removeHandler: removeHandlerMock },
  webContents: { fromId: vi.fn() }
}))

vi.mock('../../browser/guest-lifecycle/manager/browser-manager', () => ({
  browserCertificateTrustController: { proceed: vi.fn() },
  browserManager: {
    getWebContentsIdByTabId: vi.fn(() => new Map())
  }
}))

vi.mock('../../browser/sessions/profiles/browser-session-registry', () => ({
  browserSessionRegistry: {
    createProfile: createProfileMock
  }
}))

import { registerBrowserHandlers } from './browser'
import { setTrustedBrowserRendererWebContentsId } from './browser-renderer-trust'

describe('browser session profile IPC', () => {
  beforeEach(() => {
    handleMock.mockReset()
    removeHandlerMock.mockReset()
    createProfileMock.mockReset()
    setBrowserIdentityModeMock.mockReset()
    setBrowserIdentityModeMock.mockResolvedValue({ ok: true })
    setTrustedBrowserRendererWebContentsId(91)
  })

  function trustedSender(): Electron.WebContents {
    return {
      id: 91,
      isDestroyed: () => false,
      getType: () => 'window',
      getURL: () => 'file:///renderer/index.html'
    } as Electron.WebContents
  }

  function identitySetHandler(): (
    event: { sender: Electron.WebContents },
    mode: unknown
  ) => Promise<unknown> {
    registerBrowserHandlers({ getSettings: vi.fn(() => ({})), onSettingsChanged: vi.fn() })
    return handleMock.mock.calls.find(([channel]) => channel === 'browser:identity:set')?.[1]
  }

  // Unknown modes must reject consistently with RPC instead of silently selecting clean.
  it('refuses an unrecognized identity mode instead of silently selecting Cleaned', async () => {
    setTrustedBrowserRendererWebContentsId(91)
    const handler = identitySetHandler()

    await expect(handler({ sender: trustedSender() }, 'rotating')).rejects.toThrow(/rotating/)
    expect(setBrowserIdentityModeMock).not.toHaveBeenCalled()
  })
})
