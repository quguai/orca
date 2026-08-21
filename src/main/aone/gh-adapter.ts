// Aone-side adapters for the gh:* IPC handlers that are routed through
// code-provider-bridge. Each function exposes the GitHub-flavored return
// shape (PRInfo, PRComment[], etc.) but reads/writes via the `a1` CLI.
// Kept separate from gh-shape-mappers.ts so the mapping primitives stay
// pure functions while the I/O lives here.

import { getMergeRequest, getMergeRequestForBranch, isAoneCodeRemoteUrl } from './client'
import {
  closeMergeRequest,
  listMergeRequestComments,
  mergeMergeRequest,
  reopenMergeRequest,
  type A1MergeMethod
} from './task-client'
import { A1Error } from './a1-runner'
import { mapA1CommentsToPRComments, mapA1MergeRequestToPRInfo } from './gh-shape-mappers'
import type { GitHubPullRequestStateUpdate, PRComment, PRInfo } from '../../shared/types'
import type { CodeReviewProviderAdapter } from '../ipc/code-provider-bridge'

const GH_TO_A1_METHOD: Record<'merge' | 'squash' | 'rebase', A1MergeMethod> = {
  merge: 'no-ff',
  squash: 'squash',
  rebase: 'rebase'
}

export async function aonePRForBranch(
  repoPath: string,
  branch: string,
  linkedPRNumber: number | null
): Promise<PRInfo | null> {
  try {
    const mr =
      linkedPRNumber != null
        ? await getMergeRequest(linkedPRNumber, { cwd: repoPath })
        : await getMergeRequestForBranch(branch, { cwd: repoPath })
    return mr ? mapA1MergeRequestToPRInfo(mr) : null
  } catch (error) {
    if (error instanceof A1Error) {
      return null
    }
    throw error
  }
}

export async function aonePRComments(repoPath: string, prNumber: number): Promise<PRComment[]> {
  try {
    const comments = await listMergeRequestComments(prNumber, { cwd: repoPath })
    return mapA1CommentsToPRComments(comments)
  } catch (error) {
    if (error instanceof A1Error) {
      return []
    }
    throw error
  }
}

export async function aoneMergePR(
  repoPath: string,
  prNumber: number,
  method: 'merge' | 'squash' | 'rebase' | undefined
): Promise<{ ok: true } | { ok: false; error: string }> {
  const mapped = method ? GH_TO_A1_METHOD[method] : undefined
  const result = await mergeMergeRequest({ mr: prNumber, method: mapped }, { cwd: repoPath })
  return result.ok ? { ok: true } : { ok: false, error: result.error }
}

export async function aoneUpdatePRState(
  repoPath: string,
  prNumber: number,
  updates: GitHubPullRequestStateUpdate
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result =
    updates.state === 'closed'
      ? await closeMergeRequest(prNumber, { cwd: repoPath })
      : await reopenMergeRequest(prNumber, { cwd: repoPath })
  return result.ok ? { ok: true } : { ok: false, error: result.error }
}

export const aoneCodeReviewProviderAdapter = {
  id: 'code',
  matchesRemoteUrl: isAoneCodeRemoteUrl,
  prForBranch: ({ repoPath, branch, linkedPRNumber }) =>
    aonePRForBranch(repoPath, branch, linkedPRNumber),
  prComments: ({ repoPath, prNumber }) => aonePRComments(repoPath, prNumber),
  mergePR: ({ repoPath, prNumber, method }) => aoneMergePR(repoPath, prNumber, method),
  updatePRState: ({ repoPath, prNumber, updates }) => aoneUpdatePRState(repoPath, prNumber, updates)
} satisfies CodeReviewProviderAdapter
