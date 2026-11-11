/** Provider terminal proof belongs to the latest imported root, never to prose or a lease. */
export function createImportedForkTip() {
  let items: string[] = []
  let settled = false
  return {
    observe(id: string, role: string, terminal: boolean) {
      if (role === 'user') {
        items = []
        settled = false
      }
      items.push(id)
      if (role === 'assistant' || role === 'tool' || role === 'reasoning' || role === 'terminal') {
        settled = terminal
      }
    },
    settledItems: () => (settled ? items : [])
  }
}
