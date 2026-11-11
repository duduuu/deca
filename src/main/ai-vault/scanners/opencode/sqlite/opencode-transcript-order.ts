/** OpenCode transcript order: creation time, then the row identity that breaks ties. */
export function openCodeTranscriptOrder(
  table: 'message' | 'part',
  alias: 'm' | 'p',
  direction: 'ASC' | 'DESC'
): string {
  return `${alias}.time_created ${direction}, ${alias}.${table === 'message' ? 'id' : 'rowid'} ${direction}`
}
