import { translate } from '@/i18n/i18n'
import {
  AGENT_OUTPUT_FAILURE_COPY as EN,
  type AgentOutputFailureCode
} from '../../../../shared/agent-output-failure-copy'

type CopyValues = Record<string, string | number>

// Merged into the text-generation copy table; textGenerationErrorText checks the slot values.
export const AGENT_OUTPUT_ERROR_COPY: Record<
  AgentOutputFailureCode,
  (values: CopyValues) => string
> = {
  openCodeInvalidEvents: (values) =>
    translate(
      'sourceControl.textGeneration.errors.openCodeInvalidEvents',
      EN.openCodeInvalidEvents,
      values
    ),
  antigravityInvalidEvents: (values) =>
    translate(
      'sourceControl.textGeneration.errors.antigravityInvalidEvents',
      EN.antigravityInvalidEvents,
      values
    ),
  antigravityInvalidResult: (values) =>
    translate(
      'sourceControl.textGeneration.errors.antigravityInvalidResult',
      EN.antigravityInvalidResult,
      values
    ),
  antigravityNoFinalResult: (values) =>
    translate(
      'sourceControl.textGeneration.errors.antigravityNoFinalResult',
      EN.antigravityNoFinalResult,
      values
    )
}
