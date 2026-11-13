/** Why: Deca never auto-fetches Google favicons or GitHub avatars; they reveal domains and users. */
export function isDecaBlockedRemoteImageUrl(rawUrl: string): boolean {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return false
  }
  const host = url.hostname.toLowerCase()
  if (host === 'www.google.com' || host === 'google.com') {
    return url.pathname === '/s2/favicons'
  }
  if (host === 'avatars.githubusercontent.com') {
    return true
  }
  return host === 'github.com' && /^\/[^/]+\.png$/i.test(url.pathname)
}
