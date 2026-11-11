import { describe, expect, it } from 'vitest'
import { parseOrcaBrowserCommand } from './orca-browser-cli-commands'

describe('parseOrcaBrowserCommand', () => {
  it.each([
    'deca worktree ls',
    'deca terminal send --text "deca click"',
    'orcastra click',
    'orca',
    'echo deca click',
    'echo "docs; deca snapshot --page p1; text"',
    "git commit -m 'run deca click | deca snapshot'",
    'git log --oneline'
  ])('does not match %s', (command) => {
    expect(parseOrcaBrowserCommand(command)).toBeNull()
  })
})
