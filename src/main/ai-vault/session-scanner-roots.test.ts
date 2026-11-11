import { afterEach, describe, expect, it, vi } from 'vitest'
import { AI_VAULT_AGENT_SOURCES } from './session-scanner-agent-sources'

describe('claude session roots', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('keeps an explicit root as the only host root', () => {
    vi.stubEnv('CLAUDE_CONFIG_DIR', '/opt/claude-home')

    expect(
      AI_VAULT_AGENT_SOURCES.claude.rootDirs(
        { claudeProjectsDir: '/scan/projects', claudeProfileProjectsDirs: [] },
        []
      )
    ).toEqual(['/scan/projects'])
  })
})

describe('ompSessionsRootDirs', () => {})
