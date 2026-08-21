// Translation layer: Aone `a1` CLI shapes -> GitHub-flavored renderer types.
// The renderer was built around GitHub's PR/review model. To keep the UI
// untouched while routing through `a1` for Aone Code repos, we adapt each
// a1 JSON payload back into the matching `PRInfo` / `PRComment` shape.
// GitHub-only fields without an Aone equivalent are filled with safe defaults
// (e.g. mergeable=UNKNOWN, autoMerge*=false/null) so existing UI behaves.

import type {
  CheckStatus,
  GitHubCommentResult,
  PRComment,
  PRInfo,
  PRMergeableState,
  PRState
} from '../../shared/types'
import type { A1MergeRequest, A1MergeRequestComment, A1MergeRequestStatus } from './types'

function mapA1State(state: string | undefined): PRState {
  if (state === 'merged') {
    return 'merged'
  }
  if (state === 'closed') {
    return 'closed'
  }
  return 'open'
}

function mapMergeable(mr: A1MergeRequest): PRMergeableState {
  if (mr.isConflicted === true) {
    return 'CONFLICTING'
  }
  const merge = (mr.mergeStatus ?? '').toLowerCase()
  if (merge.includes('can_be_merged') || merge === 'mergeable') {
    return 'MERGEABLE'
  }
  if (merge.includes('conflict')) {
    return 'CONFLICTING'
  }
  return 'UNKNOWN'
}

function mapChecksStatus(mr: A1MergeRequest): CheckStatus {
  const scan = (mr.qualityScanStatus ?? '').toLowerCase()
  if (scan === 'passed' || scan === 'success') {
    return 'success'
  }
  if (scan === 'failed' || scan === 'failure') {
    return 'failure'
  }
  if (scan === 'pending' || scan === 'running') {
    return 'pending'
  }
  return 'neutral'
}

function mapWebUrl(mr: A1MergeRequest): string {
  return mr.detailUrl?.trim() || mr.webUrl?.trim() || ''
}

export function mapA1MergeRequestToPRInfo(mr: A1MergeRequest): PRInfo {
  const state = mr.workInProgress === true ? 'draft' : mapA1State(mr.state)
  return {
    // a1 MR commands take the unique MR `id`; `iid` is deprecated on Aone Code.
    number: mr.id,
    title: mr.title,
    state,
    url: mapWebUrl(mr),
    checksStatus: mapChecksStatus(mr),
    updatedAt: mr.updatedAt ?? mr.createdAt ?? new Date().toISOString(),
    mergeable: mapMergeable(mr),
    reviewDecision: null,
    autoMergeEnabled: false,
    autoMergeAllowed: null,
    mergeQueueRequired: null,
    mergeStateStatus: mr.mergeStatus ?? null,
    baseRefName: mr.targetBranch
  }
}

export function mapA1StatusOntoPRInfo(base: PRInfo, status: A1MergeRequestStatus | null): PRInfo {
  if (!status) {
    return base
  }
  const ci = (status.ciStatus ?? '').toLowerCase()
  const checks: CheckStatus =
    ci === 'success' || ci === 'passed'
      ? 'success'
      : ci === 'failure' || ci === 'failed'
        ? 'failure'
        : ci === 'pending' || ci === 'running'
          ? 'pending'
          : base.checksStatus
  const merge = (status.mergeStatus ?? '').toLowerCase()
  const mergeable: PRMergeableState = merge.includes('can_be_merged')
    ? 'MERGEABLE'
    : merge.includes('conflict')
      ? 'CONFLICTING'
      : base.mergeable
  return {
    ...base,
    checksStatus: checks,
    mergeable,
    mergeStateStatus: status.mergeStatus ?? base.mergeStateStatus
  }
}

function mapA1Author(author: A1MergeRequestComment['author']): string {
  if (!author) {
    return ''
  }
  return author.name ?? author.username ?? (author.id != null ? String(author.id) : '')
}

export function mapA1CommentToPRComment(comment: A1MergeRequestComment): PRComment {
  const body = comment.body ?? comment.note ?? ''
  const path = comment.filePath ?? comment.path ?? undefined
  const isResolved =
    comment.resolved === true || comment.closed === true || comment.closed === 1 ? true : undefined
  return {
    id: comment.id,
    author: mapA1Author(comment.author),
    authorAvatarUrl: '',
    body,
    createdAt: comment.createdAt ?? comment.updatedAt ?? new Date().toISOString(),
    url: '',
    path,
    line: typeof comment.line === 'number' ? comment.line : undefined,
    isResolved,
    isOutdated: comment.outdated === true ? true : undefined
  }
}

export function mapA1CommentsToPRComments(comments: readonly A1MergeRequestComment[]): PRComment[] {
  return comments.map(mapA1CommentToPRComment)
}

export function buildA1CommentResult(
  ok: boolean,
  error: string,
  fallbackBody: string
): GitHubCommentResult {
  if (!ok) {
    return { ok: false, error }
  }
  // a1 mr comment create does not echo the created comment in JSON. Return a
  // synthesized placeholder so the renderer can append optimistically; a
  // subsequent listMRComments refresh produces the canonical record.
  const placeholder: PRComment = {
    id: Date.now(),
    author: '',
    authorAvatarUrl: '',
    body: fallbackBody,
    createdAt: new Date().toISOString(),
    url: ''
  }
  return { ok: true, comment: placeholder }
}
