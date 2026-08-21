import type { PRInfo } from '../../../../shared/github/pull-request-types'
import type { HostedReviewInfo } from '../../../../shared/hosted-review'
import { hostedReviewInfoFromGitHubPRInfo } from '../../../../shared/hosted-review-github'

export type ChecksPanelReview = HostedReviewInfo

export type ChecksPanelReviewSelectionInput = {
  hostedReview: HostedReviewInfo | null | undefined
  pr: PRInfo | null | undefined
  linkedGitLabMR: number | null
  linkedBitbucketPR: number | null
  linkedAzureDevOpsPR: number | null
  linkedGiteaPR: number | null
  linkedCodeMR?: number | null
}

export function gitHubPRToChecksPanelReview(pr: PRInfo): ChecksPanelReview {
  // Why: the checks panel must not maintain a second GitHub PR metadata mapper;
  // merge-state fields drifting here regressed the right-sidebar action label.
  return hostedReviewInfoFromGitHubPRInfo(pr)
}

export function selectChecksPanelReview({
  hostedReview,
  pr,
  linkedGitLabMR,
  linkedBitbucketPR,
  linkedAzureDevOpsPR,
  linkedGiteaPR,
  linkedCodeMR
}: ChecksPanelReviewSelectionInput): ChecksPanelReview | null {
  const mergeRequestHostedReview =
    hostedReview?.provider === 'gitlab' || hostedReview?.provider === 'code' ? hostedReview : null
  if (mergeRequestHostedReview) {
    return mergeRequestHostedReview
  }
  const hasNonGitHubLinkedReview =
    linkedGitLabMR != null ||
    linkedBitbucketPR != null ||
    linkedAzureDevOpsPR != null ||
    linkedGiteaPR != null ||
    linkedCodeMR != null
  if (hasNonGitHubLinkedReview) {
    return null
  }
  return pr ? gitHubPRToChecksPanelReview(pr) : null
}
