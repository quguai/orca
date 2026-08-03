import { net } from 'electron'
import type { ProviderRateLimits, RateLimitWindow } from '../../shared/rate-limit-types'
import {
  clearIdealabCookiesFromKeychain,
  getIdealabCookiesOrLogin,
  performIdealabLogin
} from './idealab-auth'

const IDEALAB_API_URL = 'https://aistudio.alibaba-inc.com/api/ailab/ak/teamapi/getOrCreate'
const DEFAULT_TEAM_CODE = process.env.IDEALAB_TEAM_CODE?.trim() || 'API_TEAM_CODE_148'
const API_TIMEOUT_MS = 15_000
const MONTHLY_WINDOW_MINUTES = 30 * 24 * 60

type IdealabResponse = {
  success?: boolean
  message?: string
  data?: {
    cycleUsedAmount?: number
    cycleAmountLimit?: number
    cycleUsedCount?: number
    cycleCallLimit?: number
  } | null
}

type AuthRequiredResult = {
  authRequired: true
}

function unavailable(error: string): ProviderRateLimits {
  return {
    provider: 'idealab',
    session: null,
    weekly: null,
    monthly: null,
    updatedAt: Date.now(),
    error,
    status: 'unavailable'
  }
}

function failure(error: string): ProviderRateLimits {
  return {
    provider: 'idealab',
    session: null,
    weekly: null,
    monthly: null,
    updatedAt: Date.now(),
    error,
    status: 'error'
  }
}

function buildWindow(used: unknown, limit: unknown): RateLimitWindow | null {
  if (
    typeof used !== 'number' ||
    !Number.isFinite(used) ||
    typeof limit !== 'number' ||
    !Number.isFinite(limit) ||
    limit <= 0
  ) {
    return null
  }
  return {
    usedPercent: Math.min(100, Math.max(0, (used / limit) * 100)),
    windowMinutes: MONTHLY_WINDOW_MINUTES,
    resetsAt: null,
    resetDescription: null
  }
}

function isSuccessResponse(value: unknown): value is IdealabResponse {
  return typeof value === 'object' && value !== null
}

async function requestIdealabUsage(
  cookies: string
): Promise<ProviderRateLimits | AuthRequiredResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  try {
    const response = await net.fetch(IDEALAB_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookies
      },
      body: JSON.stringify({ teamCode: DEFAULT_TEAM_CODE }),
      signal: controller.signal
    })

    if (response.status === 401 || response.status === 403) {
      return { authRequired: true }
    }
    if (response.status >= 300 && response.status < 400) {
      return { authRequired: true }
    }
    if (!response.ok) {
      return failure(`IdeaLab usage request failed (HTTP ${response.status}).`)
    }

    const payload: unknown = await response.json()
    if (!isSuccessResponse(payload)) {
      return failure('IdeaLab usage response was invalid.')
    }
    if (!payload.success) {
      return failure(payload.message?.trim() || 'IdeaLab usage request failed.')
    }
    if (!payload.data) {
      return failure('IdeaLab usage response was empty.')
    }

    const spendWindow = buildWindow(payload.data.cycleUsedAmount, payload.data.cycleAmountLimit)
    const callWindow = buildWindow(payload.data.cycleUsedCount, payload.data.cycleCallLimit)
    const hasData = Boolean(spendWindow || callWindow)

    return {
      provider: 'idealab',
      // Why: OpenUsage prioritizes monthly spend in the overview; keep Orca's
      // primary status-bar segment aligned with that emphasis.
      session: spendWindow,
      weekly: null,
      monthly: callWindow,
      monthlyLabel: callWindow ? 'Monthly Calls' : undefined,
      updatedAt: Date.now(),
      error: hasData ? null : 'IdeaLab quota response did not include monthly limits.',
      status: hasData ? 'ok' : 'error'
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return failure('IdeaLab usage response was invalid.')
    }
    return failure(
      error instanceof Error ? error.message : 'IdeaLab usage request failed. Check your network.'
    )
  } finally {
    clearTimeout(timeout)
  }
}

function isAuthRequiredResult(
  result: ProviderRateLimits | AuthRequiredResult
): result is AuthRequiredResult {
  return 'authRequired' in result
}

export async function fetchIdealabRateLimits(enabled = false): Promise<ProviderRateLimits> {
  if (!enabled) {
    return unavailable('IdeaLab usage is disabled in settings.')
  }

  let cookies: string | null
  try {
    cookies = await getIdealabCookiesOrLogin()
  } catch (error) {
    return unavailable(error instanceof Error ? error.message : 'IdeaLab login failed.')
  }
  if (!cookies) {
    return unavailable('IdeaLab cookies not found. Sign in to IdeaLab first.')
  }

  const result = await requestIdealabUsage(cookies)
  if (!isAuthRequiredResult(result)) {
    return result
  }

  await clearIdealabCookiesFromKeychain()
  try {
    const refreshedCookies = await performIdealabLogin()
    const retriedResult = await requestIdealabUsage(refreshedCookies)
    if (isAuthRequiredResult(retriedResult)) {
      return unavailable('IdeaLab login did not authorize quota access.')
    }
    return retriedResult
  } catch (error) {
    return unavailable(error instanceof Error ? error.message : 'IdeaLab login failed.')
  }
}
