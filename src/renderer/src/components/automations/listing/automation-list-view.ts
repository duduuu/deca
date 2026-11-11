import type { TuiAgent } from '../../../../../shared/agent-launch/catalog/tui-agent'
import { hostStableKey } from '../../../../../shared/automations/ownership/automation-owner-key'
import type { AutomationListRow } from './automation-list-row-identity'
import {
  getAutomationRowLastRunSnapshot,
  type AutomationLastRunSnapshot
} from './automation-list-last-run'
import type { Translate } from '../../../i18n/use-translate'

export type AutomationListStatusFilter = 'all' | 'enabled' | 'paused'
export type AutomationListLastRunFilter = 'all' | 'failed' | 'succeeded' | 'never'
export type AutomationListSortField = 'name' | 'lastRun'
export type AutomationListSortDirection = 'asc' | 'desc'

export type AutomationListSort = {
  field: AutomationListSortField
  direction: AutomationListSortDirection
}

/** One sortable row; authority-qualified row keys matter because bare IDs collide and determine the tie-break order. */
export type AutomationListViewItem = {
  kind: 'local'
  id: string
  name: string
  enabled: boolean
  lastRunAt: number | null
  lastRun: AutomationLastRunSnapshot
  agentId: TuiAgent
  row: AutomationListRow
}

export type AutomationListFilter = {
  status: AutomationListStatusFilter
  lastRun: AutomationListLastRunFilter
  agentIds: readonly TuiAgent[]
  /** Catalog stable keys; empty (or absent, on older callers) means every host. */
  hostStableKeys?: readonly string[]
}

export const EMPTY_AUTOMATION_LIST_FILTER: AutomationListFilter = {
  status: 'all',
  lastRun: 'all',
  agentIds: [],
  hostStableKeys: []
}

function selectedHostKeys(filter: AutomationListFilter): readonly string[] {
  return filter.hostStableKeys ?? []
}

export function isAutomationListFilterActive(filter: AutomationListFilter): boolean {
  return (
    filter.status !== 'all' ||
    filter.lastRun !== 'all' ||
    filter.agentIds.length > 0 ||
    selectedHostKeys(filter).length > 0
  )
}

export function countAutomationListFilters(filter: AutomationListFilter): number {
  return (
    (filter.status !== 'all' ? 1 : 0) +
    (filter.lastRun !== 'all' ? 1 : 0) +
    (filter.agentIds.length > 0 ? 1 : 0) +
    (selectedHostKeys(filter).length > 0 ? 1 : 0)
  )
}

export function defaultAutomationListSortDirection(
  field: AutomationListSortField
): AutomationListSortDirection {
  return field === 'lastRun' ? 'desc' : 'asc'
}

export function nextAutomationListSort(
  current: AutomationListSort | null,
  field: AutomationListSortField
): AutomationListSort {
  if (current?.field !== field) {
    return { field, direction: defaultAutomationListSortDirection(field) }
  }
  return {
    field,
    direction: current.direction === 'asc' ? 'desc' : 'asc'
  }
}

function matchesStatusFilter(enabled: boolean, filter: AutomationListStatusFilter): boolean {
  if (filter === 'all') {
    return true
  }
  return filter === 'enabled' ? enabled : !enabled
}

function matchesLastRunFilter(
  snapshot: AutomationLastRunSnapshot,
  filter: AutomationListLastRunFilter
): boolean {
  if (filter === 'all') {
    return true
  }
  return snapshot.tone === filter
}

/** Maps catalog rows into sortable list items, preserving row identity. */
export function buildAutomationListViewItems(
  { rows }: { rows: readonly AutomationListRow[] },
  t?: Translate
): AutomationListViewItem[] {
  return rows.map((row) => {
    // Why: the same snapshot the row cell renders, so the sort matches the column.
    const lastRun = getAutomationRowLastRunSnapshot(row, t)
    return {
      kind: 'local',
      id: row.key,
      name: row.automation.name,
      enabled: row.automation.enabled,
      lastRunAt: lastRun.at,
      lastRun,
      agentId: row.automation.agentId,
      row
    }
  })
}

/** A pre-catalog row names no host, so a host filter (which implies a hydrated catalog) excludes it. */
function matchesHostFilter(hostKey: string | null, keys: readonly string[]): boolean {
  return keys.length === 0 || (hostKey !== null && keys.includes(hostKey))
}

/** The attribute filter over catalog rows; identity-stable when the filter is inactive. */
export function filterAutomationListRows(
  rows: readonly AutomationListRow[],
  filter: AutomationListFilter,
  t?: Translate
): readonly AutomationListRow[] {
  if (!isAutomationListFilterActive(filter)) {
    return rows
  }
  const hostKeys = selectedHostKeys(filter)
  return rows.filter(
    (row) =>
      matchesHostFilter(row.catalogRef ? hostStableKey(row.catalogRef) : null, hostKeys) &&
      matchesStatusFilter(row.automation.enabled, filter.status) &&
      matchesLastRunFilter(getAutomationRowLastRunSnapshot(row, t), filter.lastRun) &&
      (filter.agentIds.length === 0 || filter.agentIds.includes(row.automation.agentId))
  )
}

/** Take locale explicitly so memoized callers can declare collation changes as dependencies. */
export function sortAutomationListViewItems(
  items: readonly AutomationListViewItem[],
  sort: AutomationListSort | null,
  locale: string
): AutomationListViewItem[] {
  if (!sort || items.length < 2) {
    return [...items]
  }
  const next = [...items]
  const compareNames =
    sort.field === 'name' ? new Intl.Collator(locale, { sensitivity: 'base' }).compare : null
  next.sort((left, right) => {
    const compared = compareNames
      ? compareNames(left.name, right.name)
      : (left.lastRunAt ?? 0) - (right.lastRunAt ?? 0)
    if (compared !== 0) {
      return sort.direction === 'asc' ? compared : -compared
    }
    return left.id.localeCompare(right.id)
  })
  return next
}

/** The rendered list: filter each collection with its own rules, then sort as one. */
export function applyAutomationListView({
  rows,
  filter,
  sort,
  locale
}: {
  rows: readonly AutomationListRow[]
  filter: AutomationListFilter
  sort: AutomationListSort | null
  locale: string
}): AutomationListViewItem[] {
  return sortAutomationListViewItems(
    buildAutomationListViewItems({ rows: filterAutomationListRows(rows, filter) }),
    sort,
    locale
  )
}
