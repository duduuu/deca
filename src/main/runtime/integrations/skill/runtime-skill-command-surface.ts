import '../../../../shared/git/admission/git-admission-state'
import '../../../crash-reporting/main-process-lifecycle-identity'
import { RuntimeSkillInstallQueries } from './runtime-skill-install-queries'
import type {
  RuntimeSkillCommandSurface,
  RuntimeSkillCommandHost
} from './runtime-skill-command-contract'

export class RuntimeSkillCommands
  extends RuntimeSkillInstallQueries
  implements RuntimeSkillCommandSurface
{
  constructor(host: RuntimeSkillCommandHost) {
    super(host)
  }
}
