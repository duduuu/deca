import { useRef, useState } from 'react'
import { ChevronDown, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { i18n, loadRendererUiLanguage } from '@/i18n/i18n'
import { useTranslate } from '@/i18n/use-translate'
import { getUiLanguageNativeLabel } from '@/i18n/supported-languages'
import { useLanguageReadiness } from '@/i18n/language-readiness'
import { track } from '@/diagnostics/telemetry/telemetry'
import { useAppStore } from '@/store/index'
import {
  SUPPORTED_UI_LOCALES,
  type SupportedUiLocale,
  getRendererLanguageDetection,
  shouldShowLanguageSwitcher
} from '../../../../shared/ui-locale'

export function OnboardingLanguageSwitcher({
  open,
  onOpenChange
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}): React.JSX.Element | null {
  const t = useTranslate()
  const cohort = useAppStore((state) => state.settings?.telemetry?.onboardingLanguageCohort)
  const language = useAppStore((state) => state.settings?.uiLanguage ?? 'system')
  const updateSettings = useAppStore((state) => state.updateSettingsOrThrow)
  const catalogError = useLanguageReadiness((state) => state.error)
  const catalogLoading = useLanguageReadiness((state) => state.loading)
  const detection =
    useLanguageReadiness((state) => state.detection) ?? getRendererLanguageDetection()
  const [recoveryVisible] = useState(catalogError)
  const [selectionPhase, setSelectionPhase] = useState<'load' | 'save' | null>(null)
  const [selectionFailure, setSelectionFailure] = useState<{
    language: SupportedUiLocale
    stage: 'load' | 'save'
  } | null>(null)
  const selectionInFlight = useRef(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const busy = selectionPhase !== null || catalogLoading
  const metadata = {
    system_language: detection.detectedTag,
    system_language_supported: detection.status === 'supported',
    detection_source: detection.source,
    effective_language: i18n.language
  }
  const setOpen = (next: boolean): void => {
    if (next) {
      track('onboarding_language_picker_opened', metadata)
    }
    onOpenChange(next)
  }

  const chooseLanguage = async (next: SupportedUiLocale): Promise<void> => {
    if (selectionInFlight.current || catalogLoading) {
      return
    }
    selectionInFlight.current = true
    setSelectionPhase('load')
    setSelectionFailure(null)
    let stage: 'load' | 'save' = 'load'
    try {
      const locale = await loadRendererUiLanguage(next)
      stage = 'save'
      setSelectionPhase('save')
      await updateSettings({ uiLanguage: next })
      if (useAppStore.getState().settings?.uiLanguage !== next) {
        return
      }
      if (catalogError && language === next) {
        useLanguageReadiness.getState().retryLanguageLoad()
      }
      track('onboarding_language_changed', {
        ...metadata,
        selected_language: next,
        effective_language: locale
      })
    } catch {
      setSelectionFailure({ language: next, stage })
    } finally {
      selectionInFlight.current = false
      setSelectionPhase(null)
    }
  }

  if (
    cohort === 'control' ||
    (!open && !shouldShowLanguageSwitcher(detection) && !catalogError && !recoveryVisible)
  ) {
    return null
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="shrink-0">
          <Globe />
          <span>{t('onboarding.language.switch', 'Switch language')}</span>
          <ChevronDown className="size-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        ref={contentRef}
        align="end"
        aria-label={t('onboarding.language.title', 'Display language')}
        className="z-[110] w-80 max-w-[calc(100vw-2rem)]"
        wheelScroll
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          const content = contentRef.current
          const selected =
            content?.querySelector<HTMLElement>('[role="radio"][data-state="checked"]') ??
            content?.querySelector<HTMLElement>('[role="radio"]')
          selected?.focus()
        }}
      >
        <div className="scrollbar-sleek max-h-[var(--radix-popover-content-available-height)] overflow-y-auto p-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {t('onboarding.language.title', 'Display language')}
              </p>
              <p className="text-xs text-muted-foreground">
                {detection.status === 'supported'
                  ? t('onboarding.language.device', 'System language: {{language}}', {
                      language: getUiLanguageNativeLabel(detection.locale)
                    })
                  : detection.status === 'unsupported'
                    ? t(
                        'onboarding.language.unsupported',
                        'System language: {{language}}. This language is not supported yet.',
                        { language: detection.detectedTag }
                      )
                    : t(
                        'onboarding.language.unknown',
                        'Your system language could not be detected. Choose a language below.'
                      )}
              </p>
            </div>
            <RadioGroup
              value={language === 'system' ? detection.locale : language}
              aria-busy={busy}
              aria-disabled={busy}
              onKeyDownCapture={(event) => {
                if (
                  busy &&
                  [
                    'ArrowDown',
                    'ArrowUp',
                    'ArrowLeft',
                    'ArrowRight',
                    'Home',
                    'End',
                    ' ',
                    'Enter'
                  ].includes(event.key)
                ) {
                  event.preventDefault()
                  event.stopPropagation()
                }
              }}
              onValueChange={(value) => {
                const locale = SUPPORTED_UI_LOCALES.find((entry) => entry === value)
                if (locale) {
                  void chooseLanguage(locale)
                }
              }}
              aria-label={t('onboarding.language.title', 'Display language')}
            >
              {SUPPORTED_UI_LOCALES.map((locale) => (
                <div key={locale} className="rounded-md px-2 py-2 hover:bg-accent">
                  <Label className="cursor-pointer">
                    <RadioGroupItem
                      value={locale}
                      onClick={() => {
                        if (language === 'system' && locale === detection.locale) {
                          void chooseLanguage(locale)
                        }
                      }}
                    />
                    <span>{getUiLanguageNativeLabel(locale)}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
            <p role="status" className="h-4 text-xs text-muted-foreground">
              {selectionPhase === 'save'
                ? t('onboarding.language.saving', 'Saving language…')
                : busy
                  ? t('onboarding.language.loading', 'Loading language…')
                  : null}
            </p>
            {(selectionFailure !== null || catalogError) && (
              <div role="alert" className="space-y-2">
                <p className="text-xs text-destructive">
                  {selectionFailure?.stage === 'save'
                    ? t(
                        'onboarding.language.saveError',
                        'Could not save your language preference. Try again.'
                      )
                    : t(
                        'onboarding.language.loadError',
                        'Could not load this language. Try again.'
                      )}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    if (selectionFailure) {
                      void chooseLanguage(selectionFailure.language)
                    } else {
                      useLanguageReadiness.getState().retryLanguageLoad()
                    }
                  }}
                >
                  {t('onboarding.language.retry', 'Retry')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
