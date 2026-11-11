import { describe, it, expect } from 'vitest'
import {
  remoteSessionContentLines,
  streamedSessionContentLines
} from './remote-session-content-lines'

async function* bytes(data: Buffer | string, size = 3) {
  const b = typeof data === 'string' ? Buffer.from(data) : data
  for (let i = 0; i < b.length; i += size) {
    yield b.subarray(i, i + size)
  }
}
async function lines(content: Iterable<string> | AsyncIterable<string>) {
  const result: string[] = []
  for await (const line of content) {
    result.push(line)
  }
  return result
}

describe('independent JSON boundary review', () => {
  it('does not turn a bare carriage return into a JSONL record boundary', async () => {
    const content = '{"role":"user","content":"first"}\r{"role":"assistant","content":"second"}'
    expect(await lines(streamedSessionContentLines(bytes(content)))).toEqual(
      await lines(remoteSessionContentLines(content))
    )
  })
})
