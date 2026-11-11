import { join } from 'node:path'
import { PluginImageCache } from '../plugins/plugin-image-cache'
import { installPluginImageProtocolHandler } from '../plugins/plugin-image-protocol'
import { getPluginDesktopFrameServices } from '../plugins/panels/plugin-frame-desktop-services'
import { pluginHostVersion } from '../../shared/plugins/installation/plugin-host-version'
import { app, BrowserWindow } from 'electron'
import { performance } from 'node:perf_hooks'
import { PluginService } from '../plugins/plugin-service'
import { PluginMarketplaceService } from '../plugins/catalog/plugin-marketplace-service'
import { PluginMarketplaceInstaller } from '../plugins/catalog/plugin-marketplace-installer'
import { PluginBundledBootstrapCoordinator } from '../plugins/plugin-bundled-bootstrap-coordinator'
import { getPluginsDataDir } from '../plugins/plugin-discovery'
import { bundledPluginRootForApp } from '../plugins/plugin-bundled-bootstrap'
import { approveBundledPluginsFromStore } from '../plugins/plugin-bundled-approval'
import { resolvePluginHostEntryPath } from '../plugins/workers/plugin-host-process'
import { revokePluginConsent } from '../plugins/plugin-enablement'
import { clearRemovedPluginSettings } from '../plugins/plugin-removal-settings'
import { clearPluginFrameStorage } from '../plugins/panels/plugin-frame-guest-sessions'
import { bindPluginRpcServices } from './main-process-plugin-rpc'
import { bindPluginDesktopViews } from '../plugins/view/plugin-view-desktop-binding'
import {
  normalizePluginConsents,
  normalizePluginIdList
} from '../../shared/plugins/approval/plugin-consent-state'
import { projectPluginAgentStatusChangedPayload } from '../plugins/plugin-agent-status-event'
import { setMainPluginLanguagePacks, setMainUiLanguage } from '../i18n/main-i18n'
import { isUsablePluginLanguagePack } from '../../shared/plugins/languages/plugin-language-pack-coverage'
import { rebuildAppMenu } from '../menu/register-app-menu'
import { rebuildSystemTrayMenu } from '../tray/system-tray'
import { logStartupMilestone } from './startup-diagnostics'
import { agentHookServer } from '../agent-hooks/server/agent-hook-server'
import {
  bindPluginRuntime,
  createPluginAgentStatusForwarder,
  watchPluginWorkspaceContext
} from '../plugins/plugin-runtime-binding'
import { emitPluginWorktreeLifecycle } from './main-process-pty-startup'
import { mainProcessState as state } from './main-process-state'
import type { OrcaRuntimeService } from '../runtime/orca-runtime'
import { PluginStatusBarState } from '../plugins/status-bar/plugin-status-bar-state'
import { createDesktopPluginAppearance } from '../plugins/appearance/desktop-plugin-appearance'
import { bindPluginEditorTypography } from '../plugins/appearance/plugin-editor-typography'
import { ALL_RPC_METHODS } from '../runtime/rpc/methods/rpc-method-registry'

