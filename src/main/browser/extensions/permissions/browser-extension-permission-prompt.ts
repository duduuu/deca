import type { BrowserExtensionPermissionSet } from './browser-extension-permission-grants'

/** Deca has no extension prompt UI, so permissions.request always declines. */
export async function askToGrantBrowserExtensionPermissions(
  _browserProfileId: string,
  _extension: Electron.Extension,
  _add: BrowserExtensionPermissionSet,
  _signal?: AbortSignal
): Promise<boolean> {
  return false
}
