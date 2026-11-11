import type {
  PreflightStatus,
  PreloadApi,
  RefreshAgentsResult
} from '../../../../preload/api-types'
import type {
  ComputerUsePermissionSetupResult,
  ComputerUsePermissionStatusResult
} from '../../../../shared/computer-use-permissions-types'
import type { SkillDiscoveryResult } from '../../../../shared/skills'
import type { SkillDeletePlan, SkillDeleteResult } from '../../../../shared/skill-delete-contract'
import { SKILL_DELETE_CAPABILITY } from '../../../../shared/skill-install-capability'
import { callRuntimeResult, getRemoteRuntimeStatus } from './web-runtime-calls'
import { requireActiveEnvironmentOrNull } from './web-runtime-session'
import { getBrowserPlatform } from './web-storage'

export function createPreflightApi(): NonNullable<Partial<PreloadApi>['preflight']> {
  const fallbackStatus: PreflightStatus = {
    git: { installed: false },
    gh: { installed: false, authenticated: false },
    glab: { installed: false, authenticated: false },
    bitbucket: { configured: false, authenticated: false, account: null },
    azureDevOps: {
      configured: false,
      authenticated: false,
      account: null,
      baseUrl: null,
      tokenConfigured: false
    },
    gitea: {
      configured: false,
      authenticated: false,
      account: null,
      baseUrl: null,
      tokenConfigured: false
    }
  }
  const fallbackRefreshAgents: RefreshAgentsResult = {
    agents: [],
    addedPathSegments: [],
    shellHydrationOk: false,
    pathSource: 'sync_seed_only',
    pathFailureReason: 'spawn_error'
  }
  type WindowsTerminalCapabilityBridgeResult = {
    wslAvailable: boolean
    wslDistros: string[]
    pwshAvailable: boolean
    gitBashAvailable: boolean
    hostPlatform: NodeJS.Platform | null
  }
  const fallbackWindowsTerminalCapabilities = {
    wslAvailable: false,
    wslDistros: [],
    pwshAvailable: false,
    gitBashAvailable: false,
    hostPlatform: null
  }
  return {
    check: async (args) => {
      if (!requireActiveEnvironmentOrNull()) {
        return fallbackStatus
      }
      return callRuntimeResult<PreflightStatus>('preflight.check', args)
    },
    detectAgents: async () => {
      if (!requireActiveEnvironmentOrNull()) {
        return []
      }
      return callRuntimeResult<string[]>('preflight.detectAgents').catch(() => [])
    },
    refreshAgents: () =>
      requireActiveEnvironmentOrNull()
        ? callRuntimeResult('preflight.refreshAgents')
            .then((result) => result as RefreshAgentsResult)
            .catch(() => fallbackRefreshAgents)
        : Promise.resolve(fallbackRefreshAgents),
    detectRemoteAgents: async (args) =>
      requireActiveEnvironmentOrNull()
        ? callRuntimeResult<string[]>('preflight.detectRemoteAgents', args).catch(() => [])
        : [],
    detectRemoteWindowsTerminalCapabilities: async (args) =>
      requireActiveEnvironmentOrNull()
        ? callRuntimeResult<WindowsTerminalCapabilityBridgeResult>(
            'preflight.detectRemoteWindowsTerminalCapabilities',
            args
          ).catch(() => fallbackWindowsTerminalCapabilities)
        : Promise.resolve(fallbackWindowsTerminalCapabilities)
  }
}

export function createDeveloperPermissionsApi(): NonNullable<
  Partial<PreloadApi>['developerPermissions']
> {
  return {
    getStatus: () => Promise.resolve([]),
    request: ({ id }) =>
      Promise.resolve({ id, status: 'unsupported', openedSystemSettings: false } as const),
    openSettings: () => Promise.resolve(),
    testLocalNetworkConnection: ({ host, port }) =>
      Promise.resolve({
        ok: false,
        host,
        port,
        testedAt: Date.now(),
        failure: 'unsupported'
      } as const)
  }
}

export function createComputerUsePermissionsApi(): NonNullable<
  Partial<PreloadApi>['computerUsePermissions']
> {
  return {
    getStatus: () =>
      callRuntimeResult<ComputerUsePermissionStatusResult>(
        'computer.permissionsStatus',
        {},
        15_000
      ),
    openSetup: (args) =>
      callRuntimeResult<ComputerUsePermissionSetupResult>(
        'computer.permissions',
        args ?? {},
        15_000
      ).catch((error: unknown) => {
        // Only a host without this method falls back; real failures (e.g. a cancelled Open) must surface.
        if (!(error instanceof Error && 'code' in error && error.code === 'method_not_found')) {
          throw error
        }
        return {
          platform: getBrowserPlatform(),
          helperAppPath: null,
          openedSettings: false,
          launchedHelper: false,
          nextStep: 'Computer-use permissions are managed on the Orca server.'
        }
      }),
    reset: () =>
      Promise.resolve({
        platform: getBrowserPlatform(),
        helperAppPath: null,
        helperUnavailableReason: 'web_client',
        bundleId: null,
        permissions: []
      })
  }
}

export function createSkillsApi(): NonNullable<Partial<PreloadApi>['skills']> {
  return {
    discover: (target) =>
      callRuntimeResult<SkillDiscoveryResult>('skills.discover', target, 15_000),
    // Why: browser clients have no local skill homes; remote hosts plan their own (not here).
    bundledPlan: () => Promise.reject(new Error('Updating Orca skills requires the desktop app.')),
    bundledExecute: () =>
      Promise.reject(new Error('Updating Orca skills requires the desktop app.')),
    bundledAutoUpdate: () =>
      Promise.reject(new Error('Updating Orca skills requires the desktop app.')),
    previewInstall: () => Promise.reject(new Error('Skill installation requires the desktop app.')),
    previewBundleInstall: () =>
      Promise.reject(new Error('Skill installation requires the desktop app.')),
    removeInstall: () => Promise.reject(new Error('Skill installation requires the desktop app.')),
    // Disable deletion when the paired host predates the capability.
    deleteSupported: async () => {
      const status = await getRemoteRuntimeStatus().catch(() => null)
      return status?.capabilities?.includes(SKILL_DELETE_CAPABILITY) === true
    },
    previewDelete: (request) =>
      callRuntimeResult<SkillDeletePlan>('skills.previewDelete', request, 60_000),
    delete: (request) => callRuntimeResult<SkillDeleteResult>('skills.delete', request, 5 * 60_000),
    listManagedInstalls: () =>
      Promise.reject(new Error('Skill installation requires the desktop app.')),
    listWslDistros: () => Promise.resolve([])
  }
}
