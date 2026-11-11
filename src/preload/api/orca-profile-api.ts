import type {
  CreateLocalOrcaProfileArgs,
  CreateLocalOrcaProfileResult,
  FindOrcaProfileProjectsByPathArgs,
  FindOrcaProfileProjectsByPathResult,
  OrcaProfileAuthStatus,
  OrcaProfileListResult,
  SwitchOrcaProfileArgs,
  SwitchOrcaProfileResult,
  TransferOrcaProfileProjectArgs,
  TransferOrcaProfileProjectResult
} from '../../shared/orca-profiles'

export type OrcaProfileApi = {
  list: () => Promise<OrcaProfileListResult>
  authStatus: () => Promise<OrcaProfileAuthStatus>
  createLocal: (args?: CreateLocalOrcaProfileArgs) => Promise<CreateLocalOrcaProfileResult>
  switchProfile: (args: SwitchOrcaProfileArgs) => Promise<SwitchOrcaProfileResult>
  transferProject: (
    args: TransferOrcaProfileProjectArgs
  ) => Promise<TransferOrcaProfileProjectResult>
  findProjectProfiles: (
    args: FindOrcaProfileProjectsByPathArgs
  ) => Promise<FindOrcaProfileProjectsByPathResult>
}
