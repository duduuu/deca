import { getAppEnvironment, hasAppEnvironment } from './app-environment'

export function getOrcaCliCommandNameForPlatform(platform: NodeJS.Platform): string {
  if (platform === 'linux') {
    return 'deca-ide'
  }
  if (platform === 'win32') {
    return 'deca.cmd'
  }
  return 'deca'
}

/** The GNOME-conflict `deca-ide` rename is desktop-only: SSH relays and headless Orca servers put plain `deca` on PATH. */
export function skipsLinuxOrcaCliRename(isRemote: boolean | undefined): boolean {
  if (isRemote) {
    return true
  }
  // Only a headless server publishes its own launcher; Windows ones (WSL launches) keep the rename.
  const launcher = hasAppEnvironment() ? getAppEnvironment().getCliLauncherPath?.() : null
  return launcher?.endsWith('/deca') ?? false
}
