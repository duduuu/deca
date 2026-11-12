import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { workspaceMayOverrideDefaultModel } from './agent-project-model-override'

let root: string

function write(path: string, content = ''): void {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, content)
}

function mayOverride(
  agent: string,
  workspacePath: string,
  accountHomePath: string | null = '/homes/a'
) {
  return workspaceMayOverrideDefaultModel({ agent, workspacePath, accountHomePath })
}

describe('workspaceMayOverrideDefaultModel', () => {
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'orca-project-model-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('reads OpenCode config above the repository root too, as OpenCode 2.x does', async () => {
    const repo = join(root, 'oc-above', 'repo')
    write(join(repo, '.git', 'HEAD'), 'ref: refs/heads/main\n')
    write(join(root, 'oc-above', 'opencode.json'), '{"model":"x/y"}')
    expect(await mayOverride('opencode', repo, null)).toBe(true)
  })

  // Windows permission bits cannot make this fixture unreadable.
})
