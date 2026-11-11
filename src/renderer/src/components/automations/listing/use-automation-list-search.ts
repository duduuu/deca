import { useDeferredValue, useEffect, useMemo, useRef } from 'react'
import type { Repo } from '../../../../../shared/repo-types'
import { resolveAutomationListSearchQuery } from './automation-list-search-query'
import type { AutomationListRow } from './automation-list-row-identity'
import {
  buildAutomationListSearchRowFingerprint,
  buildAutomationListSearchRows,
  buildAutomationSearchRowSources,
  matchAutomationListSearchRowKeys,
  type AutomationListSearchRow,
  type AutomationListSearchRowSource,
  type AutomationWorkspaceNameLookup
} from './automation-list-search-rows'

/** Counts the empty-state view consumes, so it never recomputes what search already knows. */
export type AutomationListSearchCounts = {
  hostRowCount: number
  visibleRowCount: number
  searchActive: boolean
}

/** Cache by capped search-content fingerprint so equivalent refresh arrays do not rebuild indexes; array-identity useMemo cannot express this. */
function useAutomationSearchRows(
  sources: AutomationListSearchRowSource[]
): AutomationListSearchRow[] {
  const fingerprint = useMemo(() => buildAutomationListSearchRowFingerprint(sources), [sources])
  const cacheRef = useRef<{ fingerprint: string; rows: AutomationListSearchRow[] } | null>(null)
  if (!cacheRef.current || cacheRef.current.fingerprint !== fingerprint) {
    cacheRef.current = { fingerprint, rows: buildAutomationListSearchRows(sources) }
  }
  return cacheRef.current.rows
}

export function useAutomationListSearch({
  listSearchQuery,
  rows,
  repoMap,
  worktreeMap,
  selectedRowKey,
  selectAutomationRow
}: {
  listSearchQuery: string
  rows: readonly AutomationListRow[]
  repoMap: ReadonlyMap<string, Repo>
  worktreeMap?: AutomationWorkspaceNameLookup
  /** The row currently on screen, not the bare id: two hosts can hold that id. */
  selectedRowKey: string | null
  selectAutomationRow: (rowKey: string | null) => void
}): {
  isListSearchQueryTooLarge: boolean
  filteredRows: readonly AutomationListRow[]
  hasListItems: boolean
  hasFilteredListItems: boolean
  searchCounts: AutomationListSearchCounts
} {
  // Defer matching so index scans cannot delay input/caret; only normalized active queries search.
  const deferredListSearchQuery = useDeferredValue(listSearchQuery)
  const liveListSearchResolution = useMemo(
    () => resolveAutomationListSearchQuery(listSearchQuery),
    [listSearchQuery]
  )
  const deferredListSearchResolution = useMemo(
    () => resolveAutomationListSearchQuery(deferredListSearchQuery),
    [deferredListSearchQuery]
  )
  // Report oversized pastes from live input while filtering follows deferred resolution.
  const isListSearchQueryTooLarge = liveListSearchResolution.status === 'too_large'
  // Why: null means search must not run (empty, whitespace, or too large).
  const activeListSearchQuery =
    deferredListSearchResolution.status === 'active' ? deferredListSearchResolution.query : null
  const isListSearchActive = activeListSearchQuery !== null

  const automationSearchSources = useMemo(
    () => buildAutomationSearchRowSources(rows, { repoMap, worktreeMap }),
    [rows, repoMap, worktreeMap]
  )
  const automationSearchRows = useAutomationSearchRows(automationSearchSources)

  // Match only on normalized query/search-content changes, ignoring clock/next-run/usage refreshes.
  const filteredRowKeys = useMemo(
    (): readonly string[] | null =>
      activeListSearchQuery === null
        ? null
        : matchAutomationListSearchRowKeys(automationSearchRows, activeListSearchQuery),
    [activeListSearchQuery, automationSearchRows]
  )

  const filteredRows = useMemo((): readonly AutomationListRow[] => {
    if (filteredRowKeys === null) {
      return rows
    }
    if (filteredRowKeys.length === 0) {
      return []
    }
    // Use authority-qualified row keys; bare IDs would drop one host’s copy and duplicate another.
    const byKey = new Map(rows.map((row) => [row.key, row]))
    const next: AutomationListRow[] = []
    for (const key of filteredRowKeys) {
      const row = byKey.get(key)
      if (row) {
        next.push(row)
      }
    }
    return next
  }, [rows, filteredRowKeys])

  const hostRowCount = rows.length
  const visibleRowCount = filteredRows.length

  // Align detail/highlight with the first visible match when search hides selection; no matches preserve detail.
  useEffect(() => {
    if (activeListSearchQuery === null) {
      return
    }
    if (selectedRowKey != null && filteredRows.some((row) => row.key === selectedRowKey)) {
      return
    }
    const firstLocal = filteredRows[0]
    if (firstLocal && selectedRowKey !== firstLocal.key) {
      selectAutomationRow(firstLocal.key)
    }
  }, [activeListSearchQuery, filteredRows, selectAutomationRow, selectedRowKey])

  return {
    isListSearchQueryTooLarge,
    filteredRows,
    hasListItems: hostRowCount > 0,
    hasFilteredListItems: visibleRowCount > 0,
    searchCounts: { hostRowCount, visibleRowCount, searchActive: isListSearchActive }
  }
}
