// Deca builds have no release identity or upload endpoint; bundles are always stamped as dev.
export function resolveDiagnosticOrcaChannel(): 'stable' | 'rc' | 'dev' {
  return 'dev'
}
