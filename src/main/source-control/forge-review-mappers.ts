import type { HostedReviewInfo } from '../../shared/hosted-review'
import { hostedReviewInfoFromGitHubPRInfo } from '../../shared/hosted-review-github'
import type { CheckStatus, MRInfo, PRInfo, PRMergeableState } from '../../shared/types'
import type { A1MergeRequest } from '../aone/types'
import type { AzureDevOpsPullRequestInfo } from '../azure-devops/pull-request-mappers'
import type { BitbucketPullRequestInfo } from '../bitbucket/pull-request-mappers'
import type { GiteaPullRequestInfo } from '../gitea/pull-request-mappers'

export function mapGitHubReview(pr: PRInfo): HostedReviewInfo {
  return hostedReviewInfoFromGitHubPRInfo(pr)
}

function mapGitLabReviewState(state: MRInfo['state']): HostedReviewInfo['state'] {
  if (state === 'opened' || state === 'locked') {
    return 'open'
  }
  return state
}

export function mapGitLabReview(mr: MRInfo): HostedReviewInfo {
  return {
    provider: 'gitlab',
    number: mr.number,
    title: mr.title,
    state: mapGitLabReviewState(mr.state),
    url: mr.url,
    status: mr.pipelineStatus,
    updatedAt: mr.updatedAt,
    mergeable: mr.mergeable,
    ...(mr.mergeStateStatus !== undefined ? { mergeStateStatus: mr.mergeStateStatus } : {}),
    ...(mr.headSha ? { headSha: mr.headSha } : {}),
    ...(mr.conflictSummary ? { conflictSummary: mr.conflictSummary } : {})
  }
}

export function mapBitbucketReview(pr: BitbucketPullRequestInfo): HostedReviewInfo {
  return {
    provider: 'bitbucket',
    number: pr.number,
    title: pr.title,
    state: pr.state,
    url: pr.url,
    status: pr.status,
    updatedAt: pr.updatedAt,
    mergeable: pr.mergeable,
    ...(pr.headSha ? { headSha: pr.headSha } : {})
  }
}

export function mapAzureDevOpsReview(pr: AzureDevOpsPullRequestInfo): HostedReviewInfo {
  return {
    provider: 'azure-devops',
    number: pr.number,
    title: pr.title,
    state: pr.state,
    url: pr.url,
    status: pr.status,
    updatedAt: pr.updatedAt,
    mergeable: pr.mergeable,
    ...(pr.headSha ? { headSha: pr.headSha } : {})
  }
}

export function mapGiteaReview(pr: GiteaPullRequestInfo): HostedReviewInfo {
  return {
    provider: 'gitea',
    number: pr.number,
    title: pr.title,
    state: pr.state,
    url: pr.url,
    status: pr.status,
    updatedAt: pr.updatedAt,
    mergeable: pr.mergeable,
    ...(pr.headSha ? { headSha: pr.headSha } : {})
  }
}

function mapCodeReviewState(state: string): HostedReviewInfo['state'] {
  if (state === 'opened') {
    return 'open'
  }
  if (state === 'merged') {
    return 'merged'
  }
  return 'closed'
}

function mapCodeCheckStatus(check: string | null | undefined): CheckStatus {
  if (check === 'satisfied') {
    return 'success'
  }
  if (check === 'unsatisfied') {
    return 'failure'
  }
  return 'pending'
}

function mapCodeMergeable(mr: A1MergeRequest): PRMergeableState {
  if (mr.isConflicted) {
    return 'CONFLICTING'
  }
  if (mr.mergeStatus === 'can_be_merged') {
    return 'MERGEABLE'
  }
  return 'UNKNOWN'
}

export function mapCodeReview(mr: A1MergeRequest): HostedReviewInfo {
  return {
    provider: 'code',
    // a1 MR commands take the unique MR `id`; keep hosted review links executable.
    number: mr.id,
    title: mr.title,
    state: mapCodeReviewState(mr.state),
    url: mr.webUrl || mr.detailUrl || '',
    status: mapCodeCheckStatus(mr.approveCheckResult?.total_check_result),
    updatedAt: mr.updatedAt ?? '',
    mergeable: mapCodeMergeable(mr),
    baseRefName: mr.targetBranch
  }
}
