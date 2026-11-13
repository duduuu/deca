import {
  PLUGIN_CONTRIBUTION_POINTS,
  type PluginContributionPoint
} from './contributions/plugin-contribution-points'

/** Why: Deca loads look-only plugins; anything that runs code or adds behavior is refused. */
export const DECA_ALLOWED_PLUGIN_CONTRIBUTIONS: readonly PluginContributionPoint[] = [
  'themes',
  'terminalThemes',
  'iconThemes'
]

type PolicySubject = {
  main?: string
  capabilities: readonly unknown[]
  contributes: Partial<Record<PluginContributionPoint, readonly unknown[]>>
}

let enforced = true

/** Why: upstream plugin-machinery tests load code-plugin fixtures; only the unit setup calls this. */
export function setDecaPluginPolicyEnforced(next: boolean): void {
  enforced = next
}

/** Null when the manifest only carries themes or icon themes. */
export function decaPluginPolicyError(manifest: PolicySubject): string | null {
  if (!enforced) {
    return null
  }
  const blocked: string[] = []
  if (manifest.main !== undefined) {
    blocked.push('main')
  }
  if (manifest.capabilities.length > 0) {
    blocked.push('capabilities')
  }
  for (const point of PLUGIN_CONTRIBUTION_POINTS) {
    if (
      !DECA_ALLOWED_PLUGIN_CONTRIBUTIONS.includes(point) &&
      (manifest.contributes[point]?.length ?? 0) > 0
    ) {
      blocked.push(`contributes.${point}`)
    }
  }
  return blocked.length === 0
    ? null
    : `Deca only loads theme and icon theme plugins; this plugin declares ${blocked.join(', ')}`
}
