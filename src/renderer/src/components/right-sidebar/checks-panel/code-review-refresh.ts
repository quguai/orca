import type { PRComment } from '../../../../../shared/github/comment-types'
import type { ChecksPanelReview } from '../checks-panel-review'
import { checksPanelHostedReviewAsyncResultKey } from '../checks-panel-async-result-key'
import { refreshHostedReviewCard } from '@/store/slices/hosted-review-card-refresh'
import type { LinkedReviewHints } from '@/store/slices/hosted-review-cache-identity'
import type { PRCheckDetail } from '../../../../../shared/github/check-types'

type FetchHostedReviewForBranch = Parameters<typeof refreshHostedReviewCard>[0]

type RefreshAoneCodeReviewArgs = {
  repoPath: string
  repoId: string
  branch: string
  hostedReviewCacheKey: string
  activeCodeReview: (ChecksPanelReview & { provider: 'code' }) | null
  linkedReviewNumbers: LinkedReviewHints & {
    linkedGitHubPR: number | null
    fallbackGitHubPR: number | null
  }
  fetchHostedReviewForBranch: FetchHostedReviewForBranch
  fetchPRComments: (
    repoPath: string,
    prNumber: number,
    options?: { repoId: string }
  ) => Promise<PRComment[]>
  isCurrentRequest: () => boolean
  isCurrentAsyncResult: (requestKey: string) => boolean
  setAsyncResultKey: (requestKey: string) => void
  setChecks: (checks: PRCheckDetail[]) => void
  setComments: (comments: PRComment[]) => void
  setCommentsLoading: (loading: boolean) => void
}

/**
 * Refresh an Aone Code hosted MR: the review card plus its comments. Aone MRs
 * carry no GitHub checks, so the checks list is cleared rather than refetched.
 * Returns the refresh outcome, 'stale' when the owning request was superseded,
 * or null when the context is not a Code review.
 */
export async function refreshAoneCodeReviewForBranch({
  repoPath,
  repoId,
  branch,
  hostedReviewCacheKey,
  activeCodeReview,
  linkedReviewNumbers,
  fetchHostedReviewForBranch,
  fetchPRComments,
  isCurrentRequest,
  isCurrentAsyncResult,
  setAsyncResultKey,
  setChecks,
  setComments,
  setCommentsLoading
}: RefreshAoneCodeReviewArgs): Promise<'review' | 'no-review' | 'stale' | null> {
  if (!activeCodeReview && (linkedReviewNumbers.linkedCodeMR ?? null) === null) {
    return null
  }
  const refreshedReview = await refreshHostedReviewCard(fetchHostedReviewForBranch, {
    repoPath,
    repoId,
    branch,
    admissionTier: 'interactive',
    ...linkedReviewNumbers
  })
  if (!isCurrentRequest()) {
    return 'stale'
  }
  const refreshedCodeReview =
    refreshedReview?.provider === 'code' ? refreshedReview : activeCodeReview
  if (!refreshedCodeReview) {
    setChecks([])
    setComments([])
    return 'no-review'
  }
  const requestKey = checksPanelHostedReviewAsyncResultKey(
    hostedReviewCacheKey,
    branch,
    refreshedCodeReview.provider,
    refreshedCodeReview.number,
    refreshedCodeReview.headSha
  )
  setAsyncResultKey(requestKey)
  setChecks([])
  setCommentsLoading(true)
  const result = await fetchPRComments(repoPath, refreshedCodeReview.number, { repoId })
  if (isCurrentAsyncResult(requestKey)) {
    setComments(result)
    setCommentsLoading(false)
  }
  return 'review'
}
