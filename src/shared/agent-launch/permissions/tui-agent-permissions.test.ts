import { describe, expect, it } from 'vitest'
import {
  applyAgentPermissionMode,
  resolveAgentPermissionModeSummary,
  AUTO_TUI_AGENT_ARGS
} from './tui-agent-permissions'

describe('tui agent permissions', () => {
  it.each(['yolo', 'manual'] as const)(
    'applies auto to supporting agents while preserving the %s policy elsewhere',
    (mode) => {
      const previous = applyAgentPermissionMode({ mode })
      const automatic = applyAgentPermissionMode({ mode: 'auto', ...previous })

      expect(automatic.agentDefaultArgs).toMatchObject(AUTO_TUI_AGENT_ARGS)
      expect(automatic.agentDefaultArgs.gemini).toBe(previous.agentDefaultArgs.gemini)
      expect(automatic.agentDefaultEnv).toEqual(previous.agentDefaultEnv)
      expect(resolveAgentPermissionModeSummary(automatic)).toBe('auto')
      expect(applyAgentPermissionMode({ mode, ...automatic })).toEqual(previous)
    }
  )
})
