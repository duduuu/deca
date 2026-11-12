import { fetchActiveClaudeRateLimits } from '../providers/claude/claude-active-usage-fetch'
import { fetchCodexRateLimits } from '../providers/codex/codex-fetcher'
import { fetchGeminiRateLimits } from '../providers/gemini/gemini-usage-fetcher'
import { fetchGrokRateLimits } from '../providers/grok/grok-fetcher'
import { readGrokAuthSession } from '../providers/grok/grok-auth'
import { fetchCursorRateLimits } from '../providers/cursor/cursor-fetcher'
import { readCursorAuthSession } from '../providers/cursor/cursor-auth'
import { fetchAntigravityRateLimits } from '../providers/antigravity/antigravity-usage-fetcher'
import { antigravityUsageDisabledSnapshot } from '../providers/antigravity/antigravity-usage-snapshot'
import { createHash } from 'node:crypto'
import { fetchOpenCodeGoUsage } from '../providers/opencode-go/opencode-go-usage-source-selection'
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
    const openCodeGoConfig = this.resolveOpenCodeGoConfig()
    const cookie = openCodeGoConfig.sessionCookie
    const workspaceIdOverride = openCodeGoConfig.workspaceIdOverride
    const openCodeGoApiKey = openCodeGoConfig.apiKey
    const openCodeGoApiKeyError = openCodeGoConfig.apiKeyError
    const openCodeGoApiKeyReadSkipped = openCodeGoConfig.apiKeyReadSkipped
    // Probe auth during fetch, not hot renderer/mobile getState calls.
    const grokAuthReadResult = readGrokAuthSession()
    this.grokAuthConfigured = grokAuthReadResult.status === 'ok'

    // Config changes discard old-account usage; hash credentials because only identity changes matter.
    const apiKeyFingerprint = openCodeGoApiKey
      ? createHash('sha256').update(openCodeGoApiKey).digest('hex')
      : ''
    const currentConfigHash = `${cookie}|${workspaceIdOverride}|${apiKeyFingerprint}|${openCodeGoApiKeyError ?? ''}`
    const opencodeConfigChanged = currentConfigHash !== this.lastOpencodeConfigHash
    if (opencodeConfigChanged) {
      this.lastOpencodeConfigHash = currentConfigHash
      this.opencodeFetchGeneration += 1
    }
    const opencodeGeneration = this.opencodeFetchGeneration

    this.updateState({
      ...previousState,
      claude: this.withFetchingStatus(previousState.claude, 'claude'),
      // A gated slot makes no attempt and cannot settle a fetching chip.
      codex: codexFetchGated
        ? codexStateBeforeFetch
        : this.withFetchingStatus(previousState.codex, 'codex'),
      gemini: this.withFetchingStatus(previousState.gemini, 'gemini'),
      opencodeGo: opencodeConfigChanged
        ? this.withFetchingStatus(null, 'opencode-go')
        : this.withFetchingStatus(previousState.opencodeGo, 'opencode-go'),
      antigravity: antigravityFetchAllowed
        ? this.withFetchingStatus(previousState.antigravity, 'antigravity')
        : (previousState.antigravity ?? antigravityUsageDisabledSnapshot()),
      grok: this.withFetchingStatus(previousState.grok, 'grok'),
      cursor: this.withFetchingStatus(previousState.cursor, 'cursor')
    })

    // Async Keychain/worker DB reads must not delay other providers.
    const cursorResultPromise = readCursorAuthSession()
      .then((authReadResult) => {
        this.cursorAuthConfigured = authReadResult.status === 'ok'
        return fetchCursorRateLimits({ signal, authReadResult })
      })
      .then(
        (value) => ({ status: 'fulfilled', value }) as const,
        (reason) => ({ status: 'rejected', reason }) as const
      )

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
    const grokResultPromise = fetchGrokRateLimits({
      signal,
      authReadResult: grokAuthReadResult
    }).then(
      (value) => ({ status: 'fulfilled', value }) as const,
      (reason) => ({ status: 'rejected', reason }) as const
    )

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
      fetchOpenCodeGoUsage({
        settingsApiKey: openCodeGoApiKey,
        // Store/env keys become known only when the fetch resolves them.
        onApiKeyResolved: (resolution) => {
          // A credential change invalidates stale in-flight presence results.
          if (opencodeGeneration !== this.opencodeFetchGeneration) {
            return
          }
          // An undecryptable or briefly unreadable saved key still counts, so the bar stays up.
          this.openCodeGoApiKeyConfigured =
            resolution.status === 'found' ||
            openCodeGoApiKeyError !== null ||
            openCodeGoApiKeyReadSkipped
        },
        cookie,
        workspaceIdOverride: workspaceIdOverride || undefined,
        networkProxySettings: this.networkProxySettingsResolver?.(),
        signal
      })
    ])

    if (signal.aborted) {
      return null
    }
    // Decryption diagnosis fills only an otherwise undiagnosed empty result; preserve actual cookie failures.
    if (
      openCodeGoApiKeyError &&
      opencodeGoResult.status === 'fulfilled' &&
      opencodeGoResult.value.status === 'unavailable'
    ) {
      opencodeGoResult.value = {
        ...opencodeGoResult.value,
        error: openCodeGoApiKeyError,
        status: 'error'
      }
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
