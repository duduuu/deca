import { afterEach, describe, expect, it, vi } from 'vitest'
import { RuntimeClient } from '../runtime-client'
import type { HandlerContext } from '../dispatch'
import { SKILL_SHARING_HANDLERS } from './skill-sharing'

const successMeta = { runtimeId: 'runtime-1' }

function context(
  call: RuntimeClient['call'],
  flags = new Map<string, string | boolean>(),
  options: { isRemote?: boolean; json?: boolean } = {}
): HandlerContext {
  const client = new RuntimeClient('/tmp/orca-skill-sharing-test', 60_000, null, null)
  vi.spyOn(client, 'call').mockImplementation(call)
  vi.spyOn(client, 'isRemote', 'get').mockReturnValue(options.isRemote ?? false)
  return {
    client,
    cwd: '/repo',
    flags,
    json: options.json ?? false
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('skill sharing CLI handlers', () => {
  it('lists safe installed-skill selectors without local paths', async () => {
    const call = vi.fn().mockResolvedValue({
      id: 'request-1',
      ok: true,
      result: {
        skills: [
          {
            id: 'skill-id',
            name: 'alpha',
            description: 'Alpha skill',
            providers: ['codex'],
            sourceKind: 'home',
            sourceLabel: 'Codex',
            rootPath: '/secret/root',
            directoryPath: '/secret/root/alpha',
            skillFilePath: '/secret/root/alpha/SKILL.md',
            installed: true,
            updatedAt: null
          }
        ],
        sources: [],
        scannedAt: 1
      },
      _meta: successMeta
    })
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    await SKILL_SHARING_HANDLERS['skills installed']!(context(call, new Map(), { json: true }))

    expect(call).toHaveBeenCalledWith('skills.discover', { cwd: '/repo' })
    const output = String(log.mock.calls[0][0])
    expect(output).toContain('skill-id')
    expect(output).not.toContain('/secret/root')
  })
})
