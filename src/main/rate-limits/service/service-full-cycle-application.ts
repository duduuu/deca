import { RateLimitServiceFullCyclePreparation } from './service-full-cycle-preparation'
import { settleSiblingProviderResult } from './service-sibling-provider-result'
import type { ProviderRateLimits } from '../../../shared/rate-limit-types'

function hasKnownProvenanceChange(
  previous: ProviderRateLimits | null,
  fresh: ProviderRateLimits
): boolean {
  const previousProvenance = previous?.usageMetadata?.authProvenance
  const freshProvenance = fresh.usageMetadata?.authProvenance
  return (
    previousProvenance !== undefined &&
    freshProvenance !== undefined &&
    previousProvenance !== freshProvenance
  )
}

export abstract class RateLimitServiceFullCycleApplication extends RateLimitServiceFullCyclePreparation {
  protected async runFetchAllCycle(
    signal: AbortSignal,
    options?: { force?: boolean }
  ): Promise<void> {
    const prepared = await this.prepareFetchAllCycle(signal, options)
    if (!prepared) {
      return
    }
    const {
      claudeTarget,
      claudeGeneration,
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
    } = prepared
    if (signal.aborted) {
      return
    }

    const claude =
      claudeResult.status === 'fulfilled'
        ? claudeResult.value
        : ({
            provider: 'claude',
            session: null,
            weekly: null,
            updatedAt: Date.now(),
            error:
              claudeResult.reason instanceof Error ? claudeResult.reason.message : 'Unknown error',
            status: 'error'
          } satisfies ProviderRateLimits)

    const codex =
      codexResult.status === 'fulfilled'
        ? codexResult.value
        : ({
            provider: 'codex',
            session: null,
            weekly: null,
            updatedAt: Date.now(),
            error:
              codexResult.reason instanceof Error ? codexResult.reason.message : 'Unknown error',
            status: 'error'
          } satisfies ProviderRateLimits)

    const gemini =
      geminiResult.status === 'fulfilled'
        ? geminiResult.value
        : ({
            provider: 'gemini',
            session: null,
            weekly: null,
            updatedAt: Date.now(),
            error:
              geminiResult.reason instanceof Error ? geminiResult.reason.message : 'Unknown error',
            status: 'error'
          } satisfies ProviderRateLimits)

    const opencodeGo =
      opencodeGoResult.status === 'fulfilled'
        ? opencodeGoResult.value
        : ({
            provider: 'opencode-go',
            session: null,
            weekly: null,
            monthly: null,
            updatedAt: Date.now(),
            error:
              opencodeGoResult.reason instanceof Error
                ? opencodeGoResult.reason.message
                : 'Unknown error',
            status: 'error'
          } satisfies ProviderRateLimits)

    const latestCodexHome = await this.resolveCodexHome(codexTarget)
    const latestClaudeAuthPreparation = await this.claudeAuthPreparationResolver?.(claudeTarget)
    if (signal.aborted) {
      return
    }
    const latestClaudeProvenance = latestClaudeAuthPreparation?.provenance ?? 'system'
    // Skips have no provenance and must not reattribute in-flight usage to System Default (#STA-4422).
    const shouldApplyCodex =
      !codexFetchGated &&
      !latestCodexHome.skip &&
      codexGeneration === this.codexFetchGeneration &&
      codexProvenance === this.getCodexProvenance(codexTarget, latestCodexHome.homePath)
    const codexBecameUnavailable =
      !codexFetchGated && latestCodexHome.skip && codexGeneration === this.codexFetchGeneration
    // Gated Claude made no attempt; passthrough must not advance failure or stale-policy clocks.
    const shouldApplyClaude =
      !claudeFetchGated &&
      claudeGeneration === this.claudeFetchGeneration &&
      claudeProvenance === latestClaudeProvenance &&
      this.isSameClaudeTarget(claudeTarget, this.claudeFetchTarget)
    const shouldApplyOpencode = opencodeGeneration === this.opencodeFetchGeneration

    if (shouldApplyClaude) {
      this.trackActiveFailureStreak('claude', claude)
    }
    if (shouldApplyCodex) {
      this.trackActiveFailureStreak('codex', codex)
    }
    this.trackActiveFailureStreak('gemini', gemini)
    if (shouldApplyOpencode) {
      this.trackActiveFailureStreak('opencode-go', opencodeGo)
    }

    // Both generation and provenance must match before an in-flight Codex result can publish.
    this.updateState({
      ...this.state,
      claude: shouldApplyClaude
        ? this.resolveClaudeFetchApply(claude, previousState.claude)
        : this.state.claude,
      codex: shouldApplyCodex
        ? this.applyStalePolicy(codex, previousState.codex)
        : codexBecameUnavailable
          ? codexStateBeforeFetch
          : this.state.codex,
      gemini: this.applyStalePolicy(gemini, previousState.gemini),
      opencodeGo: shouldApplyOpencode
        ? opencodeConfigChanged
          ? opencodeGo
          : this.applyStalePolicy(opencodeGo, previousState.opencodeGo)
        : this.state.opencodeGo
    })

    const [grokSettled, cursorSettled, antigravitySettled] = await Promise.all([
      grokResultPromise,
      cursorResultPromise,
      antigravityResultPromise
    ])
    if (signal.aborted) {
      return
    }
    const grok = settleSiblingProviderResult('grok', grokSettled)
    const cursor = settleSiblingProviderResult('cursor', cursorSettled)
    const antigravity = settleSiblingProviderResult('antigravity', antigravitySettled)
    const shouldApplyAntigravity = antigravityGeneration === this.antigravityFetchGeneration
    // Discard Cursor stale usage only for a known account change; unidentified transient failures retain their last reading.
    const cursorAccountChanged = hasKnownProvenanceChange(previousState.cursor, cursor)
    this.trackActiveFailureStreak('grok', grok)
    this.trackActiveFailureStreak('cursor', cursor)
    if (shouldApplyAntigravity) {
      this.trackActiveFailureStreak('antigravity', antigravity)
    }
    this.updateState({
      ...this.state,
      grok: this.applyStalePolicy(grok, previousState.grok),
      cursor: cursorAccountChanged ? cursor : this.applyStalePolicy(cursor, previousState.cursor),
      // Another runtime's last reading must not stand in for this runtime's failure.
      antigravity: !shouldApplyAntigravity
        ? this.state.antigravity
        : hasKnownProvenanceChange(previousState.antigravity, antigravity)
          ? antigravity
          : this.applyStalePolicy(antigravity, previousState.antigravity)
    })
  }
}
