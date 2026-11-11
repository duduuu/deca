import { useDeferredValue, useMemo, useState } from 'react'
import { AlertTriangle, Clipboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useMountedRef } from '@/hooks/useMountedRef'
import {
  formatCrashReportText,
  isReactErrorBoundaryReport,
  MAX_USER_NOTES_LENGTH,
  type CrashReportRecord
} from '../../../../shared/crash-reporting'
import { translate } from '@/i18n/i18n'
import { useIntlLocale, useTranslate, type Translate } from '@/i18n/use-translate'
import { useCrashReportCopy } from './use-crash-report-copy'

function formatSummary(report: CrashReportRecord, t: Translate = translate): string {
  if (isReactErrorBoundaryReport(report)) {
    const surface = typeof report.details.surface === 'string' ? report.details.surface : null
    return surface
      ? t(
          'auto.components.crash.report.CrashReportDialogSurface.renderErrorIn',
          'React render error in {{surface}}',
          { surface }
        )
      : t('auto.components.crash.report.CrashReportDialogSurface.renderError', 'React render error')
  }
  return `${report.processType} ${report.reason}${
    report.exitCode === null ? '' : ` (exit ${report.exitCode})`
  }`
}

function getDialogTitle(report: CrashReportRecord | null, t: Translate = translate): string {
  if (!report) {
    return t('auto.components.crash.report.CrashReportDialogSurface.reportTitle', 'Report a crash')
  }
  return report && isReactErrorBoundaryReport(report)
    ? t(
        'auto.components.crash.report.CrashReportDialogSurface.uiErrorTitle',
        'Deca hit a recoverable UI error'
      )
    : t(
        'auto.components.crash.report.CrashReportDialogSurface.closedTitle',
        'Deca closed unexpectedly'
      )
}

function getDialogDescription(report: CrashReportRecord | null, t: Translate = translate): string {
  if (!report) {
    return t(
      'auto.components.crash.report.CrashReportDialogSurface.localReportDescription',
      'Copy a privacy-safe crash report to share with your support team. Recent redacted diagnostic logs are included when available.'
    )
  }
  return report && isReactErrorBoundaryReport(report)
    ? t(
        'auto.components.crash.report.CrashReportDialogSurface.localUiErrorDescription',
        'Copy a privacy-safe diagnostic report describing the failed UI surface.'
      )
    : t(
        'auto.components.crash.report.CrashReportDialogSurface.localClosedDescription',
        'Copy a privacy-safe diagnostic report describing what happened.'
      )
}

function getNotesPlaceholder(report: CrashReportRecord | null, t: Translate = translate): string {
  if (!report) {
    return t(
      'auto.components.crash.report.CrashReportDialogSurface.reportNotesPlaceholder',
      'Optional: what happened?'
    )
  }
  return report && isReactErrorBoundaryReport(report)
    ? t(
        'auto.components.crash.report.CrashReportDialogSurface.uiErrorNotesPlaceholder',
        'Optional: what were you doing before this UI error?'
      )
    : t(
        'auto.components.crash.report.CrashReportDialogSurface.closedNotesPlaceholder',
        'Optional: what were you doing before Deca closed?'
      )
}

type CrashReportDialogSurfaceProps = {
  open: boolean
  report: CrashReportRecord | null
  loading: boolean
  onOpenChange: (open: boolean) => void
  onReportChange: (report: CrashReportRecord | null) => void
}

export function CrashReportDialogSurface({
  open,
  report,
  loading,
  onOpenChange,
  onReportChange
}: CrashReportDialogSurfaceProps): React.JSX.Element {
  const t = useTranslate()
  const intlLocale = useIntlLocale()
  const mountedRef = useMountedRef()
  const [notes, setNotes] = useState('')
  const deferredNotes = useDeferredValue(notes)
  const diagnosticText = useMemo(
    // Defer full-payload redaction/truncation so notes typing stays responsive.
    () => (report ? formatCrashReportText(report, deferredNotes) : ''),
    [deferredNotes, report]
  )
  const copyCrashReportDetails = useCrashReportCopy(report, notes)

  const dismissReportIfNeeded = async (): Promise<void> => {
    if (report?.status === 'pending') {
      await window.api.crashReports.dismiss({ reportId: report.id })
      if (mountedRef.current) {
        onReportChange({ ...report, status: 'dismissed' })
      }
    }
  }

  const handleDismiss = async (): Promise<void> => {
    await dismissReportIfNeeded()
    if (mountedRef.current) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          void dismissReportIfNeeded().finally(() => {
            if (mountedRef.current) {
              onOpenChange(false)
            }
          })
          return
        }
        onOpenChange(true)
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className="size-4 text-destructive" />
            {getDialogTitle(report, t)}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {getDialogDescription(report, t)}
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-3">
          {report ? (
            <>
              <div className="rounded-md border border-border/70 bg-muted/30 p-3 text-xs">
                <div className="font-medium text-foreground">{formatSummary(report, t)}</div>
                <div className="mt-1 text-muted-foreground">
                  {new Date(report.createdAt).toLocaleString(intlLocale)} · {report.platform}{' '}
                  {report.arch} ·{' '}
                  {t('auto.components.crash.report.CrashReportDialog.835037edc9', 'Deca')}{' '}
                  {report.appVersion}
                </div>
              </div>
              <div className="min-w-0 space-y-1.5">
                <div className="text-[11px] font-medium text-muted-foreground">
                  {t(
                    'auto.components.crash.report.CrashReportDialog.6d3ebe216a',
                    'Diagnostic text'
                  )}
                </div>
                <pre className="max-h-44 overflow-auto whitespace-pre-wrap [overflow-wrap:anywhere] rounded-md border border-border bg-muted/20 p-3 font-mono text-[11px] leading-5 text-muted-foreground scrollbar-sleek">
                  {diagnosticText}
                </pre>
              </div>
            </>
          ) : (
            <div className="rounded-md border border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
              {loading
                ? t(
                    'auto.components.crash.report.CrashReportDialog.765591798d',
                    'Checking for crash reports...'
                  )
                : t(
                    'auto.components.crash.report.CrashReportDialog.localNoReport',
                    'No automatic crash report was captured. You can still copy details, including recent diagnostic logs when available.'
                  )}
            </div>
          )}
          <div className="space-y-1">
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              // Keep the UI and formatter on the same input budget.
              maxLength={MAX_USER_NOTES_LENGTH}
              placeholder={getNotesPlaceholder(report, t)}
              className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <div
              aria-hidden="true"
              className="text-right text-[11px] tabular-nums text-muted-foreground"
            >
              {notes.length.toLocaleString(intlLocale)} /{' '}
              {MAX_USER_NOTES_LENGTH.toLocaleString(intlLocale)}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={handleDismiss}>
            {t('auto.components.crash.report.CrashReportDialog.localClose', 'Close')}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void copyCrashReportDetails()}
            disabled={loading}
          >
            <Clipboard className="size-3.5" />
            {t('auto.components.crash.report.CrashReportDialog.50b00dc327', 'Copy Details')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
