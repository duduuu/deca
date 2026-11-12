import { describe, expect, it } from 'vitest'
import {
  CLAUDE_SESSION_OPTION_CATALOG,
  CODEX_SESSION_OPTION_CATALOG
} from './agent-session-option-catalog-claude-codex'

import type { AgentSessionModelCatalogResult } from '../agent-session-wire'
import type { AgentSessionOptionsResult } from './agent-session-options-result'
import {
  applyStructuredAgentSessionModelCatalog,
  applyStructuredAgentSessionOptions,
  commitStructuredAgentSessionOption,
  createStructuredAgentSessionOptionState,
  type StructuredAgentSessionOptionState
} from './structured-agent-session-options'
import {
  canSetStructuredAgentSessionOption,
  structuredAgentSessionOptionSnapshot
} from './structured-agent-session-option-snapshot'
import {
  structuredAgentSessionMessageSelection,
  structuredAgentSessionOptionView,
  structuredAgentSessionSendSelection,
  structuredAgentSessionShownSnapshot
} from './structured-agent-session-option-view'

const levels = (...values: string[]) => values.map((value) => ({ value, label: value }))
const OPUS = { id: 'opus[1m]', label: 'Opus', isDefault: false, efforts: levels('low', 'xhigh') }
const SONNET = { id: 'sonnet', label: 'Sonnet', isDefault: false, efforts: levels('low', 'high') }
// Claude's session-less listing marks no default row.
const LISTED: AgentSessionModelCatalogResult = { origin: 'probe', fetchedAt: 1, models: [OPUS] }
const remembered = { model: 'claude-gone', effort: 'max' }
// Claude Code 2.1.302 lists plain opus and no opus[1m], which still runs.
const CLI302 = [{ ...OPUS, id: 'opus', isDefault: true }, SONNET]

const fresh = () => createStructuredAgentSessionOptionState('claude', CLAUDE_SESSION_OPTION_CATALOG)
const withHostList = (state = fresh(), catalog: AgentSessionModelCatalogResult = LISTED) =>
  applyStructuredAgentSessionModelCatalog(state, CLAUDE_SESSION_OPTION_CATALOG, catalog, {
    newLaunch: true
  })
// A chat's own answer lists its listing's rows plus its own model, named by its id; `listed` are
// the ids its listing names (none from an older host).
const stopped = (
  model: string,
  rows = [OPUS],
  listed = rows.map((row) => row.id),
  effort = 'high'
) =>
  applyStructuredAgentSessionOptions(fresh(), CLAUDE_SESSION_OPTION_CATALOG, {
    models: [...rows, { id: model, label: model, isDefault: false, efforts: [] }],
    listedModelIds: listed,
    current: { model, effort }
  })

function shown(...args: Parameters<typeof structuredAgentSessionOptionView>) {
  const snapshot = structuredAgentSessionOptionSnapshot(structuredAgentSessionOptionView(...args))
  const value = (id: string) => {
    const kind = snapshot.find((descriptor) => descriptor.id === id)?.kind
    return kind?.type === 'select' ? kind.currentValue : undefined
  }
  return { model: value('model'), effort: value('effort') }
}

const carried = (
  state: StructuredAgentSessionOptionState,
  seed?: Readonly<Record<string, string>>,
  picks: Readonly<Record<string, string>> = {}
) => structuredAgentSessionSendSelection(structuredAgentSessionOptionView(state, seed, picks))

describe('a Claude model its CLI no longer lists', () => {
  it('stays the chat model through a refresh and every send, its effort read-only', () => {
    // The incident: a chat on opus[1m] at max, reopened under a CLI that lists only plain opus.
    const restored = withHostList(stopped('opus[1m]', CLI302, undefined, 'max'), {
      ...LISTED,
      models: CLI302
    })
    const refreshed = applyStructuredAgentSessionOptions(restored, CLAUDE_SESSION_OPTION_CATALOG, {
      models: [...CLI302, { id: 'opus[1m]', label: 'opus[1m]', isDefault: false, efforts: [] }],
      listedModelIds: CLI302.map((row) => row.id),
      current: { model: 'opus[1m]', effort: 'max' }
    })
    for (const state of [restored, refreshed]) {
      expect(shown(state, undefined, {})).toEqual({ model: 'opus[1m]', effort: 'max' })
      expect(carried(state)).toEqual({ model: 'opus[1m]', effort: 'max' })
      const snapshot = structuredAgentSessionShownSnapshot(state)
      // No inferred menu: the one level it holds, which nothing can change.
      expect(snapshot.find((entry) => entry.id === 'effort')).toMatchObject({
        settable: false,
        kind: { choices: [{ value: 'max', label: 'max' }] }
      })
    }
  })
})

