import { join } from 'node:path'
import { readNodeFileSyncWithinLimit } from '../../../shared/file-content/node-bounded-file-reader'
import { getVersionChannel } from '../../../shared/release-channel'
import {
  parseWslHostsPolicy,
  WSL_HOSTS_POLICY_MAX_BYTES,
  type WslHostsPolicy
} from '../../../shared/wsl-hosts-policy'

export type WslHostsPolicyChannel = 'next' | 'stable'

export function wslHostsPolicyChannelForAppVersion(
  appVersion: string
): WslHostsPolicyChannel | null {
  const channel = getVersionChannel(appVersion)
  if (!channel) {
    return null
  }
  return channel === 'stable' ? 'stable' : 'next'
}

// Shared userData must not apply a prerelease-only switch to stable builds.
export function wslHostsPolicyCacheFileName(channel: WslHostsPolicyChannel): string {
  return `wsl-hosts-policy-${channel}.json`
}

function warn(message: string): void {
  console.warn(`[wsl-hosts-policy] ${message}`)
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}

/** A policy an earlier build cached; Deca never downloads one, read synchronously so the startup gate can use it. */
export function readCachedWslHostsPolicy(
  userDataPath: string,
  appVersion: string
): WslHostsPolicy | null {
  const channel = wslHostsPolicyChannelForAppVersion(appVersion)
  if (!channel) {
    return null
  }
  try {
    const { buffer } = readNodeFileSyncWithinLimit(
      join(userDataPath, wslHostsPolicyCacheFileName(channel)),
      WSL_HOSTS_POLICY_MAX_BYTES,
      { regularFileOnly: true }
    )
    const parsed = parseWslHostsPolicy(buffer.toString('utf8'))
    if (!parsed.ok) {
      warn(`cached policy ignored: ${parsed.error}`)
      return null
    }
    return parsed.policy
  } catch (error) {
    if (!isMissingFile(error)) {
      warn(`cached policy unreadable: ${describeError(error)}`)
    }
    return null
  }
}
