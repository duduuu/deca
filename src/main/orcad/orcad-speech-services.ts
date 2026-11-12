import { ModelManager } from '../speech/model-manager'
import { openNodeSpeechDownloadRequest } from '../speech/node-speech-download-request'
import type { SpeechServiceFactories } from '../speech/speech-runtime-service'
import { SttService } from '../speech/stt-service'
import { createSttGpuPolicy } from '../speech/stt-gpu-failure-marker'
import { spawnSttWorkerWithCpuFallback } from '../speech/stt-worker-cpu-fallback'
import { spawnSttForkedProcess } from '../speech/stt-worker-forked-process'

// Local speech needs the installed app recognizer supplied by deca serve.
export const orcadSpeechServiceFactories: SpeechServiceFactories = {
  createModelManager: (customModelsDir) =>
    new ModelManager(customModelsDir, openNodeSpeechDownloadRequest),
  createSttService: (models, gpuEnabled) => {
    const gpu = createSttGpuPolicy(models.getModelsDir(), gpuEnabled)
    return new SttService(models, () => spawnSttWorkerWithCpuFallback(spawnSttForkedProcess, gpu))
  }
}
