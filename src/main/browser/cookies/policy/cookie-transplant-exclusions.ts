import { normalizeCookieDomain } from './cookie-domain'

// Preserve device-bound Google sessions; copying them to another partition breaks them.
// Entries must be canonical lowercase ASCII registrable domains, never public suffixes.
const NON_TRANSPLANTABLE_DOMAINS = ['google.com'] as const

export function isNonTransplantableCookieDomain(domain: string): boolean {
  const normalized = normalizeCookieDomain(domain)
  if (!normalized) {
    return false
  }
  return NON_TRANSPLANTABLE_DOMAINS.some(
    (root) => normalized === root || normalized.endsWith(`.${root}`)
  )
}
