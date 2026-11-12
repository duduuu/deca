import { useState } from 'react'
import { toast } from 'sonner'
import type {
  SpeechModelManifest,
  SpeechModelState,
  VoiceSettings
} from '../../../../../shared/speech-types'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { SettingsGroup } from '../section-layout/SettingsGroup'
import { voiceSpeechModelRows } from './voice-speech-model-rows'
import {
  SPEECH_MODEL_GRID_COLUMNS,
  SPEECH_MODEL_WIDE_ONLY,
  VoiceSpeechModelRow
} from './VoiceSpeechModelRow'
import { VoiceDictationLanguageSetting } from './VoiceDictationLanguageSetting'
import { cancelSpeechModelDownload, startSpeechModelDownload } from './speech-model-download'

type VoiceSpeechModelSectionProps = {
  voiceSettings: VoiceSettings
  catalog: SpeechModelManifest[]
  modelStates: SpeechModelState[]
  /** The language quality is rated for. */
  ratingLanguage: string
  /** The model to set up, tagged Recommended, while dictation has no usable model. */
  setUpModelId: string | undefined
  setUpPending: boolean
  onSetUp: () => void
  onUpdateVoiceSettings: (updates: Partial<VoiceSettings>) => void
  onRefreshModelStates: () => void
}

export function VoiceSpeechModelSection({
  voiceSettings,
  catalog,
  modelStates,
  ratingLanguage,
  setUpModelId,
  setUpPending,
  onSetUp,
  onUpdateVoiceSettings,
  onRefreshModelStates
}: VoiceSpeechModelSectionProps): React.JSX.Element {
  const t = useTranslate()
  const selectedModel = catalog.find((m) => m.id === voiceSettings.sttModel)
  const [pendingDeleteModelIds, setPendingDeleteModelIds] = useState<ReadonlySet<string>>(
    () => new Set()
  )
  const rows = voiceSpeechModelRows(catalog, modelStates, ratingLanguage)

  const setDeletePending = (modelId: string, pending: boolean): void =>
    setPendingDeleteModelIds((prev) => {
      const next = new Set(prev)
      if (pending) {
        next.add(modelId)
      } else {
        next.delete(modelId)
      }
      return next
    })

  const deleteModel = (modelId: string): void => {
    if (pendingDeleteModelIds.has(modelId)) {
      return
    }
    setDeletePending(modelId, true)
    void window.api.speech
      .deleteModel(modelId)
      .then(onRefreshModelStates)
      .catch(() =>
        toast.error(t('auto.components.settings.VoicePane.68de13f72c', 'Failed to delete model.'))
      )
      .finally(() => setDeletePending(modelId, false))
  }

  const title = t('auto.components.settings.VoicePane.c5ea32143e', 'Speech model')
  return (
    <SettingsGroup title={title} bodyClassName="px-0">
      <div className="@container">
        <div role="list" aria-label={title} className={SPEECH_MODEL_GRID_COLUMNS}>
          <div
            aria-hidden="true"
            data-settings-row=""
            className="col-span-full grid grid-cols-subgrid gap-x-3 px-5 py-2 text-xs text-muted-foreground"
          >
            <span>{t('components.settings.voice.models.columnModel', 'Model')}</span>
            <span className={SPEECH_MODEL_WIDE_ONLY}>
              {t('components.settings.voice.models.columnQuality', 'Quality')}
            </span>
            <span className={cn('text-right', SPEECH_MODEL_WIDE_ONLY)}>
              {t('components.settings.voice.models.columnSize', 'Size')}
            </span>
          </div>
          {rows.map((row) => (
            <VoiceSpeechModelRow
              key={row.manifest.id}
              row={row}
              active={voiceSettings.sttModel === row.manifest.id}
              recommended={setUpModelId === row.manifest.id}
              setUpPending={setUpPending}
              deletePending={pendingDeleteModelIds.has(row.manifest.id)}
              onUse={(modelId) => onUpdateVoiceSettings({ sttModel: modelId })}
              onDownload={(modelId) => startSpeechModelDownload(modelId, onRefreshModelStates)}
              onCancelDownload={(modelId) =>
                cancelSpeechModelDownload(modelId, onRefreshModelStates)
              }
              onDelete={deleteModel}
              onSetUp={onSetUp}
            />
          ))}
        </div>
      </div>
      <VoiceDictationLanguageSetting
        className="px-5"
        voiceSettings={voiceSettings}
        selectedModel={selectedModel}
        onUpdateVoiceSettings={onUpdateVoiceSettings}
      />
    </SettingsGroup>
  )
}
