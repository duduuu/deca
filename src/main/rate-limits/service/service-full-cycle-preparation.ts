import { fetchActiveClaudeRateLimits } from '../providers/claude/claude-active-usage-fetch'
import { fetchCodexRateLimits } from '../providers/codex/codex-fetcher'
import { fetchGeminiRateLimits } from '../providers/gemini/gemini-usage-fetcher'
import { fetchAntigravityRateLimits } from '../providers/antigravity/antigravity-usage-fetcher'
import { antigravityUsageDisabledSnapshot } from '../providers/antigravity/antigravity-usage-snapshot'
import { unreportedUsageSnapshot } from './disabled-usage-snapshot'
import { RateLimitServiceAntigravityAccounts } from './service-antigravity-accounts'
import type { SettledProviderResult } from './service-sibling-provider-result'
import type { ClaudeRuntimeAuthPreparation } from '../../claude-accounts/runtime-auth/runtime-auth-types'
import type { InternalRateLimitState } from './service-types'
import type { NormalizedClaudeAccountSelectionTarget } from '../../claude-accounts/runtime-selection'
import type { NormalizedCodexAccountSelectionTarget } from '../../../shared/codex-selection-lane'
import type { ProviderRateLimits } from '../../../shared/rate-limit-types'

export type FetchAllCyclePrepared = {
  claudeTarget: NormalizedClaudeAccountSelectionTarget
  claudeGeneration: number
  claudeAuthPreparation: ClaudeRuntimeAuthPreparation | undefined
  claudeProvenance: string
  codexTarget: NormalizedCodexAccountSelectionTarget
  previousState: InternalRateLimitState
  codexFetchGated: boolean
  codexStateBeforeFetch: ProviderRateLimits | null
  codexProvenance: string | null
  codexGeneration: number
  opencodeConfigChanged: boolean
  opencodeGeneration: number
  antigravityGeneration: number
  claudeFetchGated: boolean
  results: [
    PromiseSettledResult<ProviderRateLimits>,
    PromiseSettledResult<ProviderRateLimits>,
    PromiseSettledResult<ProviderRateLimits>,
    PromiseSettledResult<ProviderRateLimits>
  ]
  grokResultPromise: Promise<SettledProviderResult>
  cursorResultPromise: Promise<SettledProviderResult>
  antigravityResultPromise: Promise<SettledProviderResult>
}

