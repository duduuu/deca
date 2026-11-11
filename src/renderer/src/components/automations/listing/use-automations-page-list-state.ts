import { useCallback, useMemo } from 'react'
import { useAppStore } from '@/store/index'
import {
  hostStableKey,
  ownerKey,
  toStableCatalogRef
} from '../../../../../shared/automations/ownership/automation-owner-key'
import { resolveAutomationRunTarget } from '../runs/automation-run-open-target'
import {
  capturedAutomationOwner,
  capturedAutomationOwnerKey
} from '../hosts/automation-captured-owner'
import type { AutomationRun } from '../../../../../shared/automations/history/automation-run'
import { getWorktreePathBasenameFromId } from '../../../../../shared/worktree/id'
import {
  buildAutomationListViewItems,
  filterAutomationListRows,
  sortAutomationListViewItems
} from './automation-list-view'
import { useIntlLocale } from '@/i18n/use-translate'
import { unscopedAutomationListRows } from './automation-list-row-identity'
import { useAutomationHostCatalog } from '../hosts/use-automation-host-catalog'
import { useAutomationListSearch } from './use-automation-list-search'
import type { AutomationsPageLocalState } from '../use-automations-page-local-state'
import type { AutomationsPageStoreState } from '../use-automations-page-store-state'

/** Host-qualified rows, selection, and list-search projection. */
export function useAutomationsPageListState({
  store,
  local
}: {
  store: Pick<AutomationsPageStoreState, 'repoMap' | 'worktreeMap' | 'selectedId' | 'setSelectedId'>
  local: Pick<
    AutomationsPageLocalState,
    | 'automations'
    | 'failedAuthorityKeys'
    | 'listSearchQuery'
    | 'listFilter'
    | 'listSort'
    | 'selectedRowKey'
    | 'selectedAutomationRuns'
    | 'workspaceNameCacheRef'
    | 'setSelectedAutomationRunPageId'
    | 'setSelectedRowKey'
    | 'setRunHistoryAcquisitionToken'
  >
}) {
  const intlLocale = useIntlLocale()
  const { repoMap, worktreeMap, selectedId, setSelectedId } = store
  const {
    automations,
    failedAuthorityKeys,
    listSearchQuery,
    listFilter,
    listSort,
    selectedRowKey,
    selectedAutomationRuns,
    workspaceNameCacheRef,
    setSelectedAutomationRunPageId,
    setSelectedRowKey,
    setRunHistoryAcquisitionToken
  } = local
  const hostCatalog = useAutomationHostCatalog({ failedAuthorityKeys })
  const unscopedRows = useMemo(() => unscopedAutomationListRows(automations), [automations])
  const visibleRows = hostCatalog.rows.answered ? hostCatalog.rows.rows : unscopedRows
  const capturedAutomationOwners = hostCatalog.rows.capturedOwners
  const attributeFilteredRows = useMemo(
    () => filterAutomationListRows(visibleRows, listFilter),
    [listFilter, visibleRows]
  )
  const selectAutomationRow = useCallback(
    (rowKey: string | null): void => {
      const row = rowKey === null ? null : visibleRows.find((candidate) => candidate.key === rowKey)
      setRunHistoryAcquisitionToken((token) => token + 1)
      setSelectedAutomationRunPageId(null)
      setSelectedRowKey(row?.key ?? null)
      setSelectedId(row?.automation.id ?? null)
    },
    [
      setSelectedAutomationRunPageId,
      setSelectedId,
      setSelectedRowKey,
      setRunHistoryAcquisitionToken,
      visibleRows
    ]
  )
  const selectedRow = selectedId
    ? (visibleRows.find((row) => row.key === selectedRowKey && row.automation.id === selectedId) ??
      visibleRows.find((row) => row.automation.id === selectedId) ??
      null)
    : (visibleRows[0] ?? null)
  const selected = selectedRow?.automation ?? null
  const {
    isListSearchQueryTooLarge,
    filteredRows,
    hasListItems,
    hasFilteredListItems,
    searchCounts
  } = useAutomationListSearch({
    listSearchQuery,
    rows: attributeFilteredRows,
    repoMap,
    worktreeMap,
    selectedRowKey: selectedRow?.key ?? null,
    selectedExternalKey,
    selectAutomationRow,
    selectExternalKey
  })
  const runTargetFor = useCallback(
    (run: AutomationRun) => {
      const state = useAppStore.getState()
      const acquiredOwner = selectedAutomationRuns.capturedOwner?.owner
      const entry = acquiredOwner
        ? hostCatalog.entries.find(
            (candidate) => candidate.stableKey === hostStableKey(toStableCatalogRef(acquiredOwner))
          )
        : null
      const acquiredOwnerCurrent =
        !entry ||
        (entry.catalogState !== 'removed' &&
          (!entry.owner
            ? entry.catalogState === 'unhydrated'
            : !!acquiredOwner && ownerKey(entry.owner) === ownerKey(acquiredOwner)))
      const fresh =
        acquiredOwnerCurrent &&
        (!capturedAutomationOwners.has(selectedAutomationRuns.rowKey ?? '') ||
          selectedAutomationRuns.ownerKey ===
            capturedAutomationOwnerKey(
              capturedAutomationOwner(capturedAutomationOwners, selectedAutomationRuns.rowKey)
            ))
      return resolveAutomationRunTarget(
        fresh ? state : { ...state, worktreesByRepo: {}, folderWorkspaces: [] },
        run,
        fresh ? selectedAutomationRuns.authority : null
      )
    },
    [capturedAutomationOwners, hostCatalog.entries, selectedAutomationRuns]
  )
  const selectedAutomationRunsWithWorkspaceNames = useMemo(
    () =>
      selectedAutomationRuns.runs.map((run) => {
        if (!run.workspaceId || run.workspaceDisplayName?.trim()) {
          return run
        }
        const target = runTargetFor(run)
        const cacheKey = `${selectedAutomationRuns.rowKey}:${selectedAutomationRuns.ownerKey}:${run.id}`
        const displayName =
          target.worktree?.displayName ??
          workspaceNameCacheRef.current.get(cacheKey) ??
          getWorktreePathBasenameFromId(run.workspaceId)
        if (target.worktree?.displayName) {
          workspaceNameCacheRef.current.set(cacheKey, target.worktree.displayName)
        }
        return displayName?.trim() ? { ...run, workspaceDisplayName: displayName.trim() } : run
      }),
    [runTargetFor, selectedAutomationRuns, workspaceNameCacheRef]
  )
  // Pass locale into the sort memo because collation can change without row writes.
  const sortLocale = intlLocale
  const sortedListItems = useMemo(
    () =>
      sortAutomationListViewItems(
        buildAutomationListViewItems({ rows: filteredRows }),
        listSort,
        sortLocale
      ),
    [filteredRows, listSort, sortLocale]
  )

  return {
    hostCatalog,
    unscopedRows,
    visibleRows,
    capturedAutomationOwners,
    selectedRow,
    selected,
    selectedAutomationRunsWithWorkspaceNames,
    runTargetFor,
    isListSearchQueryTooLarge,
    filteredRows,
    sortedListItems,
    hasListItems,
    hasFilteredListItems,
    searchCounts,
    selectAutomationRow
  }
}

export type AutomationsPageListState = ReturnType<typeof useAutomationsPageListState>
