import type { PluginSources } from './plugin-sources'
export type { PluginSources } from './plugin-sources'
import { RelayClaudeAgentViewPlugin } from './claude-agent-view-plugin'
import { mirrorOpenCodeConfig } from './opencode-overlay-mirror'
import {
  writeOpenCodeStartupPromptPlugin,
  OPENCODE_STARTUP_PROMPT_PLUGIN_DIRECTORY
} from '../shared/opencode-startup-prompt-install'
import { resolveOpenCodeConfigDirectory } from '../shared/opencode-config-directory'
// Install remotely because host paths and Electron services are unavailable to the relay.
// Receive plugin source at session-ready: relay and desktop update independently, so bundled copies could stay stale.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync } from 'node:fs'
import { writeOverlayOpenCodePluginAtomically } from '../shared/opencode-plugin-atomic-write'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { safeRemoveOverlay } from '../main/pty/scrollback/overlay-mirror'
import {
  installOpenCodePluginInCanonicalConfig,
  isRelayOpenCodeOverlayPath,
  type OpenCodeAgent
} from './opencode-canonical-config'
import {
  openCodeTuiPluginDirName,
  writeOpenCodeTuiPlugin
} from '../shared/opencode-tui-plugin-install'
const RELAY_HOOKS_DIR = '.orca-relay'
const OPENCODE_OVERLAY_SUBDIR = 'opencode-overlays'
const OPENCODE2_OVERLAY_SUBDIR = 'opencode2-overlays'
const OPENCODE_PLUGIN_FILE = 'orca-opencode-status.js'
const OPENCODE2_PLUGIN_FILE = 'orca-opencode2-status.js'
// Orca's own entries (either major, file and TUI copy) are never mirrored from user config.
const ORCA_OPENCODE_PLUGIN_ENTRIES = new Set([
  OPENCODE_STARTUP_PROMPT_PLUGIN_DIRECTORY,
  ...[OPENCODE_PLUGIN_FILE, OPENCODE2_PLUGIN_FILE].flatMap((f) => [f, openCodeTuiPluginDirName(f)])
])
function safeDirName(input: string): string {
  // Hash pane keys into portable directory names because embedded tab ids can contain unsafe characters.
  return createHash('sha256').update(input).digest('hex').slice(0, 32)
}
function isUsableId(id: string): boolean {
  return typeof id === 'string' && id.length > 0 && id.length <= 1024
}
// Check the plugin file, not its directory: a failed rebuild can leave an unusable empty overlay.
export function getRelayOpenCodePluginPath(
  overlayDir: string,
  agent: 'opencode' | 'opencode2' = 'opencode'
): string {
  return join(
    overlayDir,
    'plugins',
    agent === 'opencode2' ? OPENCODE2_PLUGIN_FILE : OPENCODE_PLUGIN_FILE
  )
}
export class PluginOverlayManager {
  readonly claudeAgentView: RelayClaudeAgentViewPlugin
  private opencodeStartupPromptSource: string | null = null
  private opencodePluginSource: string | null = null
  private opencode2PluginSource: string | null = null
  private homeDir: string
  private opencodeRoot: string
  private opencode2Root: string
  constructor(opts?: { homeDir?: string }) {
    const home = opts?.homeDir ?? homedir()
    this.homeDir = home
    this.claudeAgentView = new RelayClaudeAgentViewPlugin(home)
    this.opencodeRoot = join(home, RELAY_HOOKS_DIR, OPENCODE_OVERLAY_SUBDIR)
    this.opencode2Root = join(home, RELAY_HOOKS_DIR, OPENCODE2_OVERLAY_SUBDIR)
  }
  // Refresh cached source for future PTYs; running agents retain the source they loaded at startup.
  setSources(sources: PluginSources): void {
    this.claudeAgentView.setSource(sources.claudeAgentViewSource)
    if (typeof sources.opencodeStartupPromptSource === 'string') {
      this.opencodeStartupPromptSource = sources.opencodeStartupPromptSource
    }
    if (typeof sources.opencodePluginSource === 'string') {
      this.opencodePluginSource = sources.opencodePluginSource
    }
    if (typeof sources.opencode2PluginSource === 'string') {
      this.opencode2PluginSource = sources.opencode2PluginSource
    }
  }
  hasOpenCodeSource(agent: 'opencode' | 'opencode2' = 'opencode'): boolean {
    return Boolean(agent === 'opencode2' ? this.opencode2PluginSource : this.opencodePluginSource)
  }
  private writeOpenCodePlugin(overlayDir: string, pluginFileName: string, source: string): void {
    const pluginsDir = join(overlayDir, 'plugins')
    mkdirSync(pluginsDir, { recursive: true })
    const pluginPath = join(pluginsDir, pluginFileName)
    writeOpenCodeTuiPlugin(pluginsDir, pluginFileName, source, 'overlay')
    writeOverlayOpenCodePluginAtomically(pluginPath, source)
  }

