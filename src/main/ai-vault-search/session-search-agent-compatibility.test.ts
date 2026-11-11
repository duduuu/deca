import { afterEach, expect, test } from 'vitest'
import { fakeSearchService } from '../../shared/ai-vault/search/ai-vault-search-test-fixture'
import { searchSessionService, setSessionSearchService } from './session-search-service-registry'
import './query/session-search-page-cursor'

afterEach(() => setSessionSearchService(null))

test.each(['relay'] as const)(
  'keeps an empty decoder catalog authoritative over both history flags on %s',
  async (transport) => {
    const service = fakeSearchService()
    setSessionSearchService(service)
    expect(
      await searchSessionService(
        {
          query: 'proof',
          supportedAgents: [],
          supportsJcodeHistory: true,
          freshness: 'wait-until-current'
        },
        transport
      )
    ).toMatchObject({ kind: 'results', hits: [], page: { cursor: null, hasMore: false } })
    expect(service.search).toHaveBeenCalledExactlyOnceWith(
      { query: 'proof', limit: 20, freshness: 'wait-until-current' },
      { kind: 'resolved', paths: [''] }
    )
    expect(service.reconcile).toHaveBeenCalledTimes(1)
  }
)
