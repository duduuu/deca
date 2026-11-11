export function pruneOpenCodeFingerprintCache(
  fingerprints: Map<number, string>,
  cap: number
): void {
  if (fingerprints.size <= cap) {
    return
  }
  const keys = [...fingerprints.keys()]
  const newest = keys.sort((a, b) => b - a)
  const keep = new Set(newest.slice(0, cap))
  for (const rowid of fingerprints.keys()) {
    if (!keep.has(rowid)) {
      fingerprints.delete(rowid)
    }
  }
}
