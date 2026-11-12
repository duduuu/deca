import type { SpeechModelManifest } from '../../shared/speech-types'
import {
  DICTATION_LANGUAGES,
  NEMOTRON_DICTATION_LANGUAGES,
  PARAKEET_V3_LANGUAGES,
  WHISPER_LANGUAGES
} from '../../shared/dictation-language'
import { getGgufSpeechModelDownload } from './speech-model-gguf-downloads'
import { getSpeechModelErrorRates } from './speech-model-error-rates'

export const SPEECH_MODEL_CATALOG: SpeechModelManifest[] = [
  {
    id: 'parakeet-tdt-0.6b-v3-int8',
    label: 'Parakeet TDT v3',
    type: 'transducer',
    provider: 'local',
    language: 'multilingual',
    ...getGgufSpeechModelDownload('parakeet-tdt-0.6b-v3-int8'),
    languages: PARAKEET_V3_LANGUAGES,
    ...getSpeechModelErrorRates('parakeet-tdt-0.6b-v3-int8'),
    licence: 'CC-BY-4.0',
    sampleRate: 16000,
    streaming: false,
    recommended: true
  },
  {
    id: 'parakeet-tdt-0.6b-v2-int8',
    label: 'Parakeet TDT v2',
    type: 'transducer',
    provider: 'local',
    language: 'en',
    ...getGgufSpeechModelDownload('parakeet-tdt-0.6b-v2-int8'),
    languages: ['en'],
    ...getSpeechModelErrorRates('parakeet-tdt-0.6b-v2-int8'),
    licence: 'CC-BY-4.0',
    sampleRate: 16000,
    streaming: false
  },
  {
    id: 'whisper-tiny',
    label: 'Whisper Tiny',
    type: 'whisper',
    provider: 'local',
    language: 'multilingual',
    ...getGgufSpeechModelDownload('whisper-tiny'),
    dictationLanguages: DICTATION_LANGUAGES,
    languages: WHISPER_LANGUAGES,
    ...getSpeechModelErrorRates('whisper-tiny'),
    licence: 'Apache-2.0',
    sampleRate: 16000,
    streaming: false
  },
  {
    id: 'whisper-large-v3-turbo',
    label: 'Whisper Large v3 Turbo',
    type: 'whisper',
    provider: 'local',
    language: 'multilingual',
    ...getGgufSpeechModelDownload('whisper-large-v3-turbo'),
    dictationLanguages: DICTATION_LANGUAGES,
    languages: [...WHISPER_LANGUAGES, 'yue'],
    ...getSpeechModelErrorRates('whisper-large-v3-turbo'),
    licence: 'MIT',
    suggestedFor: ['zh', 'ja', 'ko', 'yue'],
    sampleRate: 16000,
    streaming: false
  },
  {
    id: 'nemotron-3.5-asr-streaming-0.6b',
    label: 'Nemotron 3.5',
    type: 'transducer',
    provider: 'local',
    language: 'multilingual',
    ...getGgufSpeechModelDownload('nemotron-3.5-asr-streaming-0.6b'),
    dictationLanguages: NEMOTRON_DICTATION_LANGUAGES,
    languages: NEMOTRON_DICTATION_LANGUAGES,
    ...getSpeechModelErrorRates('nemotron-3.5-asr-streaming-0.6b'),
    licence: 'OpenMDW-1.1',
    sampleRate: 16000,
    // Decoded per chunk for now; live text arrives with the streaming engine path.
    streaming: false
  }
]

export function getCatalogModel(id: string): SpeechModelManifest | undefined {
  return SPEECH_MODEL_CATALOG.find((m) => m.id === id)
}

export function isLocalSpeechModel(manifest: SpeechModelManifest): boolean {
  return manifest.provider === 'local'
}

/** A saved model this build doesn't ship (earlier cloud or non-approved local ones) drops to no model. */
export function replaceRetiredSpeechModelId(id: string): string {
  if (!id) {
    return id
  }
  const model = getCatalogModel(id)
  return model ? (model.replacedBy ?? id) : ''
}
