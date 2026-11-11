import type * as fileOperations from 'node:fs/promises'
import { readFile } from 'node:fs/promises'
import * as contextSnapshots from '../../../../../native-chat/agent-session-context-snapshots'
import { journalPayload } from '../../../../../native-chat/agent-session-journal/item-lifecycle/journal-payload-bounds'
import {
  type AgentJournalItemBody,
  AGENT_JOURNAL_THREAD_SCOPE
} from '../../../../../../shared/agent-session/journal/agent-session-journal-types'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { STRUCTURED_AGENT_SESSION_RUNTIME_CAPABILITY } from '../../../../../../shared/agent-session/agent-session-runtime-capabilities'
import {
  hostTestMessage,
  HOST_TEST_SESSION as SESSION
} from '../../../../../native-chat/agent-session-wire/host/testing/structured-agent-session-host-test-data'
import { setStructuredAgentSessionHost } from '../../../../../native-chat/agent-session-wire/host/structured-agent-session-registry'
import {
  createRestTestRig,
  foundRestTestChat
} from '../../../../../native-chat/agent-session-wire/host/testing/structured-agent-session-rest-test-rig'

import type { RestTestRig } from '../../../../../native-chat/agent-session-wire/host/testing/structured-agent-session-rest-test-rig'
import {
  editPersistedTestAgentSessionStore,
  readPersistedTestAgentSessionStore
} from '../../../../agent-session/records/agent-session-record-store-test-harness'
import { OrcaRuntimeService } from '../../../../orca-runtime'
import type { RpcResponse } from '../../../core'
import { RpcDispatcher } from '../../../dispatcher'
import type { RpcDispatchStreamingOptions } from '../../../dispatcher-stream-options'
import { STRUCTURED_AGENT_SESSION_METHODS } from '../structured-agent-session'

vi.mock('node:fs/promises', { spy: true })
const actualFiles = await vi.importActual<typeof fileOperations>('node:fs/promises')

const CLIENT = {
  clientId: 'device-1',
  clientKind: 'runtime' as const,
  clientCapabilities: [STRUCTURED_AGENT_SESSION_RUNTIME_CAPABILITY],
  connectionId: 'connection-1'
}

let rig: RestTestRig
let dispatcher: RpcDispatcher
let requests = 0

async function call(
  method: string,
  params: unknown,
  client: RpcDispatchStreamingOptions = CLIENT
): Promise<RpcResponse[]> {
  const replies: RpcResponse[] = []
  requests += 1
  await dispatcher.dispatchStreaming(
    { id: `request-${requests}`, authToken: 'token', method, params },
    (raw) => replies.push(JSON.parse(raw) as RpcResponse),
    client
  )
  return replies
}

/** A chat that once ran, reopened by a fresh host: nothing of it is in memory. */
async function restingChat(): Promise<void> {
  await foundRestTestChat(rig)
  await rig.store.replaceSessionOptions({
    sessionId: SESSION,
    fence: rig.store.getRecord(SESSION)!.lease.runtimeFence,
    options: { model: 'gpt-saved', effort: 'high' },
    now: rig.clock.now
  })
  await rig.restart()
  setStructuredAgentSessionHost(rig.host)
  rig.adapter.acquire.mockClear()
  rig.adapter.dispatch.mockClear()
  rig.adapter.readOptions.mockClear()
}

beforeEach(async () => {
  requests = 0
  rig = await createRestTestRig({ idleSweep: { intervalMs: 3_600_000 } })
  setStructuredAgentSessionHost(rig.host)
  const runtime = new OrcaRuntimeService()
  dispatcher = new RpcDispatcher({ runtime, methods: STRUCTURED_AGENT_SESSION_METHODS })
})

afterEach(async () => {
  vi.restoreAllMocks()
  setStructuredAgentSessionHost(null)
  await rig.dispose()
  await actualFiles.rm(contextSnapshots.agentSessionContextSnapshotRoot(rig.root), {
    recursive: true,
    force: true
  })
})

