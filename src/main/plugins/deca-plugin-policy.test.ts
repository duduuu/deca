import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setDecaPluginPolicyEnforced } from '../../shared/plugins/deca-plugin-policy'
import { discoverPlugins } from './plugin-discovery'

const roots: string[] = []

beforeEach(() => {
  setDecaPluginPolicyEnforced(true)
})

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

// Installed like the bundled Material icons: <plugins>/<publisher.id>/<hash>/ plus a current pointer.
async function discoverInstalled(manifest: Record<string, unknown>): Promise<string | null> {
  const pluginsDir = await mkdtemp(join(tmpdir(), 'deca-plugin-policy-'))
  roots.push(pluginsDir)
  const hash = 'd'.repeat(64)
  const versionDir = join(pluginsDir, 'local.fixture', hash)
  await mkdir(join(versionDir, 'icons'), { recursive: true })
  await writeFile(join(versionDir, 'icons', 'theme.json'), JSON.stringify({ iconDefinitions: {} }))
  await writeFile(join(versionDir, 'worker.js'), 'export default {}')
  await writeFile(
    join(versionDir, 'orca-plugin.json'),
    JSON.stringify({
      manifestVersion: 2,
      id: 'fixture',
      publisher: 'local',
      name: 'Policy fixture',
      version: '1.0.0',
      engines: { orca: '>=1.4.214' },
      capabilities: [],
      contributes: { iconThemes: [{ id: 'x', title: 'X', path: 'icons/theme.json' }] },
      ...manifest
    })
  )
  await writeFile(join(pluginsDir, 'local.fixture', 'current'), hash)
  const [plugin] = await discoverPlugins({ pluginsDir, devPluginPaths: [], hostVersion: '1.4.214' })
  return plugin && 'error' in plugin ? plugin.error : null
}

describe('Deca plugin policy at discovery', () => {
  it('loads a plugin that only contributes an icon theme', async () => {
    expect(await discoverInstalled({ execution: 'data' })).toBeNull()
  })

  it('refuses a plugin with a Node worker entry', async () => {
    expect(await discoverInstalled({ execution: 'trusted-worker', main: 'worker.js' })).toBe(
      'Deca only loads theme and icon theme plugins; this plugin declares main'
    )
  })
})
