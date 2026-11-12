// COMPAT(wsl-bridge): removed when WSL runs as an orcad host.
import { buildAgentFeatureSkillInstallCommand as buildPinnedSkillInstallCommand } from '../../../../../shared/agent-feature-install-commands'
import {
  ORCA_CLI_SKILL_NAME,
  ORCA_LINEAR_SKILL_NAME,
  ORCHESTRATION_SKILL_NAME
} from './agent-feature-skill-names'

/** Installs the copy this build ships through the bundled `deca skills install`. */
export function buildAgentFeatureSkillInstallCommand(skillNames: readonly string[]): string {
  return buildPinnedSkillInstallCommand(skillNames)
}

export const ORCHESTRATION_SKILL_INSTALL_COMMAND = buildAgentFeatureSkillInstallCommand([
  ORCHESTRATION_SKILL_NAME
])

export const ORCA_CLI_ORCHESTRATION_SKILL_INSTALL_COMMAND = buildAgentFeatureSkillInstallCommand([
  ORCA_CLI_SKILL_NAME,
  ORCHESTRATION_SKILL_NAME
])

export const ORCA_LINEAR_SKILL_INSTALL_COMMAND = buildAgentFeatureSkillInstallCommand([
  ORCA_LINEAR_SKILL_NAME
])
