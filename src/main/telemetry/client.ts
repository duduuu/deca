// Deca builds ship no telemetry transport; these no-ops keep upstream call sites compiling unchanged.

import type { EventName, EventProps, OptInVia } from '../../shared/telemetry-events'
import type { Store } from '../persistence/loading-store/store'

let storeRef: Store | null = null

export function initTelemetry(store: Store): void {
  storeRef = store
}

export const isTelemetryInitialized = (): boolean => storeRef !== null

export function isTelemetryEnabled(): boolean {
  return false
}

export function hasTrackedAgentDashboardActiveToday(_props: unknown): boolean {
  return false
}

export function track<N extends EventName>(_name: N, _props: EventProps<N>): boolean {
  return false
}

export async function setOptIn(_via: OptInVia, _optedIn: boolean): Promise<void> {}

export async function persistBannerAcknowledgeWithoutEmitting(): Promise<void> {}

export function trackAppOpenedOnce(): void {}

export async function shutdownTelemetry(): Promise<void> {}
