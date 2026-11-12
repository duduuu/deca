import { describe, expect, it, vi } from 'vitest'

const {
  callMock,
  runtimeClientConstructorMock,
  serveOrcaAppMock,
  getDefaultUserDataPathMock,
  addEnvironmentFromPairingCodeMock,
  listEnvironmentsMock,
  spawnMock
} = vi.hoisted(() => ({
  callMock: vi.fn(),
  runtimeClientConstructorMock: vi.fn(),
  serveOrcaAppMock: vi.fn(),
  getDefaultUserDataPathMock: vi.fn(() => '/tmp/orca-user-data'),
  addEnvironmentFromPairingCodeMock: vi.fn(),
  listEnvironmentsMock: vi.fn(),
  spawnMock: vi.fn()
}))

vi.mock('./runtime-client', async () => {
  const { createRuntimeClientModuleMock } = await import('./index-test-harness.js')
  return createRuntimeClientModuleMock({
    callMock,
    runtimeClientConstructorMock,
    serveOrcaAppMock,
    getDefaultUserDataPathMock
  })
})

vi.mock('../shared/remote-runtime/host-store/runtime-environment-store', () => ({
  listEnvironments: listEnvironmentsMock
}))

vi.mock('child_process', async () => {
  const { createChildProcessModuleMock } = await import('./index-test-harness.js')
  return createChildProcessModuleMock(spawnMock)
})

import { main } from './index'
import { useWorktreeAwarenessEnvironment } from './index-test-harness'
import { buildWorktree, okFixture } from './test-fixtures'

const SAVED = [
  { id: 'srv-b', name: 'build-box' },
  { id: 'srv-c', name: 'gpu-box' }
].map((environment) => ({
  ...environment,
  createdAt: 1,
  updatedAt: 1,
  lastUsedAt: null,
  runtimeId: null,
  endpoints: [],
  preferredEndpointId: null
}))

const CROSS_MACHINE = 'worktree.lineage.crossMachine'

type Call = { environment: string; method: string; params: Record<string, unknown> }
type Answer = (call: Call) => unknown

/** Answers each request by the environment its client routes to; `local` is the caller's Orca. */
function serve(answer: Answer): Call[] {
  const calls: Call[] = []
  callMock.mockImplementation(async function (
    this: { environmentSelector: string | null },
    method: string,
    params: Record<string, unknown> = {}
  ) {
    const call = { environment: this.environmentSelector ?? 'local', method, params }
    calls.push(call)
    const result = answer(call)
    if (result instanceof Error) {
      throw result
    }
    if (result !== undefined) {
      return okFixture(method, result)
    }
    if (method === 'status.get') {
      return okFixture(method, { capabilities: [CROSS_MACHINE, 'worktree.set.folder-parent.v1'] })
    }
    if (method === 'worktree.create' || method === 'worktree.set') {
      return okFixture(method, { worktree: buildWorktree('/srv/child', 'child', 'abc', 'repo-1') })
    }
    if (method === 'worktree.lineageList') {
      return okFixture(method, { installationId: `install-${call.environment}` })
    }
    return okFixture(method, {})
  })
  return calls
}

async function run(args: string[], cwd = '/tmp/elsewhere') {
  const log = vi.spyOn(console, 'log').mockImplementation(() => {})
  const err = vi.spyOn(console, 'error').mockImplementation(() => {})
  const prior = process.exitCode
  await main([...args, '--json'], cwd)
  const exitCode = process.exitCode
  process.exitCode = prior
  const output = [...log.mock.calls, ...err.mock.calls].flat().join('\n')
  log.mockRestore()
  err.mockRestore()
  return { exitCode, output }
}

describe('--parent-environment', () => {
  useWorktreeAwarenessEnvironment({
    callMock,
    serveOrcaAppMock,
    getDefaultUserDataPathMock,
    addEnvironmentFromPairingCodeMock,
    listEnvironmentsMock,
    spawnMock
  })

  it('refuses a caller-relative parent in another environment before any request', async () => {
    listEnvironmentsMock.mockReturnValue(SAVED)
    const calls = serve(() => undefined)
    const { output } = await run([
      'worktree',
      'create',
      '--repo',
      'id:repo-1',
      '--name',
      'child',
      '--parent-environment',
      'srv-b',
      '--parent-worktree',
      'current'
    ])
    expect(JSON.parse(output).error.code).toBe('invalid_argument')
    expect(calls).toEqual([])
  })

  it('refuses --parent-environment without a parent or with --no-parent', async () => {
    listEnvironmentsMock.mockReturnValue(SAVED)
    const calls = serve(() => undefined)
    for (const parentFlags of [['--no-parent'], []]) {
      const { output } = await run([
        'worktree',
        'set',
        '--worktree',
        'id:repo-1::/srv/child',
        '--parent-environment',
        'srv-b',
        ...parentFlags
      ])
      expect(JSON.parse(output).error.code).toBe('invalid_argument')
    }
    expect(calls).toEqual([])
  })
})
