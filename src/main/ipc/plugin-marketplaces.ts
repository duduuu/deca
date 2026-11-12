import { ipcMain } from 'electron'
import type { PluginMarketplaceInstaller } from '../plugins/catalog/plugin-marketplace-installer'
import type { PluginMarketplaceService } from '../plugins/catalog/plugin-marketplace-service'
import type { PluginService } from '../plugins/plugin-service'
import type {
  PluginAutoUpdateState,
  PluginUpdateReviewNotice
} from '../../shared/plugins/catalog/plugin-update-policy'
import type { GlobalSettings } from '../../shared/global-settings-types'
import { pluginFileTypeSchema } from '../../shared/plugins/contributions/plugin-file-type'
import { findPluginFileTypeSuggestion } from '../plugins/catalog/plugin-file-type-suggestion'

const PLUGIN_MARKETPLACES_UNAVAILABLE_MESSAGE = 'Plugin marketplaces are not available in Deca.'

export type PluginMarketplaceHandlerServices = {
  marketplace: PluginMarketplaceService
  installer: PluginMarketplaceInstaller
}

/** The consent write path (applyPluginConsent), bound to the store by the caller. */
export type PluginApproveConsent = (pluginKey: string, reviewedFingerprint: string) => Promise<void>

export function registerPluginMarketplaceHandlers(
  pluginService: PluginService,
  services: PluginMarketplaceHandlerServices,
  getSettings: () => GlobalSettings,
  _approveConsent: PluginApproveConsent
): void {
  // Why cached only: this runs on every file open, which must never wait on a catalog fetch.
  ipcMain.handle(
    'plugins:suggestForFileType',
    async (_event, fileType: unknown, purpose: unknown) => {
      const parsed = pluginFileTypeSchema.safeParse(fileType)
      if (!parsed.success) {
        return null
      }
      return findPluginFileTypeSuggestion({
        fileType: parsed.data,
        purpose: purpose === 'editor' ? 'editor' : 'open',
        settings: getSettings(),
        listings: await services.marketplace.listCachedPlugins(),
        installed: pluginService.getDiscovered()
      })
    }
  )
  // Deca ships no plugin marketplaces: listings stay empty and nothing is fetched or installed.
  ipcMain.handle('plugins:listMarketplaces', () => [])
  ipcMain.handle('plugins:listMarketplacePlugins', () => [])
  ipcMain.handle('plugins:refreshMarketplaces', () => [])
  for (const channel of [
    'plugins:addMarketplace',
    'plugins:removeMarketplace',
    'plugins:previewMarketplacePlugin',
    'plugins:installMarketplacePlugin',
    'plugins:previewMarketplaceUpdate'
  ]) {
    ipcMain.handle(channel, () => {
      throw new Error(PLUGIN_MARKETPLACES_UNAVAILABLE_MESSAGE)
    })
  }
  // Auto-update, review notices and install counts are vendor-network features absent from this build.
  ipcMain.handle('plugins:getAutoUpdateState', (): PluginAutoUpdateState => ({
    updated: {},
    needsReview: {}
  }))
  ipcMain.handle('plugins:takeUpdateReviewNotices', (): Promise<PluginUpdateReviewNotice[]> =>
    Promise.resolve([])
  )
  ipcMain.handle('plugins:getInstallCounts', (): Promise<Record<string, number>> =>
    Promise.resolve({})
  )
  ipcMain.handle('plugins:getRollbackVersion', () => null)
  ipcMain.handle('plugins:rollbackMarketplacePlugin', () => {
    throw new Error(PLUGIN_MARKETPLACES_UNAVAILABLE_MESSAGE)
  })
}