  // Materialize the pane’s overlay; missing source/write failure returns null so the CLI can run without status reporting.
  materializeOpenCode(
    id: string,
    existingConfigDir?: string,
    agent: 'opencode' | 'opencode2' = 'opencode'
  ): string | null {
    const source = agent === 'opencode2' ? this.opencode2PluginSource : this.opencodePluginSource
    if ((!source && !this.opencodeStartupPromptSource) || !isUsableId(id)) {
      return null
    }
    const pluginFileName = agent === 'opencode2' ? OPENCODE2_PLUGIN_FILE : OPENCODE_PLUGIN_FILE
    const root = agent === 'opencode2' ? this.opencode2Root : this.opencodeRoot
    const dir = join(root, safeDirName(id))
    try {
      safeRemoveOverlay(dir, root)
      mkdirSync(dir, { recursive: true })
      if (existingConfigDir) {
        if (!existsSync(existingConfigDir)) {
          return null
        }
        // Mirror the remote user config before adding Orca: replacing OpenCode’s single config root must not hide auth/models/keybinds/plugins.
        mirrorOpenCodeConfig(existingConfigDir, dir, ORCA_OPENCODE_PLUGIN_ENTRIES)
      }
      if (source) {
        this.writeOpenCodePlugin(dir, pluginFileName, source)
      }
      if (this.opencodeStartupPromptSource) {
        writeOpenCodeStartupPromptPlugin(dir, this.opencodeStartupPromptSource, 'overlay')
      }
      return dir
    } catch (err) {
      process.stderr.write(
        `[plugin-overlay] failed to materialize OpenCode overlay: ${err instanceof Error ? err.message : String(err)}\n`
      )
      return null
    }
  }

  installOpenCodeStartupPromptPlugin(
    environment: NodeJS.ProcessEnv | Record<string, string>,
    configDir?: string
  ): boolean {
    if (!this.opencodeStartupPromptSource) {
      return false
    }
    try {
      writeOpenCodeStartupPromptPlugin(
        configDir ??
          environment.OPENCODE_CONFIG_DIR ??
          resolveOpenCodeConfigDirectory(environment, this.homeDir),
        this.opencodeStartupPromptSource
      )
      return true
    } catch (error) {
      process.stderr.write(
        `[plugin-overlay] failed to install OpenCode startup prompt: ${error instanceof Error ? error.message : String(error)}\n`
      )
      return false
    }
  }

  hasOpenCode2Source(): boolean {
    return this.hasOpenCodeSource('opencode2')
  }

  /** Install into OpenCode's normal global config root without changing its environment. */
  installOpenCodePlugin(
    agent: OpenCodeAgent,
    environment: NodeJS.ProcessEnv | Record<string, string>
  ): boolean {
    const source = agent === 'opencode2' ? this.opencode2PluginSource : this.opencodePluginSource
    return source
      ? installOpenCodePluginInCanonicalConfig(source, agent, environment, this.homeDir)
      : false
  }

  isRelayOverlayPath(path: string): boolean {
    return isRelayOpenCodeOverlayPath(path, this.homeDir)
  }

  materializeOpenCode2(id: string, existingConfigDir?: string): string | null {
    return this.materializeOpenCode(id, existingConfigDir, 'opencode2')
  }

  clearOverlay(id: string): void {
    if (!isUsableId(id)) {
      return
    }
    const safe = safeDirName(id)
    for (const root of [this.opencodeRoot, this.opencode2Root]) {
      try {
        safeRemoveOverlay(join(root, safe), root)
      } catch (err) {
        process.stderr.write(
          `[plugin-overlay] failed to remove overlay dir ${join(root, safe)}: ${err instanceof Error ? err.message : String(err)}\n`
        )
      }
    }
  }
}
