import type { BrowserWindow } from 'electron'
import type { Store } from '../../persistence/loading-store/store'
import type { OrcaRuntimeService } from '../../runtime/orca-runtime'
import { SshConnectionStore } from '../../ssh/targets/ssh-connection-store'
import { setSshTargetRegistryStore } from '../../ssh/targets/ssh-target-registry'
import { initializeSshConnectionGenerationSession } from '../../ssh/connection/authority/ssh-connection-generation'
import { installManagedOrcadStartStatus } from '../runtime-environments/runtime-environment-managed-tunnel'
import { retainUnretainedOrcadMigrationSources } from '../../persistence/migrating-orcad-catalog/orcad-migration-source-retention'
import { reconcileManagedOrcadSshTargets } from '../../persistence/migrating-orcad-catalog/orcad-retained-source'
import { installOrcadMigrationScrollbackRetention } from '../../persistence/migrating-orcad-catalog/orcad-migration-scrollback-retention-wiring'
import { getAppEnvironment } from '../../../shared/app-environment'
import { setCurrentGetMainWindow, setCurrentRuntime, setPersistedStore } from './ssh-ipc-context'

/** Target registry, orcad migration retention and managed-orcad status that WSL hosts and the runtime read without SSH IPC. */
export function installSshTargetState(
  store: Store,
  getMainWindow: () => BrowserWindow | null,
  runtime?: OrcaRuntimeService
): void {
  initializeSshConnectionGenerationSession()
  setCurrentGetMainWindow(getMainWindow)
  setCurrentRuntime(runtime)
  setSshTargetRegistryStore(new SshConnectionStore(store))
  setPersistedStore(store)
  const userDataPath = getAppEnvironment().getPath('userData')
  reconcileManagedOrcadSshTargets(userDataPath, store)
  void retainUnretainedOrcadMigrationSources(userDataPath, store)
  installOrcadMigrationScrollbackRetention(userDataPath, store)
  installManagedOrcadStartStatus()
}
