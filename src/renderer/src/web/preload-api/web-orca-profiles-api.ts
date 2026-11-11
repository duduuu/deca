import type { PreloadApi } from '../../../../preload/api-types'
import {
  DEFAULT_LOCAL_ORCA_PROFILE_ID,
  createDefaultLocalOrcaProfile
} from '../../../../shared/orca-profiles'

export function createWebOrcaProfilesApi(): Partial<PreloadApi> {
  const webOrcaProfileAuthStatus = () =>
    Promise.resolve({
      activeProfileId: DEFAULT_LOCAL_ORCA_PROFILE_ID,
      configured: false,
      state: 'unconfigured' as const,
      persistence: 'none' as const,
      setupMessage: 'Orca Cloud sign-in is not available in the browser fallback.'
    })
  return {
    orcaProfiles: {
      list: () =>
        Promise.resolve({
          activeProfileId: DEFAULT_LOCAL_ORCA_PROFILE_ID,
          profiles: [createDefaultLocalOrcaProfile(0)],
          multiProfileUi: false
        }),
      authStatus: webOrcaProfileAuthStatus,
      createLocal: () =>
        Promise.resolve({
          activeProfileId: DEFAULT_LOCAL_ORCA_PROFILE_ID,
          profiles: [createDefaultLocalOrcaProfile(0)],
          profile: createDefaultLocalOrcaProfile(0)
        }),
      switchProfile: () => Promise.resolve({ status: 'already-active' }),
      transferProject: (args) =>
        Promise.resolve({
          status: 'duplicate-target',
          sourceProfileId: args.sourceProfileId,
          targetProfileId: args.targetProfileId,
          sourceRepoId: args.repoId,
          duplicateRepoId: args.repoId
        }),
      findProjectProfiles: async () => ({ projects: [] })
    }
  }
}
