import { removeRetiredBrowserExtensionProfileStorage } from './profile-storage/browser-extension-retired-profile-storage'
import { setBrowserExtensionSupportEnabled } from './browser-extension-support'
import {
  setSavedBrowserTabsSource,
  type SavedBrowserTabsSource
} from './tabs-and-windows/browser-extension-discarded-tabs'

/** Deca ships no browser extension support: nothing is registered, loaded or fetched. */
export function initializeBrowserExtensionSupport(options: {
  /** The saved workspace session, which names browser pages not loaded yet (discarded tabs). */
  savedBrowserTabs?: SavedBrowserTabsSource
}): void {
  void removeRetiredBrowserExtensionProfileStorage().catch((error: unknown) => {
    console.warn('[browser-extensions] Could not remove retired profile storage:', error)
  })
  setSavedBrowserTabsSource(options.savedBrowserTabs ?? null)
  setBrowserExtensionSupportEnabled(false)
}
