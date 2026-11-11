import { app } from 'electron'
import { isOrcadSidecarLaunch } from '../window/foreground-activation-policy'
import { reserveServeStdoutForReadiness } from '../server/serve-stdout-boundary'

/** Deca serves no remote clients: only orcad's loopback browser sidecar and dev E2E hosts may serve. */
export function prepareLocalServeMode(isServeMode: boolean): void {
  if (!isServeMode) {
    return
  }
  if (!isOrcadSidecarLaunch() && (app.isPackaged || !process.env.ORCA_E2E_USER_DATA_DIR)) {
    process.stderr.write('Deca does not serve remote clients; `--serve` is unavailable.\n')
    app.exit(1)
    return
  }
  reserveServeStdoutForReadiness()
}