export abstract class RateLimitServiceFullCyclePreparation extends RateLimitServiceAntigravityAccounts {
  protected async prepareFetchAllCycle(
    signal: AbortSignal,
    options?: { force?: boolean }
  ): Promise<FetchAllCyclePrepared | null> {
    if (signal.aborted) {
      return null
    }
    const claudeTarget = this.claudeFetchTarget
    // Capture before await so a switch invalidates both attribution and result application.
    const claudeGeneration = this.claudeFetchGeneration
    const claudeAuthPreparation = await this.claudeAuthPreparationResolver?.(claudeTarget)
    if (signal.aborted) {
      return null
    }
    this.rememberClaudeAuthSnapshot(claudeAuthPreparation, claudeGeneration, claudeTarget)
    const claudeProvenance = claudeAuthPreparation?.provenance ?? 'system'
    const codexTarget = this.codexFetchTarget
    // Capture before await so a reset invalidates this cycle.
    const codexGeneration = this.codexFetchGeneration
    // Gate only Codex, never siblings, when its runtime is skipped (#STA-4422).
    const codexHome = await this.resolveCodexHome(codexTarget)
    const antigravityFetchAllowed =
      (this.antigravityUsageEnabledResolver?.() ?? true) &&
      (options?.force || !this.shouldSkipAutomatedFetch('antigravity', this.state.antigravity))
    // A login change seen here invalidates before the baseline below, so this read still counts.
    const recorder = antigravityFetchAllowed ? this.antigravityAccountUsageRecorder : null
    const antigravityRead = recorder ? await this.beginAntigravityAccountRead(recorder) : null
    if (signal.aborted) {
      return null
    }
    const previousState = this.state
    const antigravityGeneration = this.antigravityFetchGeneration
    const antigravityTarget = this.antigravityFetchTarget
    const codexFetchGated = codexHome.skip
    const codexHomePath = codexHome.homePath
    const codexStateBeforeFetch =
      previousState.codex?.status === 'fetching' ? null : previousState.codex
    const codexProvenance = codexFetchGated
      ? null
      : this.getCodexProvenance(codexTarget, codexHomePath)
    // Why: OpenCode Go usage is never fetched, so its config never changes mid-session.
    const opencodeConfigChanged = false
    const opencodeGeneration = this.opencodeFetchGeneration

    this.updateState({
      ...previousState,
      claude: this.withFetchingStatus(previousState.claude, 'claude'),
      // A gated slot makes no attempt and cannot settle a fetching chip.
      codex: codexFetchGated
        ? codexStateBeforeFetch
        : this.withFetchingStatus(previousState.codex, 'codex'),
      gemini: this.withFetchingStatus(previousState.gemini, 'gemini'),
      opencodeGo: unreportedUsageSnapshot('opencode-go'),
      antigravity: antigravityFetchAllowed
        ? this.withFetchingStatus(previousState.antigravity, 'antigravity')
        : (previousState.antigravity ?? antigravityUsageDisabledSnapshot()),
      grok: unreportedUsageSnapshot('grok'),
      cursor: unreportedUsageSnapshot('cursor')
    })

    const cursorResultPromise = Promise.resolve({
      status: 'fulfilled',
      value: unreportedUsageSnapshot('cursor')
    } as const)

    // Hidden meters avoid the CLI spawn; the separate promise keeps other providers responsive.
    const antigravityResultPromise = (
      antigravityFetchAllowed
        ? fetchAntigravityRateLimits({ signal, target: antigravityTarget }).then((limits) =>
            this.attributeAntigravityReading(antigravityRead, antigravityGeneration, limits)
          )
        : Promise.resolve(previousState.antigravity ?? antigravityUsageDisabledSnapshot())
    ).then(
      (value) => ({ status: 'fulfilled', value }) as const,
      (reason) => ({ status: 'rejected', reason }) as const
    )

    const missingWslCodexHome =
      codexFetchGated || codexHomePath ? null : this.getMissingWslCodexHomeResult(codexTarget)
    const grokResultPromise = Promise.resolve({
      status: 'fulfilled',
      value: unreportedUsageSnapshot('grok')
    } as const)

    // Live display does not waive automated Retry-After gates.
    const claudeFetchGated =
      !options?.force && this.shouldSkipAutomatedFetch('claude', previousState.claude)

    const [claudeResult, codexResult, geminiResult, opencodeGoResult] = await Promise.allSettled([
      claudeFetchGated
        ? Promise.resolve(previousState.claude as ProviderRateLimits)
        : fetchActiveClaudeRateLimits({
            authPreparation: claudeAuthPreparation,
            allowPtyFallback: this.shouldAllowClaudePtyFallback(claudeAuthPreparation),
            allowUsagePanelSupplement: this.shouldAllowClaudeUsagePanelSupplement(),
            networkProxySettings: this.networkProxySettingsResolver?.(),
            signal
          }),
      codexFetchGated
        ? Promise.resolve(previousState.codex as ProviderRateLimits)
        : (missingWslCodexHome ??
          fetchCodexRateLimits({
            codexHomePath,
            networkProxySettings: this.networkProxySettingsResolver?.(),
            signal
          })),
      fetchGeminiRateLimits(),
      Promise.resolve(unreportedUsageSnapshot('opencode-go'))
    ])

    if (signal.aborted) {
      return null
    }
    return {
      claudeTarget,
      claudeGeneration,
      claudeAuthPreparation,
      claudeProvenance,
      codexTarget,
      previousState,
      codexFetchGated,
      codexStateBeforeFetch,
      codexProvenance,
      codexGeneration,
      opencodeConfigChanged,
      opencodeGeneration,
      antigravityGeneration,
      claudeFetchGated,
      results: [claudeResult, codexResult, geminiResult, opencodeGoResult],
      grokResultPromise,
      cursorResultPromise,
      antigravityResultPromise
    }
  }
}
