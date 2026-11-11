import type { MobileRelayStatusDetail } from '../../shared/remote-runtime/relay/mobile-relay-status'
import { mainProcessState as state } from './main-process-state'

export function getDesktopRelayStatus(): MobileRelayStatusDetail {
  return { ...state.desktopRelayStatus }
}
