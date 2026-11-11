import type { TuiAgent } from '../../agent-launch/catalog/tui-agent'

// Node CLIs whose shims launch a generic script (cli.js, versioned index.js), so
// only the exact install path is an authoritative identity signal.
export const EXACT_NODE_ENTRYPOINT_IDENTITIES: readonly {
  pattern: RegExp
  agent: TuiAgent
  processName: string
}[] = [
  // Cursor's versioned index.js is generic; only its install path distinguishes ordinary Node apps.
  {
    pattern: /(?:^|\/)cursor-agent\/versions\/[^/]+\/index\.js$/,
    agent: 'cursor',
    processName: 'cursor-agent'
  },
  // npm Claude's historical cli.js still appears behind pnpm/yarn/npx shims.
  {
    pattern: /(?:^|\/)node_modules\/@anthropic-ai\/claude-code\/cli\.js$/,
    agent: 'claude',
    processName: 'claude'
  }
]