describe('a Claude chat on the model id an older host lists by alias', () => {
  // Claude Code 2.1.318's list_models rows as hosts before the versioned listing key them: `opus`
  // runs claude-opus-5-5, which the chat saves after its first turn.
  const EFFORTS = levels('low', 'medium', 'high', 'xhigh', 'max')
  const alias = (id: string, resolvedModel: string, extra = {}) => ({
    id,
    label: id,
    resolvedModel,
    isDefault: false,
    efforts: EFFORTS,
    ...extra
  })
  const LISTING = [
    alias('opus', 'claude-opus-5-5', { declaredDefaultEffort: 'medium' }),
    alias('sonnet', 'claude-sonnet-5-5')
  ]
  // The host's own row for the chat's model, as it answers today.
  const placeholder = (id: string) => ({
    id,
    label: id,
    isDefault: false,
    efforts: [],
    effortsKnown: false as const
  })
  const answer = (
    model: string,
    rows = LISTING,
    listed: string[] | null = rows.map((row) => row.id),
    effort?: string
  ): AgentSessionOptionsResult => ({
    models: [...rows, placeholder(model)],
    ...(listed ? { listedModelIds: listed } : {}),
    current: { model, ...(effort ? { effort } : {}) }
  })
  const effortRow = (state: StructuredAgentSessionOptionState) =>
    structuredAgentSessionShownSnapshot(state).find((entry) => entry.id === 'effort')
  const coherent = (result: AgentSessionOptionsResult, rows = LISTING) =>
    applyStructuredAgentSessionOptions(
      applyStructuredAgentSessionModelCatalog(
        fresh(),
        CLAUDE_SESSION_OPTION_CATALOG,
        { origin: 'probe', fetchedAt: 1, models: rows },
        { newLaunch: false, coherentCatalog: true }
      ),
      CLAUDE_SESSION_OPTION_CATALOG,
      result,
      { newLaunch: false, coherentCatalog: true }
    )

  it('offers the alias row’s levels and keeps sending the saved model', () => {
    const answered = answer('claude-opus-5-5', LISTING, null, 'medium')
    for (const state of [
      coherent(answered),
      applyStructuredAgentSessionOptions(fresh(), CLAUDE_SESSION_OPTION_CATALOG, {
        ...answered,
        listedModelIds: ['opus', 'sonnet']
      })
    ]) {
      expect(effortRow(state)).toMatchObject({
        settable: true,
        kind: { currentValue: 'medium', choices: expect.arrayContaining(EFFORTS) }
      })
      expect(canSetStructuredAgentSessionOption(state, 'effort', 'high')).toBe(true)
      expect(carried(state, undefined, { effort: 'high' })).toEqual({
        model: 'claude-opus-5-5',
        effort: 'high'
      })
    }
  })

  it('matches the 1M id only through its own row, an exact row first, then the first alias', () => {
    // `best` is hypothetical: two aliases resolving to one id; no recorded listing has one.
    const oneM = [
      alias('opus[1m]', 'claude-opus-5-5[1m]', { efforts: levels('low', 'high') }),
      alias('best', 'claude-opus-5-5[1m]', { efforts: levels('max') }),
      ...LISTING
    ]
    expect(
      effortRow(coherent(answer('claude-opus-5-5[1m]', oneM, null, 'low'), oneM))
    ).toMatchObject({ settable: true, kind: { choices: levels('low', 'high') } })
    // Listed after the alias that resolves to it, so only exact-first precedence picks it.
    const exact = [
      ...LISTING,
      alias('claude-opus-5-5', 'claude-opus-5-5', { efforts: levels('low', 'max') })
    ]
    expect(effortRow(coherent(answer('claude-opus-5-5', exact, null, 'low'), exact))).toMatchObject(
      {
        kind: { choices: levels('low', 'max') }
      }
    )
  })

  // The next two guard the lookup's fallbacks: neither changes with the fix.
})

