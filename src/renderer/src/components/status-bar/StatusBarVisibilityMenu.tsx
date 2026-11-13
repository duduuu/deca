import { Activity, Plug, Server } from 'lucide-react'
import React from 'react'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { AgentIcon } from '@/components/agent/icons/AgentIcon'
import { ClaudeIcon, GeminiIcon, OpenAIIcon } from './icons'
import { useTranslate } from '@/i18n/use-translate'
import { isStatusBarItemAvailable } from './status-bar-agent-gating'
import type { StatusBarController } from './use-status-bar-controller'

export function StatusBarVisibilityMenu({
  controller
}: {
  controller: StatusBarController
}): React.JSX.Element {
  const t = useTranslate()
  const {
    detectedAgentIds,
    menuOpen,
    menuPoint,
    recordFeatureInteraction,
    setMenuOpen,
    statusBarItems,
    toggleStatusBarItem
  } = controller

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          aria-hidden
          tabIndex={-1}
          className="pointer-events-none absolute size-px opacity-0"
          style={{ left: menuPoint.x, top: menuPoint.y }}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-0 w-fit" sideOffset={0} align="start">
        {isStatusBarItemAvailable('claude', detectedAgentIds) && (
          <DropdownMenuCheckboxItem
            checked={statusBarItems.includes('claude')}
            onCheckedChange={() => {
              recordFeatureInteraction('usage-tracking')
              toggleStatusBarItem('claude')
            }}
          >
            <ClaudeIcon size={14} />
            {t('auto.components.status.bar.StatusBar.3885eb74d8', 'Claude Usage')}
          </DropdownMenuCheckboxItem>
        )}
        {isStatusBarItemAvailable('codex', detectedAgentIds) && (
          <DropdownMenuCheckboxItem
            checked={statusBarItems.includes('codex')}
            onCheckedChange={() => {
              recordFeatureInteraction('usage-tracking')
              toggleStatusBarItem('codex')
            }}
          >
            <OpenAIIcon size={14} />
            {t('auto.components.status.bar.StatusBar.c0909c686e', 'Codex Usage')}
          </DropdownMenuCheckboxItem>
        )}
        {isStatusBarItemAvailable('gemini', detectedAgentIds) && (
          <DropdownMenuCheckboxItem
            checked={statusBarItems.includes('gemini')}
            onCheckedChange={() => {
              recordFeatureInteraction('usage-tracking')
              toggleStatusBarItem('gemini')
            }}
          >
            <GeminiIcon size={14} />
            {t('auto.components.status.bar.StatusBar.c1df0d67ec', 'Gemini Usage')}
          </DropdownMenuCheckboxItem>
        )}
        {isStatusBarItemAvailable('antigravity', detectedAgentIds) && (
          <DropdownMenuCheckboxItem
            checked={statusBarItems.includes('antigravity')}
            onCheckedChange={() => {
              recordFeatureInteraction('usage-tracking')
              toggleStatusBarItem('antigravity')
            }}
          >
            <AgentIcon agent="antigravity" size={14} />
            {t('auto.components.status.bar.StatusBar.antigravityUsage', 'Antigravity Usage')}
          </DropdownMenuCheckboxItem>
        )}
        <DropdownMenuCheckboxItem
          checked={statusBarItems.includes('ssh')}
          onCheckedChange={() => {
            recordFeatureInteraction('ssh')
            toggleStatusBarItem('ssh')
          }}
        >
          <Server className="size-3.5" />
          {t('auto.components.status.bar.StatusBar.24ac89df1a', 'Remote Hosts')}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={statusBarItems.includes('resource-usage')}
          onCheckedChange={() => {
            recordFeatureInteraction('resource-manager')
            toggleStatusBarItem('resource-usage')
          }}
        >
          <Activity className="size-3.5" />
          {t('auto.components.status.bar.StatusBar.d1e1a7a6bf', 'Resource Manager')}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={statusBarItems.includes('ports')}
          onCheckedChange={() => {
            recordFeatureInteraction('ports')
            toggleStatusBarItem('ports')
          }}
        >
          <Plug className="size-3.5" />
          {t('auto.components.status.bar.StatusBar.9659e38343', 'Ports')}
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
