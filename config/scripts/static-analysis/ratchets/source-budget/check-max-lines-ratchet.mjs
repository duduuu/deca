import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { readTrackedSources, runEntryRatchet } from '../../ratchet-baseline/ratchet-baseline.mjs'

// Ratchet gate for the oxlint `max-lines` rule.
//
// oxlint already fails any file that exceeds max-lines WITHOUT a suppression, so
// the only way a file grows past the budget is by adding an `eslint/oxlint-disable
// max-lines` comment. This
// check freezes the set of files currently allowed to do that (the baseline) and
// fails CI when a NEW bypass appears — the existing over-limit files are
// grandfathered; new ones must split instead. The baseline may only shrink.

const BASELINE_PATH = 'config/max-lines-baseline.txt'
// Exclude gate/fixtures containing directive text as data or scanning self-flags.
const SELF_FILES = new Set([
  'config/scripts/static-analysis/ratchets/source-budget/check-max-lines-ratchet.mjs'
])

// True if the source contains an eslint/oxlint disable directive listing `max-lines`
// (block or line, bare or compound, with or without a `-- Why:` reason).
export function hasMaxLinesDisable(sourceText) {
  const re = /(?:eslint|oxlint)-disable(?:-next-line|-line)?\b([^\n]*)/g
  let m
  while ((m = re.exec(sourceText)) !== null) {
    let rules = m[1]
    rules = rules.split('--')[0]
    const close = rules.indexOf('*/')
    if (close !== -1) {
      rules = rules.slice(0, close)
    }
    if (/\bmax-lines\b/.test(rules)) {
      return true
    }
  }
  return false
}

export function collectCurrentSuppressions(root = process.cwd()) {
  const sources = readTrackedSources(
    root,
    ['*.ts', '*.tsx', '*.mts', '*.cts', '*.mjs'],
    (rel) => !SELF_FILES.has(rel)
  )
  const entries = [...sources]
    .filter(([, src]) => hasMaxLinesDisable(src))
    .map(([rel]) => `inline ${rel}`)

  return entries.sort()
}

const RATCHET = {
  name: 'max-lines',
  baselinePath: BASELINE_PATH,
  header: [
    '# Files/globs currently allowed to exceed the oxlint `max-lines` budget.',
    '# This is a RATCHET: the list may only SHRINK. Do NOT add entries to get CI green —',
    '# split the oversized file instead.',
    '# Regenerate/prune: pnpm check:max-lines-ratchet --prune   (removes stale entries only)'
  ],
  collect: collectCurrentSuppressions,
  fix: [
    'An `inline` entry added an eslint/oxlint-disable max-lines comment. Orca caps file size (300',
    '.ts/.mts/.cts / 400 .tsx / 600 .mjs / 800 test — non-blank, non-comment lines).',
    'Fix it: SPLIT the file into focused modules — do NOT suppress the rule.'
  ]
}

export function main(root = process.cwd(), arg = undefined) {
  return runEntryRatchet(RATCHET, root, arg)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.cwd(), process.argv[2]))
}
