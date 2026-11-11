import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  utimesSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { PluginOverlayManager } from './plugin-overlay'

describe('PluginOverlayManager', () => {
  let homeDir: string
  let manager: PluginOverlayManager

  beforeEach(() => {
    homeDir = mkdtempSync(join(tmpdir(), 'plugin-overlay-'))
    manager = new PluginOverlayManager({ homeDir })
  })

  afterEach(() => {
    rmSync(homeDir, { recursive: true, force: true })
  })

  it('installs OpenCode plugins in the canonical XDG config roots', () => {
    manager.setSources({
      opencodePluginSource: 'v1 plugin',
      opencode2PluginSource: 'v2 plugin'
    })

    expect(
      manager.installOpenCodePlugin('opencode', { XDG_CONFIG_HOME: join(homeDir, 'xdg') })
    ).toBe(true)
    expect(
      manager.installOpenCodePlugin('opencode2', { XDG_CONFIG_HOME: join(homeDir, 'xdg') })
    ).toBe(true)
    expect(
      readFileSync(join(homeDir, 'xdg', 'opencode', 'plugins', 'orca-opencode-status.js'), 'utf8')
    ).toBe('v1 plugin')
    expect(
      readFileSync(join(homeDir, 'xdg', 'opencode', 'plugins', 'orca-opencode2-status.js'), 'utf8')
    ).toBe('v2 plugin')
    const tuiEntry = join(
      homeDir,
      'xdg',
      'opencode',
      'plugins',
      'orca-opencode2-status-tui',
      'tui.js'
    )
    expect(readFileSync(tuiEntry, 'utf8')).toBe('v2 plugin')
    expect(
      readFileSync(
        join(homeDir, 'xdg', 'opencode', 'plugins', 'orca-opencode-status-tui', 'tui.js'),
        'utf8'
      )
    ).toBe('v1 plugin')

    // Why: OpenCode 2 reloads plugins when a plugins/ entry is rewritten, so an unchanged
    // TUI copy must not be touched on the next launch.
    const past = new Date('2020-01-01T00:00:00Z')
    utimesSync(tuiEntry, past, past)
    manager.installOpenCodePlugin('opencode2', { XDG_CONFIG_HOME: join(homeDir, 'xdg') })
    expect(statSync(tuiEntry).mtimeMs).toBe(past.getTime())
  })

  // Why: OpenCode 2 reloads a plugin whose file mtime changed, even with unchanged bytes.
  it('leaves a current canonical plugin untouched and replaces a stale one', () => {
    const env = { XDG_CONFIG_HOME: join(homeDir, 'xdg') }
    const pluginPath = join(homeDir, 'xdg', 'opencode', 'plugins', 'orca-opencode2-status.js')
    manager.setSources({ opencode2PluginSource: 'v2 plugin' })
    manager.installOpenCodePlugin('opencode2', env)
    const past = new Date('2020-01-01T00:00:00Z')
    utimesSync(pluginPath, past, past)

    expect(manager.installOpenCodePlugin('opencode2', env)).toBe(true)
    expect(statSync(pluginPath).mtimeMs).toBe(past.getTime())

    manager.setSources({ opencode2PluginSource: 'v2 plugin, next release' })
    expect(manager.installOpenCodePlugin('opencode2', env)).toBe(true)
    expect(readFileSync(pluginPath, 'utf8')).toBe('v2 plugin, next release')
  })

  // Why: OpenCode 2 loads through a file-level symlink (dotfile managers) and stats its target.
  it.skipIf(process.platform === 'win32')(
    'leaves a symlinked canonical plugin with current bytes untouched',
    () => {
      const env = { XDG_CONFIG_HOME: join(homeDir, 'xdg') }
      const pluginsDir = join(homeDir, 'xdg', 'opencode', 'plugins')
      const pluginPath = join(pluginsDir, 'orca-opencode2-status.js')
      const targetPath = join(homeDir, 'dotfiles-orca-opencode2-status.js')
      mkdirSync(pluginsDir, { recursive: true })
      writeFileSync(targetPath, 'v2 plugin')
      symlinkSync(targetPath, pluginPath)
      const past = new Date('2020-01-01T00:00:00Z')
      utimesSync(targetPath, past, past)
      manager.setSources({ opencode2PluginSource: 'v2 plugin' })

      expect(manager.installOpenCodePlugin('opencode2', env)).toBe(true)
      expect(lstatSync(pluginPath).isSymbolicLink()).toBe(true)
      expect(statSync(targetPath).mtimeMs).toBe(past.getTime())

      manager.setSources({ opencode2PluginSource: 'v2 plugin, next release' })
      expect(manager.installOpenCodePlugin('opencode2', env)).toBe(true)
      expect(lstatSync(pluginPath).isSymbolicLink()).toBe(true)
      expect(readFileSync(pluginPath, 'utf8')).toBe('v2 plugin, next release')
      expect(readFileSync(targetPath, 'utf8')).toBe('v2 plugin, next release')
    }
  )

  // Why: a service that reloads between the two writes must already find the TUI copy and stand down.
  it('writes the TUI copy before the server plugin file', () => {
    manager.setSources({ opencode2PluginSource: 'v2 plugin' })
    const pluginsDir = join(homeDir, 'xdg', 'opencode', 'plugins')
    // A directory in the server file's place makes that write fail.
    mkdirSync(join(pluginsDir, 'orca-opencode2-status.js'), { recursive: true })

    expect(
      manager.installOpenCodePlugin('opencode2', { XDG_CONFIG_HOME: join(homeDir, 'xdg') })
    ).toBe(false)
    expect(readFileSync(join(pluginsDir, 'orca-opencode2-status-tui', 'tui.js'), 'utf8')).toBe(
      'v2 plugin'
    )
  })

  it('mirrors a preexisting remote OpenCode config dir before adding Deca plugin', () => {
    const userConfigDir = join(homeDir, 'company-opencode')
    mkdirSync(join(userConfigDir, 'plugins'), { recursive: true })
    writeFileSync(join(userConfigDir, 'opencode.json'), '{"provider":"custom"}')
    writeFileSync(join(userConfigDir, 'plugins', 'user-plugin.js'), 'user plugin')
    writeFileSync(join(userConfigDir, 'plugins', 'orca-opencode-status.js'), 'user same-name')

    manager.setSources({ opencodePluginSource: 'deca plugin' })
    const dir = manager.materializeOpenCode('tab-opencode:0', userConfigDir)

    expect(dir).not.toBeNull()
    expect(readFileSync(join(dir!, 'opencode.json'), 'utf8')).toBe('{"provider":"custom"}')
    expect(readFileSync(join(dir!, 'plugins', 'user-plugin.js'), 'utf8')).toBe('user plugin')
    expect(readFileSync(join(dir!, 'plugins', 'orca-opencode-status.js'), 'utf8')).toBe(
      'deca plugin'
    )
    expect(readFileSync(join(userConfigDir, 'plugins', 'orca-opencode-status.js'), 'utf8')).toBe(
      'user same-name'
    )
  })

  // Mirror only the selected OpenCode major’s Orca plugin; the other variant’s gate registers nothing.
  it.each([
    { agent: 'opencode', stale: 'orca-opencode2-status.js', own: 'orca-opencode-status.js' },
    { agent: 'opencode2', stale: 'orca-opencode-status.js', own: 'orca-opencode2-status.js' }
  ] as const)(
    "keeps the other major's stale plugin out of the $agent overlay",
    ({ agent, stale, own }) => {
      const userConfigDir = join(homeDir, '.config', 'opencode')
      mkdirSync(join(userConfigDir, 'plugins'), { recursive: true })
      writeFileSync(join(userConfigDir, 'plugins', stale), 'stale other-major plugin')
      const staleTui = stale.replace(/\.js$/, '-tui')
      mkdirSync(join(userConfigDir, 'plugins', staleTui))
      writeFileSync(join(userConfigDir, 'plugins', staleTui, 'tui.js'), 'stale other-major plugin')
      writeFileSync(join(userConfigDir, 'plugins', 'user-plugin.js'), 'user plugin')

      manager.setSources({ opencodePluginSource: 'v1', opencode2PluginSource: 'v2' })
      const dir = manager.materializeOpenCode('tab-1:0', userConfigDir, agent)

      expect(dir).not.toBeNull()
      const ownTui = own.replace(/\.js$/, '-tui')
      expect(readdirSync(join(dir!, 'plugins')).sort()).toEqual(
        [own, ownTui, 'user-plugin.js'].sort()
      )
      expect(readFileSync(join(dir!, 'plugins', ownTui, 'tui.js'), 'utf8')).toBe(
        agent === 'opencode2' ? 'v2' : 'v1'
      )
    }
  )

  it('does not override a missing preexisting OpenCode config dir', () => {
    manager.setSources({ opencodePluginSource: 'deca plugin' })

    expect(manager.materializeOpenCode('tab-missing:0', join(homeDir, 'missing'))).toBeNull()
  })

  // Use the launch-selected Pi/OMP home; disk-presence guessing can shadow user extensions when both exist.

  it('produces stable overlay dirs for a given id (idempotent re-materialization)', () => {
    manager.setSources({ opencodePluginSource: 'first' })
    const dirA = manager.materializeOpenCode('tab-stable:0')!
    manager.setSources({ opencodePluginSource: 'second' })
    const dirB = manager.materializeOpenCode('tab-stable:0')!
    expect(dirA).toBe(dirB)
    expect(readFileSync(join(dirA, 'plugins', 'orca-opencode-status.js'), 'utf8')).toBe('second')
  })

  it('hashes unsafe pane ids into portable overlay directory names', () => {
    manager.setSources({ opencodePluginSource: 'plugin' })
    const dir = manager.materializeOpenCode('tab/with\\unsafe:chars\n0')

    expect(dir).not.toBeNull()
    expect(basename(dir!)).toMatch(/^[a-f0-9]{32}$/)
    expect(dir).not.toContain('tab/with')
    expect(existsSync(join(dir!, 'plugins', 'orca-opencode-status.js'))).toBe(true)
  })
})