it('hands off bounded tool evidence with the latest conversation while keeping the full saved output', async () => {
  await restingChat()
  await rig.host.journalSnapshot(SESSION)
  const journal = rig.host.collaboratorsForTests().sessions.get(SESSION)!.journal
  const output = `AssertionError: CURRENT PART\nReceived: ${'a'.repeat(200_000)}\nTests: 2 failed`
  const toolOutput = `Error: SAVED_TOOL_FAILURE\n${'b'.repeat(200_000)}\nSAVED_TOOL_OUTPUT_END`
  const bodies: AgentJournalItemBody[] = [
    hostTestMessage('Review the viewer'),
    {
      kind: 'message',
      role: 'assistant',
      blocks: [
        {
          type: 'tool-call',
          name: 'shell',
          input: { command: 'pnpm test viewer.test.ts' },
          callId: 'test'
        },
        { type: 'tool-result', output, callId: 'test', isError: true }
      ]
    },
    {
      kind: 'tool-call',
      name: 'shell',
      input: { command: 'pnpm test saved-viewer.test.ts' },
      callId: 'saved-test',
      state: 'failed',
      output: journalPayload(toolOutput)
    },
    {
      kind: 'message',
      role: 'assistant',
      blocks: [{ type: 'text', text: 'The append resets reader position.' }]
    },
    hostTestMessage('Should we redo the viewer?')
  ]
  for (const [ordinal, body] of bodies.entries()) {
    await journal.appendItem(
      { provider: 'codex', threadId: 'saved-thread', turnId: 'handoff-turn', ordinal },
      body,
      {
        fence: rig.store.getRecord(SESSION)!.lease.runtimeFence,
        turnScope: AGENT_JOURNAL_THREAD_SCOPE
      }
    )
  }
  const context = await rig.host.continuationContext({
    sessionId: SESSION,
    workspaceId: 'workspace-1',
    expectedCursor: journal.cursor()
  })
  if (context.status !== 'current' || !context.transcriptPath) {
    throw new Error('Snapshot missing')
  }
  expect(context.capturedText).toContain('[user] Review the viewer')
  expect(context.capturedText).toContain('[tool shell input preview]')
  expect(context.capturedText).toContain(
    '[tool result error] call=test AssertionError: CURRENT PART'
  )
  expect(context.capturedText).toContain('Tests: 2 failed')
  expect(context.capturedText).toContain('[assistant] The append resets reader position.')
  expect(context.capturedText).toContain('[user] Should we redo the viewer?')
  expect(context.capturedText).not.toContain('a'.repeat(2_000))
  expect(context.capturedText).toContain(
    '[tool shell failed input preview] call=saved-test {"command":"pnpm test saved-viewer.test.ts"}'
  )
  expect(context.capturedText).toContain(
    '[tool result error] call=saved-test Error: SAVED_TOOL_FAILURE'
  )
  expect(context.capturedText).toContain('SAVED_TOOL_OUTPUT_END')
  expect(context.capturedText).not.toContain('b'.repeat(2_000))
  expect(await readFile(context.transcriptPath, 'utf8')).toContain(output)
  expect(await readFile(context.transcriptPath, 'utf8')).toContain(toolOutput)
  expect(rig.adapter.acquire).not.toHaveBeenCalled()
})

it('hands off a readable saved conversation without granting its invalid execution lease authority', async () => {
  await restingChat()
  const { cursor } = await rig.host.journalSnapshot(SESSION)
  await rig.host.flushAllStreamedEvents()
  await editPersistedTestAgentSessionStore(rig.root, (persisted) => {
    Object.assign(persisted.records[SESSION].lease, { minimumNextFence: 'bad' })
  })
  await rig.restart()
  setStructuredAgentSessionHost(rig.host)
  expect(rig.store.getRecord(SESSION)).toBeNull()
  expect(rig.store.getConversation(SESSION)?.location.workspaceId).toBe('workspace-1')
  const saved = (await readPersistedTestAgentSessionStore(rig.root)).records[SESSION]
  const params = { sessionId: SESSION, workspaceId: 'workspace-1', expectedCursor: cursor }
  const result = await rig.host.continuationContext(params)
  expect(result).toMatchObject({
    status: 'current',
    capturedText: expect.stringContaining('hello')
  })
  if (result.status !== 'current' || !result.transcriptPath) {
    throw new Error('Saved conversation snapshot missing')
  }
  expect(await readFile(result.transcriptPath, 'utf8')).toContain('hello')
  expect(await call('agentSession.continuationContext', params)).toMatchObject([
    { ok: true, result }
  ])
  for (const stale of [
    { ...params, workspaceId: 'other' },
    { ...params, expectedCursor: { ...cursor, epoch: 'other' } },
    { ...params, expectedCursor: { ...cursor, sequence: cursor.sequence + 1 } }
  ]) {
    expect(await rig.host.continuationContext(stale)).toEqual({ status: 'superseded' })
  }
  expect(rig.store.getRecord(SESSION)).toBeNull()
  expect((await readPersistedTestAgentSessionStore(rig.root)).records[SESSION]).toEqual(saved)
  expect(rig.adapter.acquire).not.toHaveBeenCalled()
  expect(rig.adapter.dispatch).not.toHaveBeenCalled()
})
