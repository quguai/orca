const AONE_RATE_LIMIT_WARNING_INTERVAL_MS = 60_000
let lastAoneRateLimitWarningAt = 0

export function logHostedReviewFetchFailure(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('Aone is temporarily rate limiting merge request queries')) {
    // Why: every visible worktree observes the same user-level cooldown; emit
    // one diagnostic instead of repeating an identical stack for every card.
    const now = Date.now()
    if (now - lastAoneRateLimitWarningAt >= AONE_RATE_LIMIT_WARNING_INTERVAL_MS) {
      lastAoneRateLimitWarningAt = now
      console.warn(message)
    }
    return
  }
  console.error('Failed to fetch hosted review:', error)
}
