import { parseClaudeModelList } from '../../../claude-model-list-probe'
import { labelFromModelId } from '../../../model-id-label'
import type { CommitMessageModel, ThinkingLevel } from './commit-message-agent-spec'

export const OPENAI_THINKING_LEVELS: ThinkingLevel[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'xhigh', label: 'Extra High' }
]

export const CLAUDE_THINKING_LEVELS: ThinkingLevel[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'xhigh', label: 'Extra High' },
  { id: 'max', label: 'Max' }
]

function uniqueModels(models: CommitMessageModel[]): CommitMessageModel[] {
  const seen = new Set<string>()
  return models.filter((model) => {
    if (!model.id || seen.has(model.id)) {
      return false
    }
    seen.add(model.id)
    return true
  })
}

function* iterateModelOutputLines(output: string): Generator<string> {
  let lineStart = 0

  for (let index = 0; index < output.length; index++) {
    const code = output.charCodeAt(index)
    if (code !== 10 && code !== 13) {
      continue
    }

    yield output.slice(lineStart, index)
    if (code === 13 && output.charCodeAt(index + 1) === 10) {
      index++
    }
    lineStart = index + 1
  }

  if (lineStart <= output.length) {
    yield output.slice(lineStart)
  }
}

export function withOpenAiThinking(
  id: string
): Pick<CommitMessageModel, 'thinkingLevels' | 'defaultThinkingLevel'> {
  return /(?:gpt-5|codex)/i.test(id)
    ? { thinkingLevels: OPENAI_THINKING_LEVELS, defaultThinkingLevel: 'low' }
    : {}
}

export function parseClaudeModels(stdout: string): CommitMessageModel[] {
  return uniqueModels(
    parseClaudeModelList(stdout).map((model) => {
      const thinkingLevels = CLAUDE_THINKING_LEVELS.filter((level) =>
        model.effortLevels.includes(level.id)
      )
      return {
        id: model.id,
        label: model.label,
        ...(model.description ? { description: model.description } : {}),
        ...(thinkingLevels.length > 0
          ? {
              thinkingLevels,
              defaultThinkingLevel: thinkingLevels.some((level) => level.id === 'low')
                ? 'low'
                : thinkingLevels[0].id
            }
          : {}),
        ...(model.supportsFastMode ? { supportsFastMode: true } : {}),
        ...(model.supportsAutoMode !== undefined
          ? { supportsAutoMode: model.supportsAutoMode }
          : {}),
        ...(model.resolvedModel ? { resolvedModel: model.resolvedModel } : {})
      }
    })
  )
}

export function parseLineModels(stdout: string): CommitMessageModel[] {
  const models: CommitMessageModel[] = []
  for (const rawLine of iterateModelOutputLines(stdout)) {
    const id = rawLine.trim()
    if (id.length === 0 || id.includes(' ')) {
      continue
    }
    models.push({
      id,
      label: labelFromModelId(id),
      ...withOpenAiThinking(id)
    })
  }
  return uniqueModels(models)
}

export function parseCursorModels(stdout: string): CommitMessageModel[] {
  const models: CommitMessageModel[] = []
  for (const rawLine of iterateModelOutputLines(stdout)) {
    // Rows read `id - Name`, or a bare `id` when the model has no name, optionally ending in
    // `(current)`, `(default)` or `(current, default)`.
    const match =
      /^(\S+)(?:\s+-\s+(.+?))?(?:\s+\(((?:current|default)(?:,\s*(?:current|default))?)\))?$/i.exec(
        rawLine.trim()
      )
    if (!match || (!match[2] && !/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/i.test(match[1]))) {
      continue
    }
    models.push({
      id: match[1],
      label: match[2] ?? match[1],
      ...(/default/i.test(match[3] ?? '') ? { isDefault: true } : {}),
      ...withOpenAiThinking(match[1])
    })
  }
  return uniqueModels(models)
}

export function parseAntigravityModels(stdout: string): CommitMessageModel[] {
  const models: CommitMessageModel[] = []
  for (const rawLine of iterateModelOutputLines(stdout)) {
    const line = rawLine.trim()
    const separator = line.indexOf('\t')
    const id = (separator === -1 ? line : line.slice(0, separator)).trim()
    const label = separator === -1 ? id : line.slice(separator + 1).trim()
    // Older agy versions list display names; current versions emit id<TAB>label.
    if (
      !id ||
      !label ||
      (separator === -1 && !/^.+ \((?:low|medium|high|thinking)\)$/i.test(id)) ||
      (separator !== -1 && (/\s/.test(id) || /^(?:id|model)$/i.test(id)))
    ) {
      continue
    }
    models.push({
      id,
      label
    })
  }
  return uniqueModels(models)
}
