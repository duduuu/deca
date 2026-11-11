import type { AiVaultSubagentListResult } from '../../shared/ai-vault/contracts/ai-vault-types'
import { listClaudeSubagentSessions } from './scanners/claude/session-scanner-claude-subagents'
import type { AiVaultServiceSubagentRequest } from './scan-service/session-scanner-service-protocol'

export function listLocalAiVaultSubagentSessions(
  request: AiVaultServiceSubagentRequest
): Promise<AiVaultSubagentListResult> {
  return listClaudeSubagentSessions({ parentFilePath: request.parentFilePath })
}
