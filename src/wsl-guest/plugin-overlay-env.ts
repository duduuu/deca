import { readSessionShellStartupEnvVar } from '../main/pty/shell-startup/shell-startup-env'
function firstNonEmpty(...values: (string | undefined)[]): string | undefined {
  return values.find((value) => typeof value === 'string' && value.length > 0)
}

function readStartupEnv(
  name: string,
  env: Record<string, string>,
  shell: string | undefined
): string | undefined {
  // Why the session env first: it is closer to the user's shell than the relay
  // process env, and fish config lives under its XDG_CONFIG_HOME.
  return readSessionShellStartupEnvVar(name, env, shell)
}

export function resolveOpenCodeSourceConfigDir(
  env: Record<string, string>,
  shell: string | undefined
): string | undefined {
  return firstNonEmpty(
    env.ORCA_OPENCODE_SOURCE_CONFIG_DIR,
    readStartupEnv('OPENCODE_CONFIG_DIR', env, shell),
    env.OPENCODE_CONFIG_DIR
  )
}