export async function initializeMainProcessPlugins(runtime: OrcaRuntimeService): Promise<void> {
  const store = state.store
  const keybindings = state.keybindings
  if (!store || !keybindings) {
    throw new Error('Store and keybindings must be initialized before plugins')
  }
  const pluginSystemStartupStartedAt = performance.now()
  const pluginImageCache = new PluginImageCache(
    join(getPluginsDataDir(app.getPath('userData')), 'image-cache')
  )
  state.pluginMarketplaceService = new PluginMarketplaceService({
    imageCache: pluginImageCache,
    pluginsDataDir: getPluginsDataDir(app.getPath('userData')),
    getKillListEntry: () => null,
    hostVersion: pluginHostVersion(app.getVersion())
  })
  state.pluginMarketplaceInstaller = new PluginMarketplaceInstaller({
    marketplace: state.pluginMarketplaceService,
    userDataPath: app.getPath('userData'),
    hostVersion: pluginHostVersion(app.getVersion()),
    blockedPluginReason: () => null,
    imageCache: pluginImageCache,
    revokeConsent: (pluginKey) =>
      revokePluginConsent({ store, pluginService: state.pluginService, pluginKey })
  })
  const bundledPluginRoot = bundledPluginRootForApp(app)
  state.pluginService = new PluginService({
    userDataPath: app.getPath('userData'),
    hostVersion: pluginHostVersion(app.getVersion()),
    // Feature flag: with the setting off, discovery returns nothing and no
    // plugin code path runs at all.
    isPluginSystemEnabled: () => state.store?.getSettings().pluginSystemEnabled === true,
    getDisabledPlugins: () => normalizePluginIdList(state.store?.getSettings().disabledPlugins),
    getPluginConsents: () => normalizePluginConsents(state.store?.getSettings().pluginConsents),
    getDevPluginPaths: () => normalizePluginIdList(state.store?.getSettings().devPluginPaths),
    getKeybindings: () => state.keybindings?.getOverrides() ?? {},
    getPluginKillListEntry: () => null,
    hostEntryPath: resolvePluginHostEntryPath(app.getAppPath(), app.isPackaged),
    getDesktopFrameServices: getPluginDesktopFrameServices,
    statusBar: new PluginStatusBarState(),
    appearance: createDesktopPluginAppearance(store, () => state.pluginService),
    editorTypography: bindPluginEditorTypography(store, () => state.pluginService),
    bundledPluginRoot
  })
  const pluginService = state.pluginService
  installPluginImageProtocolHandler({
    cache: pluginImageCache,
    findValidPlugin: (pluginKey) => state.pluginService?.findValidPlugin(pluginKey) ?? null,
    findApprovedPlugin: (pluginKey) =>
      state.pluginService?.findApprovedPlugin(pluginKey, true) ?? null
  })
  const bundledPluginBootstrap = new PluginBundledBootstrapCoordinator({
    root: bundledPluginRoot,
    userDataPath: app.getPath('userData'),
    hostVersion: pluginHostVersion(app.getVersion()),
    isEnabled: () => state.store?.getSettings().pluginSystemEnabled === true,
    blockedPluginReason: () => null,
    // Why: a retired bundled plugin must not leave consent, theme choices or frame storage behind.
    beforeRetire: (pluginKey) => clearRemovedPluginSettings(store, pluginKey),
    afterRetire: (pluginKey) => clearPluginFrameStorage(pluginKey),
    refreshPlugins: () => state.pluginService?.refresh() ?? Promise.resolve(),
    approveContentPlugins: (pluginKeys) =>
      approveBundledPluginsFromStore(store, pluginService, pluginKeys)
  })
  const requestBundledPluginBootstrap = (): void => {
    void bundledPluginBootstrap
      .request()
      .then((result) => {
        for (const failure of result?.errors ?? []) {
          console.warn(`[plugins] failed to publish bundled ${failure.pluginKey}:`, failure.error)
        }
      })
      .catch((error) => console.warn('[plugins] failed to bootstrap bundled plugins:', error))
  }
  store.onSettingsChanged((updates) => {
    if (updates.pluginSystemEnabled === true) {
      requestBundledPluginBootstrap()
    }
    if ('pluginSystemEnabled' in updates || 'devPluginPaths' in updates) {
      // Main owns lifecycle refresh even when a caller crashes before its follow-up refresh.
      void pluginService.refresh().catch((error) => {
        console.warn('[plugins] failed to apply plugin settings change:', error)
      })
    }
  })
  // Bound here, not in the IPC handlers: a headless serve never opens a window to register them.
  const pluginDelegate = bindPluginRuntime(pluginService, runtime, agentHookServer, ALL_RPC_METHODS)
  bindPluginRpcServices(store, pluginService, {
    marketplace: state.pluginMarketplaceService,
    installer: state.pluginMarketplaceInstaller
  })
  bindPluginDesktopViews(state.isServeMode, pluginService, () => state.mainWindow)
  // Initialization discovers manifests only; workers/panel reads wait for explicit triggers.
  void state.pluginService
    .initialize()
    .then(() => {
      logStartupMilestone('plugin-system-initialized', {
        durationMs: Number((performance.now() - pluginSystemStartupStartedAt).toFixed(2)),
        installedPlugins: state.pluginService?.getDiscovered().length ?? 0
      })
    })
    .catch((error) => console.warn('[plugins] failed to initialize plugin service:', error))
  state.pluginService.onChanged((event) => {
    if (
      event.contentPacksChanged &&
      setMainPluginLanguagePacks(
        (state.pluginService?.contentPacks.languagePacks.list() ?? []).filter(
          isUsablePluginLanguagePack
        )
      )
    ) {
      void setMainUiLanguage(store.getSettings().uiLanguage).then(() => {
        rebuildAppMenu()
        rebuildSystemTrayMenu()
      })
    }
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) {
        window.webContents.send('plugins:changed', event)
      }
    }
  })
  requestBundledPluginBootstrap()
  // Filter hook/worktree events server-side by each plugin subscription.
  const forwardAgentStatus = createPluginAgentStatusForwarder(pluginDelegate, pluginService)
  agentHookServer.subscribeEnrichedStatus((enriched) => {
    const payload = projectPluginAgentStatusChangedPayload(enriched)
    if (payload) {
      forwardAgentStatus(payload, enriched.terminalHandle)
    }
  })
  watchPluginWorkspaceContext({
    delegate: pluginDelegate,
    events: pluginService,
    onSessionWritten: (listener) => store.onWorkspaceSessionWritten(listener),
    onStateWritten: (listener) => store.onStateWritten(listener)
  })
  runtime.onWorktreeLifecycle(emitPluginWorktreeLifecycle)
}
