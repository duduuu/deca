import { browserGuestRegistrationAndDownloadsApi } from './browser-bridge-guest-registration-and-downloads'
import { browserPageInteractionAndSessionsApi } from './browser-bridge-page-interaction-and-sessions'
import { browserRemoteHostControlApi } from './browser-bridge-remote-host-control'
import type { PreloadApi } from '../../api-types'

export const browserApi = {
  ...browserGuestRegistrationAndDownloadsApi,
  ...browserPageInteractionAndSessionsApi,
  ...browserRemoteHostControlApi
} satisfies PreloadApi['browser']
