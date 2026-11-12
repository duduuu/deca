import type { SpeechModelManifest, SpeechModelState } from './speech-types'

/** A model whose files on disk are an older format. Phones treat every voice_model_not_ready: code as setup. */
export const SPEECH_MODEL_NEEDS_UPDATE_ERROR = 'voice_model_not_ready:needs-update'

export function speechModelNotReadyError(state: SpeechModelState): string {
  return state.needsUpdate
    ? SPEECH_MODEL_NEEDS_UPDATE_ERROR
    : `voice_model_not_ready:${state.status}`
}

export function isOfferedSpeechModel(manifest: SpeechModelManifest): boolean {
  return manifest.replacedBy === undefined
}
