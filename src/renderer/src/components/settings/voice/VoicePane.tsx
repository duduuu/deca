import { useCallback, useEffect, useRef, useState } from 'react'
import type { GlobalSettings } from '../../../../../shared/global-settings-types'
import { getDefaultVoiceSettings } from '../../../../../shared/constants'
import type { SpeechModelManifest, VoiceSettings } from '../../../../../shared/speech-types'
import { useAppStore } from '@/store/index'
import {
  handleVoiceDictationToggle,
  voiceDictationPermissionToasts
} from './voice-dictation-toggle'
import { VoiceWordsSettings } from './VoiceWordsSettings'
import { VoiceInputSettings } from './VoiceInputSettings'
import { isSpeechModelDownloading } from './voice-speech-model-rows'
import { VoiceDictationSettings } from './VoiceDictationSettings'
import { startSpeechModelDownload } from './speech-model-download'
import { VoiceModelUnloadSetting } from './VoiceModelUnloadSetting'
import { VoiceSpeechModelSection } from './VoiceSpeechModelSection'
import { SettingsGroup } from '../section-layout/SettingsGroup'
import { VoiceSpeechGpuSetting } from './VoiceSpeechGpuSetting'
import { useTranslate } from '@/i18n/use-translate'
import { useLanguageReadiness } from '@/i18n/language-readiness'
import { speechModelRatingLanguage } from '../../../../../shared/speech-model-quality'
import { suggestSpeechModel } from '../../../../../shared/speech-model-suggestion'

type VoicePaneProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
}

export function VoicePane({ settings, updateSettings }: VoicePaneProps): React.JSX.Element {
  const t = useTranslate()
  // Keep fallback identity stable so parent renders cannot repeat fetch effects.
  const [defaultVoiceSettings] = useState(getDefaultVoiceSettings)
  const voiceSettings = settings.voice ?? defaultVoiceSettings
  const modelStates = useAppStore((s) => s.modelStates)
  const refreshModelStates = useAppStore((s) => s.refreshModelStates)
  const markFeatureTipsSeen = useAppStore((s) => s.markFeatureTipsSeen)
  const systemLanguageTag = useLanguageReadiness((s) => s.detection?.detectedTag)
  // null until main answers, so the status and list never show a state the catalog would contradict.
  const [loadedCatalog, setCatalog] = useState<SpeechModelManifest[] | null>(null)
  const catalog = loadedCatalog ?? []
  const [permissionPending, setPermissionPending] = useState(false)
  const mountedRef = useRef(true)
  // Merge async whole-object writes into committed current settings; render snapshots could undo toggles changed during IPC and disable the microphone picker.
  const voiceSettingsRef = useRef(voiceSettings)
  useEffect(() => {
    voiceSettingsRef.current = voiceSettings
  }, [voiceSettings])

  const handlePaneRef = useCallback((node: HTMLDivElement | null): void => {
    mountedRef.current = node !== null
  }, [])

  const updateVoiceSettings = useCallback(
    (updates: Partial<VoiceSettings>): void => {
      updateSettings({
        voice: {
          ...voiceSettingsRef.current,
          ...updates
        }
      })
    },
    [updateSettings]
  )

  useEffect(() => {
    let cancelled = false
    refreshModelStates()
    void window.api.speech
      .getCatalog()
      .then((nextCatalog) => {
        if (!cancelled) {
          setCatalog(nextCatalog)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [refreshModelStates])

  useEffect(() => {
    const cleanup = window.api.speech.onDownloadProgress(() => {
      refreshModelStates()
    })
    return cleanup
  }, [refreshModelStates])

  const toggleVoiceDictation = async (alongside?: Partial<VoiceSettings>): Promise<void> => {
    await handleVoiceDictationToggle({
      voiceEnabled: voiceSettings.enabled,
      markFeatureTipsSeen,
      updateVoiceSettings: (updates) => updateVoiceSettings({ ...alongside, ...updates }),
      requestMicrophonePermission: () =>
        window.api.developerPermissions.request({ id: 'microphone' }),
      setPermissionPending,
      isMounted: () => mountedRef.current,
      ...voiceDictationPermissionToasts
    })
  }

  const selectedModel = catalog.find((m) => m.id === voiceSettings.sttModel)

  const selectedState = modelStates.find((s) => s.id === voiceSettings.sttModel)
  const ratingLanguage =
    speechModelRatingLanguage(voiceSettings.dictationLanguage, systemLanguageTag ?? undefined) ??
    'en'
  const platform = window.api.platform?.get()
  const suggestedModel = suggestSpeechModel(catalog, ratingLanguage, {
    selectedModelId: voiceSettings.sttModel,
    // Metal runs the large models fast; other machines get the small, quick ones.
    favorAccuracy:
      platform?.platform === 'darwin' &&
      platform.arch === 'arm64' &&
      voiceSettings.speechGpu !== 'off'
  })

  const setUpDictation = (): void => {
    if (!suggestedModel) {
      return
    }
    // Select and download first, so the download runs while the OS asks for the microphone.
    const selection = { sttModel: suggestedModel.id }
    updateVoiceSettings(selection)
    startSpeechModelDownload(suggestedModel.id, refreshModelStates)
    if (!voiceSettings.enabled) {
      // The enable write repeats the selection: it can land before the first write's reply refreshes the ref.
      void toggleVoiceDictation(selection)
    }
  }

  // Recommend a model only while dictation has none to use or already on its way.
  const setUpModelId =
    selectedState?.status === 'ready' ||
    selectedState?.needsUpdate ||
    isSpeechModelDownloading(selectedState)
      ? undefined
      : suggestedModel?.id

  return (
    <div ref={handlePaneRef} className="flex flex-col gap-8">
      <VoiceDictationSettings
        voiceSettings={voiceSettings}
        catalogLoaded={loadedCatalog !== null}
        selectedModel={selectedModel}
        selectedState={selectedState}
        permissionPending={permissionPending}
        onToggleVoiceDictation={() => void toggleVoiceDictation()}
        onUpdateVoiceSettings={updateVoiceSettings}
      />

      {loadedCatalog ? (
        <VoiceSpeechModelSection
          voiceSettings={voiceSettings}
          catalog={catalog}
          modelStates={modelStates}
          ratingLanguage={ratingLanguage}
          setUpModelId={setUpModelId}
          setUpPending={permissionPending}
          onSetUp={setUpDictation}
          onUpdateVoiceSettings={updateVoiceSettings}
          onRefreshModelStates={refreshModelStates}
        />
      ) : null}

      <VoiceInputSettings
        voiceSettings={voiceSettings}
        readyModel={selectedState?.status === 'ready' ? selectedModel : undefined}
        onUpdateVoiceSettings={updateVoiceSettings}
      />

      <VoiceWordsSettings
        voiceSettings={voiceSettings}
        onUpdateVoiceSettings={updateVoiceSettings}
      />

      <SettingsGroup title={t('components.settings.voice.advanced.title', 'Advanced')}>
        <VoiceSpeechGpuSetting
          voiceSettings={voiceSettings}
          onUpdateVoiceSettings={updateVoiceSettings}
        />
        <VoiceModelUnloadSetting
          voiceSettings={voiceSettings}
          onUpdateVoiceSettings={updateVoiceSettings}
        />
      </SettingsGroup>
    </div>
  )
}
