import { RuntimeClientError } from './runtime/types'

/** Deca reaches only this computer and its WSL hosts; pairing codes and paired servers are refused. */
export async function refuseUnreachableRemoteRuntime(target: {
  pairingCode: string | null | undefined
  environment: string | null | undefined
}): Promise<void> {
  const pairingCode =
    target.pairingCode === undefined
      ? (process.env.ORCA_PAIRING_CODE ?? process.env.ORCA_REMOTE_PAIRING ?? null)
      : target.pairingCode
  const selector = target.environment?.trim()
  if (!pairingCode?.trim() && !selector) {
    return
  }
  // Loaded only for a remote selection so plain local commands keep their startup cost.
  const [{ getDefaultUserDataPath }, { listEnvironments }, catalog] = await Promise.all([
    import('./runtime-client.js'),
    import('../shared/remote-runtime/host-store/runtime-environment-store.js'),
    import('../shared/remote-runtime/host-catalog/runtime-environments.js')
  ])
  if (pairingCode?.trim()) {
    throw new RuntimeClientError('invalid_argument', catalog.REMOTE_SERVERS_UNAVAILABLE_MESSAGE)
  }
  const environment = listEnvironments(getDefaultUserDataPath()).find(
    (candidate) => candidate.id === selector || candidate.name === selector
  )
  if (environment && !catalog.isDecaReachableRuntimeEnvironment(environment)) {
    throw new RuntimeClientError('invalid_argument', catalog.REMOTE_SERVERS_UNAVAILABLE_MESSAGE)
  }
}
