import type { CommandSpec } from '../args'
import { GLOBAL_FLAGS } from '../args'

export const CHAT_COMMAND_SPECS: CommandSpec[] = [
  {
    path: ['chat', 'rename'],
    summary: 'Rename a chat tab',
    usage: 'deca chat rename [--session <id>] --name <text> [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'session', 'name'],
    notes: [
      '--session takes the chat session id `deca agent launch` prints. Run inside a chat, it defaults to that chat; with --environment it is required.',
      'The name shows in the tab, the sidebar, Session History and on paired phones, the same as renaming the tab by hand.'
    ],
    examples: [
      'deca chat rename --name "Migrate auth to OAuth"',
      'deca chat rename --session <sessionId> --name "Release notes" --json'
    ]
  },
  {
    path: ['chat', 'list'],
    summary: 'List agent chats with their workspace, state and last reply',
    usage: 'deca chat list [--worktree <selector>] [--state <state>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'worktree', 'state'],
    notes: [
      'Lists the top-level chats Orca shows as agent tabs. Terminal agents are read with `deca terminal`.',
      '--state keeps chats in one state: working, blocked, waiting or done.'
    ],
    examples: ['deca chat list --json', 'deca chat list --state working']
  },
  {
    path: ['chat', 'read'],
    summary: 'Read the latest messages of an agent chat',
    usage: 'deca chat read --session <id-or-handle> [--limit <n>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'session', 'limit'],
    notes: [
      '--session takes the session id or handle from `deca chat list` or `deca agent launch`.',
      '--limit is the number of entries shown (messages, tool calls, approvals and questions); the default is 20 and the maximum 100.',
      'Approvals and questions waiting for an answer are marked "waiting for you".'
    ],
    examples: ['deca chat read --session codex_1234 --limit 10']
  },
  {
    path: ['chat', 'send'],
    summary: 'Send a message to an agent chat',
    usage:
      'deca chat send --session <id-or-handle> (--text <text> | --text-file <path|->) [--wait] [--timeout-ms <ms>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'session', 'text', 'text-file', 'wait', 'timeout-ms'],
    notes: [
      'Sends the text as your message, as if typed in the chat. --text-file - reads it from stdin.',
      'While the agent is working, hosts with a message queue hold the message until the turn ends; the result says "queued".',
      '--wait returns once the chat finishes or waits for your answer, with what it did since your message. It exits 1 when the wait times out or the message is held in a stopped queue.',
      'A chat that restarted since it was read refuses the send; read it again and resend.'
    ],
    examples: [
      'deca chat send --session codex_1234 --text "Run the tests, then summarize failures"',
      'deca chat send --session codex_1234 --text "Run the tests" --wait --timeout-ms 600000 --json',
      'cat notes.md | deca chat send --session codex_1234 --text-file -'
    ]
  },
  {
    path: ['chat', 'wait'],
    summary: 'Wait until an agent chat finishes or needs your answer',
    usage: 'deca chat wait --session <id-or-handle> [--timeout-ms <ms>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'session', 'timeout-ms'],
    notes: [
      'Settles on the chat\'s own turn, in `chat list` words: "done", or "blocked" on an approval or question. Background agents it started can still show as working or waiting in `chat list`. "held" and "timeout" exit 1.',
      'Prints what the chat did since the last user message. A wait that times out exits 1.'
    ],
    examples: ['deca chat wait --session codex_1234 --timeout-ms 600000 --json']
  }
]
