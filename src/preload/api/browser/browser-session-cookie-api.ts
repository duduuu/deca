export type BrowserSessionCookieApi = {
  sessionResolvePartition: (args: { profileId: string | null }) => Promise<string | null>
  sessionClearDefaultCookies: () => Promise<boolean>
}
