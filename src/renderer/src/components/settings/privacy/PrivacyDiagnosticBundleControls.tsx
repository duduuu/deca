import { Eye, FileText, Loader2, X } from 'lucide-react'
import type {
  DiagnosticsBundlePayload,
  DiagnosticsStatusPayload
} from '../../../../../preload/api/telemetry-api'
import { Button } from '../../ui/button'
import { translate } from '@/i18n/i18n'
import { useTranslate, type Translate } from '@/i18n/use-translate'

export function PrivacyDiagnosticBundleControls({
  status,
  bundle,
  collecting,
  openingPreview,
  discarding,
  onCollect,
  onOpenPreview,
  onDiscard
}: {
  readonly status: DiagnosticsStatusPayload | null
  readonly bundle: DiagnosticsBundlePayload | null
  readonly collecting: boolean
  readonly openingPreview: boolean
  readonly discarding: boolean
  readonly onCollect: () => Promise<void>
  readonly onOpenPreview: () => Promise<void>
  readonly onDiscard: () => Promise<void>
}): React.JSX.Element {
  const t = useTranslate()
  if (bundle) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          disabled={openingPreview}
          onClick={() => void onOpenPreview()}
        >
          <ActionIcon busy={openingPreview} icon={<Eye className="size-3.5" />} />
          {t(
            'auto.components.settings.PrivacyDiagnosticBundleControls.798b6f0be5',
            'Open review file'
          )}
        </Button>
        <Button variant="ghost" size="sm" disabled={discarding} onClick={() => void onDiscard()}>
          <ActionIcon busy={discarding} icon={<X className="size-3.5" />} />
          {t('auto.components.settings.PrivacyDiagnosticBundleControls.a5acaffdb6', 'Discard')}
        </Button>
      </>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={!status?.bundleEnabled || collecting}
      onClick={() => void onCollect()}
    >
      <ActionIcon busy={collecting} icon={<FileText className="size-3.5" />} />
      {t(
        'auto.components.settings.PrivacyDiagnosticBundleControls.dc8404a930',
        'Create diagnostic file'
      )}
    </Button>
  )
}

export function getDiagnosticBundleDescription(
  { bundle }: { readonly bundle: DiagnosticsBundlePayload | null },
  t: Translate = translate
): string {
  if (bundle) {
    return t(
      'settings.diagnostics.localBundleReady',
      'Your diagnostic file is ready ({{value0}}).',
      {
        value0: formatBytes(bundle.bytes)
      }
    )
  }
  return t(
    'settings.diagnostics.localBundleDescription',
    'Collects recent app activity and errors into a redacted local file. Nothing is uploaded.'
  )
}

function ActionIcon({ busy, icon }: { readonly busy: boolean; readonly icon: React.ReactNode }) {
  return busy ? <Loader2 className="size-3.5 animate-spin" /> : icon
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
