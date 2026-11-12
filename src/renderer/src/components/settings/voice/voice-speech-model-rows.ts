import type { SpeechModelManifest, SpeechModelState } from '../../../../../shared/speech-types'
import { isOfferedSpeechModel } from '../../../../../shared/speech-model-retirement'
import {
  speechModelQuality,
  type SpeechModelQuality
} from '../../../../../shared/speech-model-quality'

export type VoiceSpeechModelRowData = {
  manifest: SpeechModelManifest
  state: SpeechModelState | undefined
  /** null for a retired model, which is only listed so its files can be deleted. */
  quality: SpeechModelQuality | null
}

/** True while a model's files are being fetched or unpacked. */
export function isSpeechModelDownloading(state: SpeechModelState | undefined): boolean {
  return state?.status === 'downloading' || state?.status === 'extracting'
}

/** Rows: models for the language first, then ones that can't handle it, then retired downloads. */
export function voiceSpeechModelRows(
  catalog: readonly SpeechModelManifest[],
  modelStates: readonly SpeechModelState[],
  language: string
): VoiceSpeechModelRowData[] {
  const supported: VoiceSpeechModelRowData[] = []
  const unsupported: VoiceSpeechModelRowData[] = []
  const retired: VoiceSpeechModelRowData[] = []
  for (const manifest of catalog) {
    const state = modelStates.find((s) => s.id === manifest.id)
    if (!isOfferedSpeechModel(manifest)) {
      // Retired models stay listed only while their files are on disk.
      if (state?.status === 'ready' || state?.needsUpdate) {
        retired.push({ manifest, state, quality: null })
      }
      continue
    }
    const quality = speechModelQuality(manifest, language)
    ;(quality.kind === 'unsupported' ? unsupported : supported).push({ manifest, state, quality })
  }
  return [...supported, ...unsupported, ...retired]
}
