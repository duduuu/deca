import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { __resetShellStartupEnvCache } from '../main/pty/shell-startup/shell-startup-env'
import { resolveOpenCodeSourceConfigDir } from './plugin-overlay-env'

describe('plugin overlay env source resolution', () => {
  let homeDir: string

  beforeEach(() => {
    homeDir = mkdtempSync(join(tmpdir(), 'relay-plugin-overlay-env-'))
    __resetShellStartupEnvCache()
  })

  afterEach(() => {
    rmSync(homeDir, { recursive: true, force: true })
    __resetShellStartupEnvCache()
  })

  it.skipIf(process.platform === 'win32')(
    'discovers overlay sources from a custom zsh ZDOTDIR',
    () => {
      const zshDir = join(homeDir, '.config', 'zsh')
      mkdirSync(zshDir, { recursive: true })
      writeFileSync(join(homeDir, '.zshenv'), 'export ZDOTDIR="$HOME/.config/zsh"\n')
      writeFileSync(join(zshDir, '.zshrc'), 'export OPENCODE_CONFIG_DIR="$HOME/opencode-src"\n')

      expect(
        resolveOpenCodeSourceConfigDir(
          {
            HOME: homeDir,
            OPENCODE_CONFIG_DIR: '/tmp/inherited-opencode-overlay'
          },
          '/bin/zsh'
        )
      ).toBe(join(homeDir, 'opencode-src'))
    }
  )

  it('keeps explicit original-source env ahead of startup hints', () => {
    writeFileSync(join(homeDir, '.zshrc'), 'export OPENCODE_CONFIG_DIR="$HOME/company-opencode"\n')

    expect(
      resolveOpenCodeSourceConfigDir(
        {
          HOME: homeDir,
          ORCA_OPENCODE_SOURCE_CONFIG_DIR: '/remote/original-opencode',
          OPENCODE_CONFIG_DIR: '/tmp/inherited-opencode-overlay'
        },
        '/bin/zsh'
      )
    ).toBe('/remote/original-opencode')
  })

  // Fish exports XDG_CONFIG_HOME inside the session; use it so remote lookup agrees with main’s shell-aware lookup.
  it.skipIf(process.platform === 'win32')(
    'reads fish config under the session XDG_CONFIG_HOME',
    () => {
      const configHome = join(homeDir, 'xdg')
      mkdirSync(join(configHome, 'fish'), { recursive: true })
      writeFileSync(
        join(configHome, 'fish', 'config.fish'),
        'set -gx OPENCODE_CONFIG_DIR "$HOME/company-opencode"\n'
      )
      mkdirSync(join(homeDir, '.config', 'fish'), { recursive: true })
      writeFileSync(
        join(homeDir, '.config', 'fish', 'config.fish'),
        'set -gx OPENCODE_CONFIG_DIR /wrong-default-config-home\n'
      )

      expect(
        resolveOpenCodeSourceConfigDir(
          { HOME: homeDir, XDG_CONFIG_HOME: configHome },
          '/opt/homebrew/bin/fish'
        )
      ).toBe(join(homeDir, 'company-opencode'))
    }
  )
})
