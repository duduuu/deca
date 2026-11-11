import type { Store } from '../persistence/loading-store/store'
import type { OrcaRuntimeService } from '../runtime/orca-runtime'
import { installSshTargetState } from '../ipc/ssh/ssh-target-state-installation'
import { registerDisabledSshIpcHandlers } from '../ipc/ssh/ssh-disabled-ipc-handlers'
import { mainProcessState as state } from './main-process-state'

/** Headless serve installs the same target state the window does; Deca registers no SSH IPC. */
export function registerHeadlessServeSshHandlers(store: Store, runtime: OrcaRuntimeService): void {
  installSshTargetState(store, () => state.mainWindow ?? null, runtime)
  registerDisabledSshIpcHandlers()
}
