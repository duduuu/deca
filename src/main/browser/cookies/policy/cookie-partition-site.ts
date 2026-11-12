/** A cookie's partition site, reduced to a bare http(s) origin; null when it isn't one. */
export function normalizeCookiePartitionSite(raw: string): string | null {
  try {
    const site = new URL(raw)
    if (
      (site.protocol !== 'http:' && site.protocol !== 'https:') ||
      !site.hostname ||
      site.username ||
      site.password ||
      site.port ||
      site.pathname !== '/' ||
      site.search ||
      site.hash
    ) {
      return null
    }
    return site.origin
  } catch {
    return null
  }
}
