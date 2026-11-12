import {
  localAccountRuntimeTargetKey,
  type LocalAccountRuntimeTarget
} from '../../../shared/local-account-runtime'
import type { BrowserWindow } from 'electron'
import { RateLimitServiceAccountRefresh } from './service-account-refresh'
import type { AntigravityAccountUsageRecorder } from '../providers/antigravity/antigravity-account-usage'
import {
  type CodexAccountSelectionTarget,
  normalizeCodexAccountSelectionTarget
} from '../../../shared/codex-selection-lane'
import type {
  CodexHomePathResolver,
  ClaudeAuthPreparationResolver,
  OpenCodeGoRateLimitConfig,
  AntigravityUsageEnabledResolver,
  InactiveCodexAccountInfo
} from './service-types'
import {
  type ClaudeAccountSelectionTarget,
  normalizeClaudeAccountSelectionTarget
} from '../../claude-accounts/runtime-selection'
import type { InactiveClaudeAccount } from '../providers/claude/claude-managed-account-usage'
import type { RateLimitState } from '../../../shared/rate-limit-types'
import type { NetworkProxySettings } from '../../../shared/network-proxy'

export class RateLimitService extends RateLimitServiceAccountRefresh {
  setCodexHomePathResolver(resolver: CodexHomePathResolver): void {
    this.codexHomePathResolver = resolver
  }

  setCodexFetchTarget(target?: CodexAccountSelectionTarget): void {
    this.codexFetchTarget = normalizeCodexAccountSelectionTarget(target)
  }

  setClaudeAuthPreparationResolver(resolver: ClaudeAuthPreparationResolver): void {
    this.claudeAuthPreparationResolver = resolver
  }

  setClaudeFetchTarget(target?: ClaudeAccountSelectionTarget): void {
    this.claudeFetchTarget = normalizeClaudeAccountSelectionTarget(target)
  }

  setOpenCodeGoConfigResolver(
    resolver: () => OpenCodeGoRateLimitConfig,
    apiKeyResolver?: () => string | null
  ): void {
    this.openCodeGoConfigResolver = resolver
    this.openCodeGoApiKeyResolver = apiKeyResolver ?? null
  }

  setAntigravityUsageEnabledResolver(resolver: AntigravityUsageEnabledResolver): void {
    this.antigravityUsageEnabledResolver = resolver
  }

  setAntigravityFetchTarget(target: LocalAccountRuntimeTarget): void {
    if (
      localAccountRuntimeTargetKey(target) ===
      localAccountRuntimeTargetKey(this.antigravityFetchTarget)
    ) {
      return
    }
    this.antigravityFetchTarget = { ...target }
    this.antigravityFetchGeneration += 1
    this.antigravityAccounts = []
    this.activeFailureStreakByProvider.antigravity = 0
    this.updateState({ ...this.state, antigravity: null })
  }

  setAntigravityAccountUsageRecorder(recorder: AntigravityAccountUsageRecorder): void {
    this.antigravityAccountUsageRecorder = recorder
  }

  setNetworkProxySettingsResolver(resolver: () => NetworkProxySettings): void {
    this.networkProxySettingsResolver = resolver
  }

  setInactiveClaudeAccountsResolver(resolver: () => InactiveClaudeAccount[]): void {
    this.inactiveClaudeAccountsResolver = resolver
    this.inactiveClaudeAccountsGeneration += 1
  }

  setInactiveCodexAccountsResolver(resolver: () => InactiveCodexAccountInfo[]): void {
    this.inactiveCodexAccountsResolver = resolver
    this.inactiveCodexAccountsGeneration += 1
    this.pruneInactiveCodexState()
  }
  attach(mainWindow: BrowserWindow): void {
    this.detachWindowListeners?.()
    this.mainWindow = mainWindow
    const refreshOnResume = (): void => {
      void this.refreshIfWatched()
    }
    // Replacing windows must also detach the old closed listener.
    const detachWindowListeners = (): void => {
      mainWindow.removeListener('focus', refreshOnResume)
      mainWindow.removeListener('show', refreshOnResume)
      mainWindow.removeListener('restore', refreshOnResume)
      mainWindow.removeListener('closed', onClosed)
    }
    const onClosed = (): void => {
      detachWindowListeners()
      if (this.detachWindowListeners === detachWindowListeners) {
        this.detachWindowListeners = null
      }
      if (this.mainWindow === mainWindow) {
        this.mainWindow = null
      }
    }
    mainWindow.on('focus', refreshOnResume)
    mainWindow.on('show', refreshOnResume)
    mainWindow.on('restore', refreshOnResume)
    mainWindow.on('closed', onClosed)
    this.detachWindowListeners = detachWindowListeners
    // Quota probes spawn CLIs/use network; defer past first paint, then show/focus refresh.
    this.scheduleDeferredStartupRefresh()
  }

  /** Counts a paired client's usage stream so polls run without a focused window; returns its release. */
  addUsageViewer(): () => void {
    this.usageViewers += 1
    let released = false
    return () => {
      if (!released) {
        released = true
        this.usageViewers -= 1
      }
    }
  }

  start(options: { fetchImmediately?: boolean } = {}): void {
    if (options.fetchImmediately !== false) {
      this.clearDeferredStartupRefresh()
      void this.fetchAll()
    } else {
      this.scheduleDeferredStartupRefresh()
    }
    this.startTimer()
  }

  stop(): void {
    this.abortActiveFetchCycle()
    this.clearQueuedFetches()
    this.inactiveClaudeFetching.clear()
    this.inactiveCodexFetching.clear()
    this.resolveAndClearFetchIdleWaiters()
    this.stopTimer()
    this.clearDeferredStartupRefresh()
    this.detachWindowListeners?.()
    this.detachWindowListeners = null
    this.mainWindow = null
  }

  getState(): RateLimitState {
    this.pruneInactiveClaudeState()
    this.pruneInactiveCodexState()
    return {
      ...this.state,
      opencodeGoApiKeyConfigured: this.openCodeGoApiKeyConfigured,
      grokAuthConfigured: this.grokAuthConfigured,
      cursorAuthConfigured: this.cursorAuthConfigured,
      claudeTarget: this.claudeFetchTarget,
      codexTarget: this.codexFetchTarget,
      inactiveClaudeAccounts: this.buildInactiveArray(
        this.inactiveClaudeCache,
        this.inactiveClaudeFetching
      ),
      inactiveCodexAccounts: this.buildInactiveArray(
        this.inactiveCodexCache,
        this.inactiveCodexFetching
      ),
      antigravityAccounts: this.antigravityAccounts
    }
  }
}
