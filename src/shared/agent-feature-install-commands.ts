export type AgentFeatureSkillCommandOptions = {
  global?: boolean
  /** The CLI on the terminal's PATH; WSL terminals use `deca-ide`. */
  cliCommand?: string
}

// Deca installs the skills its own build ships, offline; nothing is fetched from a repository.
export function buildAgentFeatureSkillInstallArgs(
  skillNames: readonly string[],
  options: AgentFeatureSkillCommandOptions = {}
): string[] {
  if (skillNames.length === 0) {
    throw new Error('At least one skill name is required.')
  }
  const global = options.global ?? true
  const skillArgs = skillNames.flatMap((name) => ['--skill', name])
  return ['skills', 'install', ...skillArgs, ...(global ? [] : ['--local'])]
}

export function buildAgentFeatureSkillInstallCommand(
  skillNames: readonly string[],
  options: AgentFeatureSkillCommandOptions = {}
): string {
  const cli = options.cliCommand ?? 'deca'
  return `${cli} ${buildAgentFeatureSkillInstallArgs(skillNames, options).join(' ')}`
}
