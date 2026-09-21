import { useCallback, useEffect } from 'react'
import {
  checksPanelAsyncResultKey,
  checksPanelHostedReviewAsyncResultKey
} from '../checks-panel-async-result-key'
import { loadGitLabJobLogDetails } from '@/runtime/gitlab-job-trace-client'
import type { PRCheckDetail } from '../../../../../shared/github/check-types'
import type { PRInfo } from '../../../../../shared/github/pull-request-types'

import type { ChecksPanelContextState } from './use-checks-panel-context-state'
import type { ChecksPanelControllerState } from './use-checks-panel-controller-state'
import type { ChecksPanelComposerState } from './use-checks-panel-composer-state'

type ChecksPanelReviewDataInput = Pick<
  ChecksPanelContextState,
  'activeCodeReview' | 'activeGitLabReview' | 'hostedReviewCacheKey' | 'pr' | 'prCacheKey' | 'prNumber'
> &
  Pick<
    ChecksPanelControllerState,
    | 'branch'
    | 'fetchPRCheckDetails'
    | 'fetchPRComments'
    | 'gitLabProjectRefRef'
    | 'isPanelVisible'
    | 'repo'
    | 'settings'
    | 'setChecks'
    | 'setComments'
    | 'setCommentsLoading'
  > &
  Pick<ChecksPanelComposerState, 'isCurrentAsyncResult'>

