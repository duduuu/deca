import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CollectedBundle } from '../observability/bundle'
import type * as NodeFs from 'node:fs'

const handlers = new Map<string, (_event: unknown, ...args: unknown[]) => unknown>()

const {
  handleMock,
  mkdirSyncMock,
  readFileSyncMock,
  writeFileSyncMock,
  openPathMock,
  collectDiagnosticBundleMock,
  getDiagnosticsStatusMock
} = vi.hoisted(() => ({
  handleMock: vi.fn(),
  mkdirSyncMock: vi.fn(),
  readFileSyncMock: vi.fn(),
  writeFileSyncMock: vi.fn(),
  openPathMock: vi.fn(),
  collectDiagnosticBundleMock: vi.fn(),
  getDiagnosticsStatusMock: vi.fn()
}))

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof NodeFs>('node:fs')
  return {
    ...actual,
    mkdirSync: mkdirSyncMock,
    readFileSync: readFileSyncMock,
    writeFileSync: writeFileSyncMock
  }
})

vi.mock('electron', () => ({
  app: { getPath: () => '/tmp', getVersion: () => '1.2.3-test' },
  ipcMain: { handle: handleMock },
  shell: { openPath: openPathMock }
}))

vi.mock('../observability', () => ({
  collectDiagnosticBundle: collectDiagnosticBundleMock,
  getDiagnosticsStatus: getDiagnosticsStatusMock
}))

import { registerDiagnosticsHandlers } from './diagnostics'

function captureHandlers(): void {
  handlers.clear()
  for (const call of handleMock.mock.calls) {
    const [channel, handler] = call as [
      string,
      typeof handlers extends Map<string, infer V> ? V : never
    ]
    handlers.set(channel, handler)
  }
}

function makeBundle(overrides: Partial<CollectedBundle> = {}): CollectedBundle {
  return {
    bundleSubmissionId: 'abcdefghijklmnopqrstuv',
    payload: '{"type":"bundle-header"}\n',
    bytes: 25,
    spanCount: 0,
    ...overrides
  }
}

describe('diagnostics IPC handlers', () => {
  beforeEach(() => {
    handleMock.mockReset()
    mkdirSyncMock.mockReset()
    readFileSyncMock.mockReset()
    writeFileSyncMock.mockReset()
    openPathMock.mockReset()
    openPathMock.mockResolvedValue('')
    collectDiagnosticBundleMock.mockReset()
    getDiagnosticsStatusMock.mockReset()
    getDiagnosticsStatusMock.mockReturnValue({
      localFileEnabled: true,
      bundleEnabled: true,
      traceFilePath: '/tmp/main.trace.ndjson',
      traceFamilySize: 0
    })
    collectDiagnosticBundleMock.mockReturnValue(makeBundle())
    readFileSyncMock.mockReturnValue(makeBundle().payload)
    registerDiagnosticsHandlers()
    captureHandlers()
  })

  it('expires retained bundle previews without another diagnostics call', async () => {
    vi.useFakeTimers()
    try {
      const bundle = makeBundle({ bundleSubmissionId: 'bundleabcdefghijklmnop' })
      collectDiagnosticBundleMock.mockReturnValue(bundle)
      const collect = handlers.get('diagnostics:collectBundle')!
      const open = handlers.get('diagnostics:openBundlePreview')!

      await collect({}, 30)
      await vi.advanceTimersByTimeAsync(15 * 60 * 1000 + 1)

      await expect(open({}, bundle.bundleSubmissionId)).rejects.toThrow(/expired/)
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not expose retained bundle payloads through collection IPC', async () => {
    const bundle = makeBundle({
      bundleSubmissionId: 'bundleabcdefghijklmnop',
      payload: '{"secret":"retained in main"}\n'
    })
    collectDiagnosticBundleMock.mockReturnValue(bundle)
    const collect = handlers.get('diagnostics:collectBundle')!

    const preview = await collect({}, 30)
    expect(JSON.stringify(preview)).not.toContain('retained in main')
  })
})
