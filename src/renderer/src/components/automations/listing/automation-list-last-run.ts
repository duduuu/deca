import { translate } from '@/i18n/i18n'
import type { Translate } from '@/i18n/use-translate'
import type { Automation } from '../../../../../shared/automations/automation-definition'
import type {
  AutomationRun,
  AutomationRunStatus
} from '../../../../../shared/automations/history/automation-run'
import {
  formatAutomationDateTime,
  formatAutomationRelativeTime,
  getAutomationRunStatusLabel
} from '../automation-page-parts'

export type AutomationLastRunTone =
  | 'failed'
  | 'succeeded'
  | 'running'
  | 'skipped'
  | 'never'
  | 'unknown'

export type AutomationLastRunSnapshot = {
  at: number | null
  tone: AutomationLastRunTone
  statusLabel: string
}

export function indexLatestAutomationRuns(
  runs: readonly AutomationRun[]
): ReadonlyMap<string, AutomationRun> {
  const latest = new Map<string, AutomationRun>()
  for (const run of runs) {
    const existing = latest.get(run.automationId)
    if (!existing || run.createdAt > existing.createdAt) {
      latest.set(run.automationId, run)
    }
  }
  return latest
}

export function getAutomationRunLastRunAt(run: AutomationRun): number {
  return run.dispatchedAt ?? run.startedAt ?? run.createdAt
}

export function getToneForAutomationRunStatus(status: AutomationRunStatus): AutomationLastRunTone {
  if (status === 'dispatch_failed') {
    return 'failed'
  }
  if (status === 'completed') {
    return 'succeeded'
  }
  if (status === 'pending' || status === 'dispatching' || status === 'dispatched') {
    return 'running'
  }
  if (status.startsWith('skipped')) {
    return 'skipped'
  }
  return 'unknown'
}

/** Use the authority-projected newest retained run without fetching history; legacy servers fall back to stored lastRunAt alone. */
export function getAutomationRowLastRunSnapshot(
  row: {
    automation: Automation
    usageSummary: { lastRunStatus?: AutomationRunStatus | null; lastRunAt?: number | null } | null
  },
  t?: Translate
): AutomationLastRunSnapshot {
  const status = row.usageSummary?.lastRunStatus
  if (status) {
    return {
      at: row.usageSummary?.lastRunAt ?? row.automation.lastRunAt ?? null,
      tone: getToneForAutomationRunStatus(status),
      statusLabel: getAutomationRunStatusLabel(status, t)
    }
  }
  return getLocalAutomationLastRunSnapshot(row.automation, undefined, t)
}

export function getLocalAutomationLastRunSnapshot(
  automation: Automation,
  lastRun: AutomationRun | undefined,
  t?: Translate
): AutomationLastRunSnapshot {
  if (lastRun) {
    return {
      at: getAutomationRunLastRunAt(lastRun),
      tone: getToneForAutomationRunStatus(lastRun.status),
      statusLabel: getAutomationRunStatusLabel(lastRun.status, t)
    }
  }
  if (automation.lastRunAt) {
    return {
      at: automation.lastRunAt,
      tone: 'unknown',
      statusLabel: ''
    }
  }
  return { at: null, tone: 'never', statusLabel: '' }
}

export function formatAutomationLastRunCell(
  snapshot: AutomationLastRunSnapshot,
  now: number,
  t: Translate = translate,
  intlLocale?: string
): { text: string; title: string; tone: AutomationLastRunTone } {
  const status = snapshot.statusLabel.trim()
  if (snapshot.tone === 'never') {
    const never = formatAutomationDateTime(null, t, intlLocale)
    return { text: never, title: never, tone: 'never' }
  }
  if (snapshot.at == null) {
    return {
      text: status || formatAutomationDateTime(null, t, intlLocale),
      title: status,
      tone: snapshot.tone
    }
  }
  const relative = formatAutomationRelativeTime(snapshot.at, now, t, intlLocale)
  const absolute = formatAutomationDateTime(snapshot.at, t, intlLocale)
  const text =
    status && relative
      ? t(
          'auto.components.automations.automation.list.last.run.statusWithRelative',
          '{{status}} {{relative}}',
          { status, relative }
        )
      : status || relative || absolute
  return {
    text,
    title: status ? `${status} · ${absolute}` : absolute,
    tone: snapshot.tone
  }
}
