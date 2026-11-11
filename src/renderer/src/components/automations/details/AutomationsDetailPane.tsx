import React from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Automation } from '../../../../../shared/automations/automation-definition'
import type { AutomationRun } from '../../../../../shared/automations/history/automation-run'
import type { Worktree } from '../../../../../shared/worktree/types'
import { AutomationDetail } from './AutomationDetail'
import { AutomationRunHistory } from '../runs/AutomationRunHistory'
import type { AutomationActionNotice } from '../hosts/automation-row-action-dispatch'
import type { AutomationHostRecoveryAction } from '../hosts/automation-host-status-descriptors'
import type { AutomationHostCatalogEntry } from '../hosts/automation-host-catalog-types'
import type { AutomationTargetAvailability } from '../hosts/automation-target-availability-types'
import type { AutomationPaneTab } from '../automation-page-state'
import {
  getAutomationDetailNextTab,
  shouldHandleAutomationDetailEscapeKey,
  shouldHandleAutomationDetailTabArrowKey
} from './automation-detail-tab-navigation'
import { useTranslate } from '@/i18n/use-translate'

type AutomationsDetailPaneProps = {
  selected: Automation | null
  selectedRuns: AutomationRun[]
  /** Set when the selected automation's history read failed; its runs are unknown. */
  selectedRunsNotice: AutomationActionNotice | null
  activePaneTab: AutomationPaneTab
  relativeNow: number
  selectedRepoDisplayName: string
  selectedRepoDefaultBaseRef: string | null
  selectedWorkspaceName: string
  /** Catalog entry the selected row was listed from; absent for legacy unscoped rows. */
  selectedHostEntry: AutomationHostCatalogEntry | null
  hostLabelById: ReadonlyMap<string, string>
  selectedRunNowAvailability: AutomationTargetAvailability | null
  worktreeMap: ReadonlyMap<string, Worktree>
  onActivePaneTabChange: (tab: AutomationPaneTab) => void
  runNow: (automation: Automation) => void
  openEditDialog: (automation: Automation) => void
  migrateAutomation?: (automation: Automation) => void
  isMigrating?: boolean
  toggleAutomation: (automation: Automation) => void
  requestDeleteAutomation: (automation: Automation) => void
  openAutomationRunPage: (run: AutomationRun) => void
  onBackToList: () => void
  recoverSelectedRuns: (action: AutomationHostRecoveryAction) => void
}

export function AutomationsDetailPane({
  selected,
  selectedRuns,
  selectedRunsNotice,
  activePaneTab,
  relativeNow,
  selectedRepoDisplayName,
  selectedRepoDefaultBaseRef,
  selectedWorkspaceName,
  selectedHostEntry,
  hostLabelById,
  selectedRunNowAvailability,
  worktreeMap,
  onActivePaneTabChange,
  runNow,
  openEditDialog,
  migrateAutomation,
  isMigrating,
  toggleAutomation,
  requestDeleteAutomation,
  openAutomationRunPage,
  onBackToList,
  recoverSelectedRuns
}: AutomationsDetailPaneProps): React.JSX.Element {
  const t = useTranslate()
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (shouldHandleAutomationDetailEscapeKey(event)) {
        event.preventDefault()
        onBackToList()
        return
      }

      if (!selected) {
        return
      }

      if (shouldHandleAutomationDetailTabArrowKey(event)) {
        const nextTab = getAutomationDetailNextTab({
          currentTab: activePaneTab,
          key: event.key as 'ArrowLeft' | 'ArrowRight',
          canAccessRuns: Boolean(selected)
        })
        if (nextTab && nextTab !== activePaneTab) {
          event.preventDefault()
          onActivePaneTabChange(nextTab)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activePaneTab, onActivePaneTabChange, onBackToList, selected])

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {
        <Tabs
          value={activePaneTab}
          onValueChange={(value) => onActivePaneTabChange(value as AutomationPaneTab)}
          className="min-h-0 flex-1 gap-0"
        >
          <div
            className="flex shrink-0 items-center gap-2 border-b border-border/50 px-5 py-2"
            data-contextual-tour-target="automations-runs"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onBackToList}
              aria-label={t(
                'auto.components.automations.AutomationsPage.backToList',
                'All automations'
              )}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <TabsList variant="line" className="h-8">
              <TabsTrigger value="overview">
                {t('auto.components.automations.AutomationsPage.bb1b2cd31e', 'Overview')}
              </TabsTrigger>
              <TabsTrigger value="runs" disabled={!selected}>
                {t('auto.components.automations.AutomationsPage.0e110a3469', 'Runs')}{' '}
                {selectedRunsNotice ? null : (
                  <span className="text-xs text-muted-foreground">{selectedRuns.length}</span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="scrollbar-sleek min-h-0 overflow-auto p-5">
            <AutomationDetail
              automation={selected}
              runs={selectedRuns}
              projectName={selectedRepoDisplayName}
              projectDefaultBaseRef={selectedRepoDefaultBaseRef}
              workspaceName={selectedWorkspaceName}
              hostEntry={selectedHostEntry}
              hostLabelById={hostLabelById}
              runNowAvailability={selectedRunNowAvailability}
              now={relativeNow}
              onRunNow={(automation) => void runNow(automation)}
              onEdit={(automation) => void openEditDialog(automation)}
              onMigrate={migrateAutomation}
              isMigrating={isMigrating}
              onToggle={(automation) => void toggleAutomation(automation)}
              onDelete={requestDeleteAutomation}
            />
          </TabsContent>

          <TabsContent value="runs" className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* The history owns the scrolling, so the padding rides a wrapper it can size against. */}
            <div className="flex min-h-0 flex-1 flex-col p-5">
              {selected ? (
                <AutomationRunHistory
                  runs={selectedRuns}
                  automationId={selected.id}
                  worktreeMap={worktreeMap}
                  notice={selectedRunsNotice}
                  onRecoverHistory={recoverSelectedRuns}
                  onOpenRun={openAutomationRunPage}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  {t(
                    'auto.components.automations.AutomationsPage.c3a28c9793',
                    'Select an automation to view runs.'
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      }
    </section>
  )
}
