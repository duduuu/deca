import type { ProviderRateLimits } from '../../../../shared/rate-limit-types'
import { cancelUnreadResponseBody } from '../../../lib/unread-response-body'
import { abortSignalWithTimeout } from '../../../lib/abort-signal-with-timeout'
import {
  CODEX_BACKEND_TIMEOUT_MS,
  getCodexBackendAuthHeaders,
  type CodexBackendRequest
} from './codex-backend-auth'
import type { CodexRateLimitFetchOptions } from './codex-rate-limit-fetch-options'

export type RateLimitResetCredits = {
  availableCount: number
  totalEarnedCount?: number
  nextExpiresAt?: number | null
  credits?: {
    status: string
    expiresAt: number | null
    grantedAt: number | null
  }[]
}

export type RpcRateLimitResetCredits = {
  availableCount?: number
  totalEarnedCount?: number
  nextExpiresAt?: number | null
  credits?: {
    status?: string
    expiresAt?: number | string | null
    grantedAt?: number | string | null
  }[]
} | null

type BackendRateLimitResetCreditsResponse = {
  available_count?: number
  total_earned_count?: number
  credits?: {
    status?: string
    expires_at?: string | null
    granted_at?: string | null
  }[]
}

function parseCreditTimestamp(value: number | string | null | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 10_000_000_000 ? value * 1000 : value
  }
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }
  const trimmed = value.trim()
  const numeric = Number(trimmed)
  if (Number.isFinite(numeric)) {
    return numeric < 10_000_000_000 ? numeric * 1000 : numeric
  }
  const timestamp = Date.parse(trimmed)
  return Number.isFinite(timestamp) ? timestamp : null
}

function normalizeCreditStatus(status: string | undefined): string {
  return status?.toLowerCase() ?? 'unknown'
}

function nextAvailableCreditExpiry(
  credits: RateLimitResetCredits['credits'] | undefined
): number | null {
  const expiries =
    credits
      ?.filter((credit) => credit.status === 'available')
      .map((credit) => credit.expiresAt)
      .filter((expiresAt): expiresAt is number => typeof expiresAt === 'number')
      .sort((a, b) => a - b) ?? []
  return expiries[0] ?? null
}

export function mapRpcRateLimitResetCredits(
  raw: RpcRateLimitResetCredits | undefined
): RateLimitResetCredits | null | undefined {
  if (!raw) {
    return raw
  }
  if (typeof raw.availableCount !== 'number' || !Number.isFinite(raw.availableCount)) {
    return null
  }
  const credits = raw.credits?.map((credit) => ({
    status: normalizeCreditStatus(credit.status),
    expiresAt: parseCreditTimestamp(credit.expiresAt),
    grantedAt: parseCreditTimestamp(credit.grantedAt)
  }))
  return {
    availableCount: Math.max(0, Math.floor(raw.availableCount)),
    ...(typeof raw.totalEarnedCount === 'number' && Number.isFinite(raw.totalEarnedCount)
      ? { totalEarnedCount: Math.max(0, Math.floor(raw.totalEarnedCount)) }
      : {}),
    nextExpiresAt: parseCreditTimestamp(raw.nextExpiresAt) ?? nextAvailableCreditExpiry(credits),
    ...(credits ? { credits } : {})
  }
}

export function mapBackendRateLimitResetCredits(
  raw: BackendRateLimitResetCreditsResponse | null | undefined
): RateLimitResetCredits | null | undefined {
  if (!raw) {
    return raw
  }
  const credits = raw.credits?.map((credit) => ({
    status: normalizeCreditStatus(credit.status),
    expiresAt: parseCreditTimestamp(credit.expires_at),
    grantedAt: parseCreditTimestamp(credit.granted_at)
  }))
  const availableCount =
    typeof raw.available_count === 'number' && Number.isFinite(raw.available_count)
      ? raw.available_count
      : (credits?.filter((credit) => credit.status === 'available').length ?? null)
  if (availableCount === null) {
    return null
  }
  return {
    availableCount: Math.max(0, Math.floor(availableCount)),
    ...(typeof raw.total_earned_count === 'number' && Number.isFinite(raw.total_earned_count)
      ? { totalEarnedCount: Math.max(0, Math.floor(raw.total_earned_count)) }
      : {}),
    nextExpiresAt: nextAvailableCreditExpiry(credits),
    ...(credits ? { credits } : {})
  }
}

function hasCompleteRateLimitResetCredits(
  credits: RateLimitResetCredits | null | undefined
): boolean {
  return Boolean(credits && (credits.availableCount === 0 || credits.nextExpiresAt != null))
}

async function fetchBackendRateLimitResetCredits(
  request: CodexBackendRequest,
  options?: CodexRateLimitFetchOptions
): Promise<RateLimitResetCredits | null> {
  if (options?.signal?.aborted) {
    return null
  }
  const signal = abortSignalWithTimeout(options?.signal, CODEX_BACKEND_TIMEOUT_MS)
  const headers = await getCodexBackendAuthHeaders(options, signal)
  if (!headers || signal.aborted) {
    return null
  }
  const response = await request('https://chatgpt.com/backend-api/wham/rate-limit-reset-credits', {
    headers,
    signal
  })
  if (!response.ok) {
    await cancelUnreadResponseBody(response)
    return null
  }
  const payload = (await response.json()) as BackendRateLimitResetCreditsResponse
  return mapBackendRateLimitResetCredits(payload) ?? null
}

export async function supplementCodexRateLimitResetCredits(
  limits: ProviderRateLimits,
  request: CodexBackendRequest,
  options?: CodexRateLimitFetchOptions
): Promise<ProviderRateLimits> {
  if (
    options?.signal?.aborted ||
    limits.provider !== 'codex' ||
    hasCompleteRateLimitResetCredits(limits.rateLimitResetCredits)
  ) {
    return limits
  }
  try {
    const rateLimitResetCredits = await fetchBackendRateLimitResetCredits(request, options)
    return rateLimitResetCredits === null ? limits : { ...limits, rateLimitResetCredits }
  } catch {
    return limits
  }
}
