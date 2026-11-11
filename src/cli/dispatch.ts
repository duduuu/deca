import type { RuntimeClient } from './runtime-client'
import { RuntimeClientError } from './runtime/types'
import { HANDLER_GROUPS, type HandlerGroup } from './handler-group-manifest'

export type HandlerContext = {
  flags: Map<string, string | boolean>
  client: RuntimeClient
  cwd: string
  json: boolean
  rawArgs?: string[]
}

export type CommandHandler = (ctx: HandlerContext) => Promise<void>

// Load only the selected handler group to avoid importing unrelated command dependencies.
function buildRoutes(groups: readonly HandlerGroup[]): Map<string, HandlerGroup> {
  const table = new Map<string, HandlerGroup>()
  for (const group of groups) {
    for (const key of group.keys) {
      const owner = table.get(key)
      if (owner) {
        throw new Error(
          `Duplicate CLI handler registration for "${key}" (${owner.name} and ${group.name})`
        )
      }
      table.set(key, group)
    }
  }
  return table
}

const ROUTES = buildRoutes(HANDLER_GROUPS)

export const HANDLER_COMMAND_KEYS: ReadonlySet<string> = new Set(ROUTES.keys())

// Deca serves no remote clients and pairs no servers; WSL hosts launch orcad without these commands.
const DECA_REFUSED_COMMANDS: ReadonlySet<string> = new Set([
  'serve',
  'serve service install',
  'serve service status',
  'serve service uninstall',
  'serve reset-identity',
  'serve restore resume',
  'pair',
  'environment add'
])

export async function dispatch(commandPath: string[], ctx: HandlerContext): Promise<void> {
  const key = commandPath.join(' ')
  if (DECA_REFUSED_COMMANDS.has(key)) {
    throw new RuntimeClientError(
      'invalid_argument',
      `\`${key}\` is not available in Deca: it serves no remote clients and pairs no servers.`
    )
  }
  const group = ROUTES.get(key)
  if (!group) {
    throw new RuntimeClientError('invalid_argument', `Unknown command: ${key}`)
  }
  const handler = (await group.load())[key]
  // Missing handlers indicate drift from the CI-verified manifest.
  if (!handler) {
    throw new RuntimeClientError(
      'invalid_argument',
      `CLI handler group "${group.name}" does not export "${key}"`
    )
  }
  await handler(ctx)
}

export { buildRoutes as buildHandlerRoutes }