export function useChecksPanelReviewData(model: ChecksPanelReviewDataInput) {
  const {
    activeCodeReview,
    activeGitLabReview,
    branch,
    fetchPRCheckDetails,
    fetchPRComments,
    gitLabProjectRefRef,
    hostedReviewCacheKey,
    isCurrentAsyncResult,
    isPanelVisible,
    pr,
    prCacheKey,
    prNumber,
    repo,
    settings,
    setChecks,
    setComments,
    setCommentsLoading
  } = model
  // Fetch comments once when PR changes (no polling — comments change infrequently).
  const fetchComments = useCallback(
    async ({
      force = false,
      prNumberOverride,
      prRepoOverride
    }: {
      force?: boolean
      prNumberOverride?: number | null
      prRepoOverride?: PRInfo['prRepo'] | null
    } = {}) => {
      const targetPRNumber = prNumberOverride ?? prNumber
      const targetPRRepo = prRepoOverride ?? pr?.prRepo
      if (!repo || !targetPRNumber) {
        return
      }
      setCommentsLoading(true)
      try {
        const requestKey = checksPanelAsyncResultKey(
          prCacheKey,
          branch,
          targetPRNumber,
          targetPRRepo,
          pr?.headSha
        )
        const result = await fetchPRComments(repo.path, targetPRNumber, {
          force,
          repoId: repo.id,
          prRepo: targetPRRepo
        })
        if (!isCurrentAsyncResult(requestKey)) {
          return
        }
        setComments(result)
      } catch (err) {
        if (
          !isCurrentAsyncResult(
            checksPanelAsyncResultKey(prCacheKey, branch, targetPRNumber, targetPRRepo, pr?.headSha)
          )
        ) {
          return
        }
        console.warn('Failed to fetch PR comments:', err)
        setComments([])
      } finally {
        if (
          isCurrentAsyncResult(
            checksPanelAsyncResultKey(prCacheKey, branch, targetPRNumber, targetPRRepo, pr?.headSha)
          )
        ) {
          setCommentsLoading(false)
        }
      }
    },
    [
      repo,
      prNumber,
      pr?.headSha,
      pr?.prRepo,
      prCacheKey,
      fetchPRComments,
      branch,
      isCurrentAsyncResult,
      setCommentsLoading,
      setComments
    ]
  )

  const handleLoadCheckDetails = useCallback(
    (check: PRCheckDetail) => {
      if (!repo) {
        return Promise.resolve(null)
      }
      if (check.gitlabJobId) {
        // Why: `settings` (not ownerSettings) is what fetched the job list, so the
        // job id and its trace always resolve against the same host.
        return loadGitLabJobLogDetails({
          repoPath: repo.path,
          repoId: repo.id,
          settings,
          check,
          projectRef: gitLabProjectRefRef.current
        })
      }
      return fetchPRCheckDetails(
        repo.path,
        {
          checkRunId: check.checkRunId,
          workflowRunId: check.workflowRunId,
          checkName: check.name,
          url: check.url,
          prRepo: pr?.prRepo ?? null
        },
        { repoId: repo.id }
      )
    },
    [fetchPRCheckDetails, pr?.prRepo, repo, settings, gitLabProjectRefRef]
  )

  // Why: read at call time — the ref is filled by an async MR fetch, so a value prop would be stale.
  const getGitLabProjectRef = useCallback(() => gitLabProjectRefRef.current, [gitLabProjectRefRef])

  useEffect(() => {
    if (activeGitLabReview || activeCodeReview) {
      return
    }
    if (!repo || !prNumber || !isPanelVisible) {
      setComments([])
      return
    }
    let cancelled = false
    const requestKey = checksPanelAsyncResultKey(
      prCacheKey,
      branch,
      prNumber,
      pr?.prRepo,
      pr?.headSha
    )
    setCommentsLoading(true)
    void fetchPRComments(repo.path, prNumber, { repoId: repo.id, prRepo: pr?.prRepo }).then(
      (result) => {
        if (!cancelled && isCurrentAsyncResult(requestKey)) {
          setComments(result)
          setCommentsLoading(false)
        }
      },
      () => {
        if (!cancelled && isCurrentAsyncResult(requestKey)) {
          setComments([])
          setCommentsLoading(false)
        }
      }
    )
    return () => {
      cancelled = true
    }
  }, [
    activeCodeReview,
    activeGitLabReview,
    repo,
    prNumber,
    pr?.headSha,
    pr?.prRepo,
    prCacheKey,
    branch,
    isPanelVisible,
    fetchPRComments,
    isCurrentAsyncResult,
    setComments,
    setCommentsLoading
  ])

  // Aone hosted MRs carry no GitHub checks; the panel shows comments only.
  useEffect(() => {
    if (!activeCodeReview || !repo || !isPanelVisible) {
      return
    }
    let cancelled = false
    const requestKey = checksPanelHostedReviewAsyncResultKey(
      hostedReviewCacheKey,
      branch,
      activeCodeReview.provider,
      activeCodeReview.number,
      activeCodeReview.headSha
    )
    setChecks([])
    setCommentsLoading(true)
    void fetchPRComments(repo.path, activeCodeReview.number, { repoId: repo.id }).then(
      (result) => {
        if (!cancelled && isCurrentAsyncResult(requestKey)) {
          setComments(result)
          setCommentsLoading(false)
        }
      },
      () => {
        if (!cancelled && isCurrentAsyncResult(requestKey)) {
          setComments([])
          setCommentsLoading(false)
        }
      }
    )
    return () => {
      cancelled = true
    }
  }, [
    activeCodeReview,
    branch,
    fetchPRComments,
    hostedReviewCacheKey,
    isCurrentAsyncResult,
    isPanelVisible,
    repo,
    setChecks,
    setComments,
    setCommentsLoading
  ])

  useEffect(() => {
    if (activeGitLabReview || activeCodeReview || !repo || !prNumber || !isPanelVisible) {
      return undefined
    }
    return window.api.gh.onWorkItemMutated((payload) => {
      const sameRepo =
        payload.repoId != null ? payload.repoId === repo.id : payload.repoPath === repo.path
      if (!sameRepo || payload.type !== 'pr' || payload.number !== prNumber) {
        return
      }
      void fetchComments({ force: true })
    })
  }, [activeCodeReview, activeGitLabReview, fetchComments, isPanelVisible, prNumber, repo])
  return { fetchComments, handleLoadCheckDetails, getGitLabProjectRef }
}

export type ChecksPanelReviewDataState = ReturnType<typeof useChecksPanelReviewData>
