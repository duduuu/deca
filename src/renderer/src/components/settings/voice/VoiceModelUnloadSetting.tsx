import { useId } from 'react'
import type { VoiceSettings } from '../../../../../shared/speech-types'
import {
  UNLOAD_MODEL_AFTER_MINUTES_CHOICES,
  unloadModelAfterMinutes,
  type UnloadModelAfterMinutes
} from '../../../../../shared/voice-model-unload'
import { translate } from '@/i18n/i18n'
import { useIntlLocale, useTranslate, type Translate } from '@/i18n/use-translate'
import { formatMinutesDuration } from '@/i18n/ui-intl-formatters'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { SettingsRow } from '../form-controls/SettingsFormControls'

const NEVER_VALUE = 'never'

function choiceValue(minutes: UnloadModelAfterMinutes): string {
  return minutes === null ? NEVER_VALUE : String(minutes)
}

function choiceLabel(
  minutes: UnloadModelAfterMinutes,
  t: Translate = translate,
  intlLocale?: string
): string {
  // The row asks how long to keep the model, so never unloading reads Always and unloading at once Never.
  if (minutes === null) {
    return t('components.settings.voice.keepLoaded.always', 'Always')
  }
  if (minutes === 0) {
    return t('components.settings.voice.keepLoaded.never', 'Never')
  }
  return formatMinutesDuration(minutes, intlLocale)
}

type VoiceModelUnloadSettingProps = {
  voiceSettings: VoiceSettings
  onUpdateVoiceSettings: (updates: Partial<VoiceSettings>) => void
}

export function VoiceModelUnloadSetting({
  voiceSettings,
  onUpdateVoiceSettings
}: VoiceModelUnloadSettingProps): React.JSX.Element {
  const t = useTranslate()
  const intlLocale = useIntlLocale()
  const labelId = useId()
  const current = unloadModelAfterMinutes(voiceSettings)

  return (
    <SettingsRow
      label={t('components.settings.voice.keepLoaded.label', 'Keep model loaded')}
      description={t(
        'components.settings.voice.keepLoaded.description',
        'Dictation starts at once while it’s loaded.'
      )}
      labelId={labelId}
      control={
        <Select
          value={choiceValue(current)}
          onValueChange={(value) =>
            onUpdateVoiceSettings({
              unloadModelAfterMinutes: value === NEVER_VALUE ? null : Number(value)
            })
          }
        >
          <SelectTrigger size="sm" className="min-w-32" aria-labelledby={labelId}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UNLOAD_MODEL_AFTER_MINUTES_CHOICES.map((minutes) => (
              <SelectItem key={choiceValue(minutes)} value={choiceValue(minutes)}>
                {choiceLabel(minutes, t, intlLocale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    />
  )
}