describe('what a send carries', () => {
  it('keeps a provisional Codex effort out of capture across a reply and catalog refresh', () => {
    const catalog: AgentSessionModelCatalogResult = {
      origin: 'probe',
      fetchedAt: 1,
      listingNamesConfiguredModel: true,
      models: [
        {
          id: 'native',
          label: 'Native',
          isDefault: true,
          defaultEffort: 'low',
          efforts: levels('low', 'high')
        }
      ]
    }
    const launch = { newLaunch: true, coherentCatalog: true }
    let state = applyStructuredAgentSessionModelCatalog(
      createStructuredAgentSessionOptionState('codex', CODEX_SESSION_OPTION_CATALOG),
      CODEX_SESSION_OPTION_CATALOG,
      catalog,
      launch
    )
    // Learning the model chooses neither the model nor an effort.
    expect(structuredAgentSessionMessageSelection(state)).toEqual({})
    expect(
      structuredAgentSessionMessageSelection({
        ...state,
        acceptedInputSources: {
          ...state.acceptedInputSources,
          effort: 'saved'
        }
      })
    ).toEqual({})
    state = applyStructuredAgentSessionOptions(
      state,
      CODEX_SESSION_OPTION_CATALOG,
      {
        models: [],
        current: { model: 'native', defaulted: [], acceptedInputSources: { model: 'saved' } }
      },
      launch
    )
    const recorded = structuredClone(state.record.values)
    for (const defaultEffort of ['low', 'high', undefined]) {
      state = applyStructuredAgentSessionModelCatalog(
        state,
        CODEX_SESSION_OPTION_CATALOG,
        {
          ...catalog,
          models: catalog.models.map((row) => ({ ...row, defaultEffort }))
        },
        launch
      )
      const effort = structuredAgentSessionShownSnapshot(state).find((row) => row.id === 'effort')
      expect(effort?.kind.currentValue).toBe(defaultEffort)
      expect(effort?.valueSource).toBe(defaultEffort ? 'default' : 'unknown')
      expect(
        structuredAgentSessionOptionSnapshot(state).find((row) => row.id === 'effort')?.kind
          .currentValue
      ).toBeUndefined()
      expect(structuredAgentSessionMessageSelection(state)).toEqual({ model: 'native' })
      expect(state.record.values).toEqual(recorded)
    }
    state.record.values.model = { value: 'unlisted', source: 'dispatched' }
    expect(
      structuredAgentSessionShownSnapshot(state).find((row) => row.id === 'effort')
    ).toBeUndefined()
  })

  it('treats older-host policy effort as observation while retaining literal input', () => {
    const result: AgentSessionOptionsResult = {
      models: [{ ...SONNET, defaultEffort: 'high', declaredDefaultEffort: 'low' }],
      current: {
        model: 'sonnet',
        effort: 'high',
        defaulted: [],
        acceptedInputSources: { model: 'policy', effort: 'policy' }
      }
    }
    const state = applyStructuredAgentSessionOptions(fresh(), CLAUDE_SESSION_OPTION_CATALOG, result)
    expect(
      structuredAgentSessionShownSnapshot(state).find((row) => row.id === 'effort')?.kind
        .currentValue
    ).toBe('low')
    expect(structuredAgentSessionMessageSelection(state)).toEqual({ model: 'sonnet' })
    expect(structuredAgentSessionSendSelection(state)).toEqual({ model: 'sonnet' })
    for (const source of ['saved', 'seeded'] as const) {
      const accepted = applyStructuredAgentSessionOptions(fresh(), CLAUDE_SESSION_OPTION_CATALOG, {
        ...result,
        current: {
          ...result.current,
          effort: 'vendor/custom',
          acceptedInputSources: { model: 'policy', effort: source }
        }
      })
      expect(structuredAgentSessionMessageSelection(accepted).effort).toBe('vendor/custom')
      expect(structuredAgentSessionSendSelection(accepted)?.effort).toBe('vendor/custom')
    }
    expect(result.current.effort).toBe('high')
    expect(result.current.acceptedInputSources?.effort).toBe('policy')
  })

  it('captures literal accepted effort independently of reports, aliases and missing catalog rows', () => {
    const literal = { model: 'opus[1m]', effort: 'vendor/custom' }
    let state = applyStructuredAgentSessionOptions(fresh(), CLAUDE_SESSION_OPTION_CATALOG, {
      models: CLI302,
      current: {
        model: 'claude-opus-5-5[1m]',
        effort: 'high',
        confirmed: ['effort'],
        acceptedInputSources: { model: 'saved' },
        defaulted: []
      }
    })
    expect(structuredAgentSessionSendSelection(state)).toEqual({ model: 'claude-opus-5-5[1m]' })
    const picked = commitStructuredAgentSessionOption(state, 'effort', literal.effort)
    for (const view of [
      picked,
      structuredAgentSessionOptionView(withHostList(), literal, {}),
      structuredAgentSessionOptionView(state, undefined, literal)
    ]) {
      expect(structuredAgentSessionMessageSelection(view).effort).toBe(literal.effort)
      expect(structuredAgentSessionSendSelection(view)?.effort).toBe(literal.effort)
    }
    state = applyStructuredAgentSessionOptions(state, CLAUDE_SESSION_OPTION_CATALOG, {
      models: [],
      current: {
        ...literal,
        acceptedInputSources: { model: 'saved', effort: 'saved' },
        defaulted: []
      }
    })
    const capture = structuredAgentSessionMessageSelection(state)
    state = commitStructuredAgentSessionOption(state, 'model', 'retired-unlisted')
    expect(structuredAgentSessionMessageSelection(state)).toEqual({
      ...literal,
      model: 'retired-unlisted'
    })
    expect(capture).toEqual(literal)
    const absent = { ...state, record: { ...state.record, values: {} } }
    expect(structuredAgentSessionMessageSelection(absent)).not.toHaveProperty('effort')
    expect(structuredAgentSessionSendSelection(absent)).toBeUndefined()
  })

  it('carries held picks without committing them to the chat', () => {
    const listed = withHostList(fresh(), { ...LISTED, models: [OPUS, SONNET] })
    const originalRecord = structuredClone(listed.record)
    const view = structuredAgentSessionOptionView(listed, remembered, {
      model: 'sonnet',
      effort: 'high'
    })
    expect(structuredAgentSessionSendSelection(view)).toEqual({ model: 'sonnet', effort: 'high' })
    expect(view.record).not.toBe(listed.record)
    expect(listed.record).toEqual(originalRecord)
    expect(carried(listed, remembered, { model: 'sonnet' })).toEqual({
      model: 'sonnet',
      effort: 'max'
    })
    expect(carried(withHostList(), undefined, { model: 'claude-retired' })).toEqual({
      model: 'claude-retired'
    })
  })
})

describe("a chat's model and effort, apart from the defaults filling them in", () => {
  const listed = CLI302.map((row) => row.id)
  // A resumed chat at rest that never picked a model: its host fills in the listing's default.
  const resumed = (defaulted?: readonly ('model' | 'effort')[]) =>
    applyStructuredAgentSessionOptions(
      applyStructuredAgentSessionModelCatalog(
        fresh(),
        CLAUDE_SESSION_OPTION_CATALOG,
        { ...LISTED, models: CLI302 },
        { newLaunch: false }
      ),
      CLAUDE_SESSION_OPTION_CATALOG,
      {
        models: CLI302,
        listedModelIds: listed,
        current: { model: 'opus', effort: 'low', ...(defaulted ? { defaulted } : {}) }
      }
    )

  it("names a resumed chat's defaults but never sends them, only its picks", () => {
    const state = resumed(['model', 'effort'])
    expect(shown(state, undefined, {})).toEqual({ model: 'opus', effort: 'low' })
    expect(carried(state)).toBeUndefined()
    const effort = commitStructuredAgentSessionOption(state, 'effort', 'xhigh')
    expect(carried(effort)).toEqual({ effort: 'xhigh' })
  })
})
