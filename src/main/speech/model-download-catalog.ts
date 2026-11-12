import type { SpeechModelDownloadFile, SpeechModelManifest } from '../../shared/speech-types'

type DownloadFileSpec = readonly [name: string, sizeBytes: number, sha256: string]

function huggingFaceFiles(
  repository: string,
  revision: string,
  specs: DownloadFileSpec[]
): SpeechModelDownloadFile[] {
  return specs.map(([name, sizeBytes, sha256]) => ({
    name,
    url: `https://huggingface.co/${repository}/resolve/${revision}/${encodeURIComponent(name)}?download=true`,
    sizeBytes,
    sha256
  }))
}

/** What the model manager needs to download, verify and place one model's files. */
export type SpeechModelDownload = Pick<
  SpeechModelManifest,
  'id' | 'provider' | 'downloadFiles' | 'sizeBytes'
>

const SILERO_VAD_FILES = huggingFaceFiles(
  'handy-computer/silero-vad-v6.2-gguf',
  '97bbd75179f535e4708bccdf61e9278b8b60dfc7',
  [
    [
      'silero-vad-v6.2-F32.gguf',
      1_241_056,
      '0d871a800c420fdd5d1b17a3aea4296d1c39608f0ff4a9295eb76457eb1c88e6'
    ]
  ]
)

/** Silero VAD (MIT), which transcribe-cpp uses to find pauses; a helper download, never a dictation model. */
export const SILERO_VAD_MODEL = {
  id: 'silero-vad-v6.2',
  provider: 'local',
  downloadFiles: SILERO_VAD_FILES,
  sizeBytes: SILERO_VAD_FILES.reduce((total, { sizeBytes }) => total + sizeBytes, 0)
} satisfies SpeechModelDownload
