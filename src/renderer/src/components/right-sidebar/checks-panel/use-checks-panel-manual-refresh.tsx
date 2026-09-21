import { useCallback } from 'react'
import { useAppStore } from '@/store'
import { buildGitHubPRRefreshStateClearToken } from '@/store/github/pr-refresh-state'
import { refreshHostedReviewCard } from '@/store/slices/hosted-review-card-refresh'
import { reconcileChecksPanelGitIdentityBeforeRefresh } from './pre-refresh-git-identity'

import { checksPanelAsyncResultKey } from '../checks-panel-async-result-key'
import { refreshAoneCodeReviewForBranch } from './code-review-refresh'
import { recordChecksPanelPRRefreshBreadcrumb } from '../checks-panel-pr-refresh-breadcrumb'
import type { PRInfo } from '../../../../../shared/github/pull-request-types'
import type { ChecksPanelManualRefreshInput } from './manual-refresh-dependencies'

export function useChecksPanelManualRefresh(model: ChecksPanelManualRefreshInput) {
  const {
    activeConnectionId,
    activeCodeReview,
    activeGitLabReview,
    activeWorktreeId,
    activeWorktreePath,
    activeWorktreePushTarget,
    asyncResultKeyRef,
    branch,
    expireGitHubPRRefreshState,
    fallbackGitHubPRNumber,
    fetchGitLabDetails,
    fetchHostedReviewForBranch,
    fetchPRChecks,
    fetchPRComments,
    fetchPRForBranch,
    gitStatusSnapshot,
    hostedReviewCacheKey,
    isCurrentAsyncResult,
    isFolder,
    isGitLabReviewContext,
    linkedAzureDevOpsPR,
    linkedBitbucketPR,
    linkedGiteaPR,
    linkedCodeMR,
    linkedGitLabMR,
    linkedPR,
    ownerSettings,
    panelContextKey,
    panelContextKeyRef,
    pollIntervalRef,
    pr,
    prCacheKey,
    prNumber,
    prevChecksRef,
    refreshInFlightRef,
    refreshRequestKeyRef,
    repo,
    setChecks,
    setChecksLoading,
    setComments,
    setCommentsLoading,
    setEligibilityRefreshNonce,
    setAoneWorkspaceRefreshGeneration,
    setGitStatusSnapshot,
    setIsRefreshing,
    updateWorktreeGitIdentity
  } = model
  const handleRefresh = useCallback(async () => {
    if (!repo || !branch) {
      return
    }
    if (refreshInFlightRef.current) {
      return
    }
    // Why: button isn't disabled until next render; guard a rapid double-click from starting duplicate git subprocesses.
    refreshInFlightRef.current = true
    const initialRequestKey = checksPanelAsyncResultKey(
      prCacheKey,
      branch,
      prNumber,
      pr?.prRepo,
      pr?.headSha
    )
    const refreshRequestKey = `${activeWorktreeId ?? ''}::${prCacheKey}::${branch}::${Date.now()}::${Math.random()}`
    refreshRequestKeyRef.current = refreshRequestKey
    const isCurrentRequest = (): boolean => refreshRequestKeyRef.current === refreshRequestKey
    const refreshStartedAt = Date.now()
    const refreshProvider = activeCodeReview ? 'code' : isGitLabReviewContext ? 'gitlab' : 'github'
    let refreshOutcome = 'started'
    setIsRefreshing(true)
    recordChecksPanelPRRefreshBreadcrumb({
      event: 'start',
      provider: refreshProvider,
      repoId: repo.id,
      worktreeId: activeWorktreeId,
      branch,
      prCacheKey,
      prNumber: activeGitLabReview?.number ?? activeCodeReview?.number ?? prNumber,
      prState: activeGitLabReview?.state ?? activeCodeReview?.state ?? pr?.state,
      prChecksStatus: pr?.checksStatus,
      refreshState: prCacheKey ? useAppStore.getState().prRefreshStates[prCacheKey] : null
    })
    try {
      const gitIdentity = await reconcileChecksPanelGitIdentityBeforeRefresh({
        activeWorktreeId,
        activeWorktreePath,
        activeWorktreePushTarget,
        activeConnectionId,
        branch,
        gitStatusSnapshot,
        isFolder,
        ownerSettings,
        panelContextKey,
        panelContextKeyRef,
        isCurrentRequest,
        updateWorktreeGitIdentity,
        setGitStatusSnapshot
      })
      if (gitIdentity === 'branch-changed') {
        refreshOutcome = 'branch-changed'
        return
      }
      setAoneWorkspaceRefreshGeneration((generation) => generation + 1)
      if (isGitLabReviewContext) {
        const refreshedReview = await refreshHostedReviewCard(fetchHostedReviewForBranch, {
          repoPath: repo.path,
          repoId: repo.id,
          branch,
          admissionTier: 'interactive',
          linkedGitHubPR: linkedPR,
          fallbackGitHubPR: fallbackGitHubPRNumber,
          linkedGitLabMR,
          linkedBitbucketPR,
          linkedAzureDevOpsPR,
          linkedGiteaPR,
          linkedCodeMR
        })
        if (!isCurrentRequest()) {
          return
        }
        const refreshedGitLabReview =
          refreshedReview?.provider === 'gitlab' ? refreshedReview : activeGitLabReview
        if (refreshedGitLabReview) {
          await fetchGitLabDetails({
            mrNumberOverride: refreshedGitLabReview.number,
            headShaOverride: refreshedGitLabReview.headSha,
            commitAsCurrent: true
          })
          refreshOutcome = 'review'
        } else {
          setChecks([])
          setComments([])
          refreshOutcome = 'no-review'
        }
        return
      }
      const aoneOutcome = await refreshAoneCodeReviewForBranch({
        repoPath: repo.path,
        repoId: repo.id,
        branch,
        hostedReviewCacheKey,
        activeCodeReview,
        linkedReviewNumbers: {
          linkedGitHubPR: linkedPR,
          fallbackGitHubPR: fallbackGitHubPRNumber,
          linkedGitLabMR,
          linkedBitbucketPR,
          linkedAzureDevOpsPR,
          linkedGiteaPR,
          linkedCodeMR
        },
        fetchHostedReviewForBranch,
        fetchPRComments,
        isCurrentRequest,
        isCurrentAsyncResult,
        setAsyncResultKey: (requestKey) => {
          asyncResultKeyRef.current = requestKey
        },
        setChecks,
        setComments,
        setCommentsLoading
      })
      if (aoneOutcome !== null) {
        if (aoneOutcome !== 'stale') {
          refreshOutcome = aoneOutcome
        }
        return
      }
      const refreshStoreState = useAppStore.getState()
      const rawPRRefreshState = refreshStoreState.prRefreshStates[prCacheKey]
      const startedPRRefreshToken = buildGitHubPRRefreshStateClearToken(
        rawPRRefreshState,
        refreshStoreState.prRefreshSequences,
        prCacheKey
      )
      let refreshedPR: PRInfo | null = null
      try {
        refreshedPR = await fetchPRForBranch(repo.path, branch, {
          force: true,
          repoId: repo.id,
          worktreeId: activeWorktreeId ?? undefined,
          linkedPRNumber: linkedPR,
          fallbackPRNumber: fallbackGitHubPRNumber,
          reason: 'manual'
        })
      } finally {
        if (startedPRRefreshToken) {
          expireGitHubPRRefreshState(prCacheKey, startedPRRefreshToken)
        }
      }
      if (!isCurrentRequest()) {
        return
      }
      await refreshHostedReviewCard(fetchHostedReviewForBranch, {
        repoPath: repo.path,
        repoId: repo.id,
        branch,
        admissionTier: 'interactive',
        linkedGitHubPR: linkedPR,
        fallbackGitHubPR: refreshedPR?.number ?? fallbackGitHubPRNumber,
        linkedGitLabMR,
        linkedBitbucketPR,
        linkedAzureDevOpsPR,
        linkedGiteaPR,
        linkedCodeMR
      })
      if (!isCurrentRequest()) {
        return
      }
      if (refreshedPR) {
        refreshOutcome = 'pr'
        const prRequestKey = checksPanelAsyncResultKey(
          prCacheKey,
          branch,
          refreshedPR.number,
          refreshedPR.prRepo,
          refreshedPR.headSha
        )
        if (!isCurrentAsyncResult(initialRequestKey) && !isCurrentRequest()) {
          return
        }
        // Why: a forced refresh can find the PR number before React repaints from prCache; mark this refresh's checks current.
        asyncResultKeyRef.current = prRequestKey
        // Why: pass the refreshed headSha directly; fetchChecks's closure captured a stale one (force-pushes, PR-number changes).
        const refreshedChecks = fetchPRChecks(
          repo.path,
          refreshedPR.number,
          branch,
          refreshedPR.headSha,
          refreshedPR.prRepo,
          { force: true, repoId: repo.id }
        ).then(
          (result) => {
            if (!isCurrentRequest() || !isCurrentAsyncResult(prRequestKey)) {
              return
            }
            setChecks(result)
            const signature = JSON.stringify(
              result.map((c) => `${c.name}:${c.status}:${c.conclusion}`)
            )
            pollIntervalRef.current =
              signature === prevChecksRef.current
                ? Math.min(pollIntervalRef.current * 2, 120_000)
                : 30_000
            prevChecksRef.current = signature
          },
          (err) => {
            if (!isCurrentRequest() || !isCurrentAsyncResult(prRequestKey)) {
              return
            }
            console.warn('Failed to fetch PR checks:', err)
            setChecks([])
          }
        )
        setChecksLoading(true)
        setCommentsLoading(true)
        const refreshedComments = fetchPRComments(repo.path, refreshedPR.number, {
          force: true,
          repoId: repo.id,
          prRepo: refreshedPR.prRepo
        }).then(
          (result) => {
            if (isCurrentRequest() && isCurrentAsyncResult(prRequestKey)) {
              setComments(result)
            }
          },
          (err) => {
            if (!isCurrentRequest() || !isCurrentAsyncResult(prRequestKey)) {
              return
            }
            console.warn('Failed to fetch PR comments:', err)
            setComments([])
          }
        )
        await Promise.all([
          refreshedChecks.finally(() => {
            if (isCurrentRequest() && isCurrentAsyncResult(prRequestKey)) {
              setChecksLoading(false)
            }
          }),
          refreshedComments.finally(() => {
            if (isCurrentRequest() && isCurrentAsyncResult(prRequestKey)) {
              setCommentsLoading(false)
            }
          })
        ])
      } else if (isCurrentRequest()) {
        setChecks([])
        setComments([])
        refreshOutcome = 'no-pr'
      }
    } catch (error) {
      refreshOutcome = 'error'
      throw error
    } finally {
      recordChecksPanelPRRefreshBreadcrumb({
        event: 'done',
        provider: refreshProvider,
        repoId: repo.id,
        worktreeId: activeWorktreeId,
        branch,
        prCacheKey,
        prNumber: activeGitLabReview?.number ?? activeCodeReview?.number ?? prNumber,
        prState: activeGitLabReview?.state ?? activeCodeReview?.state ?? pr?.state,
        prChecksStatus: pr?.checksStatus,
        refreshState: prCacheKey ? useAppStore.getState().prRefreshStates[prCacheKey] : null,
        outcome: refreshOutcome,
        durationMs: Date.now() - refreshStartedAt,
        currentRequest: isCurrentRequest()
      })
      if (isCurrentRequest()) {
        refreshInFlightRef.current = false
        setIsRefreshing(false)
        // Why: force fresh eligibility so a resolved auth failure clears the sticky hard error even when Git state is unchanged.
        setEligibilityRefreshNonce((value) => value + 1)
      }
    }
  }, [
    repo,
    branch,
    activeConnectionId,
    activeWorktreeId,
    activeWorktreePath,
    activeWorktreePushTarget,
    activeGitLabReview,
    activeCodeReview,
    prNumber,
    pr?.checksStatus,
    pr?.headSha,
    pr?.prRepo,
    pr?.state,
    prCacheKey,
    linkedPR,
    fallbackGitHubPRNumber,
    fetchGitLabDetails,
    linkedAzureDevOpsPR,
    linkedBitbucketPR,
    linkedGiteaPR,
    linkedCodeMR,
    linkedGitLabMR,
    isFolder,
    isGitLabReviewContext,
    gitStatusSnapshot,
    hostedReviewCacheKey,
    panelContextKey,
    fetchPRForBranch,
    fetchPRChecks,
    fetchPRComments,
    fetchHostedReviewForBranch,
    expireGitHubPRRefreshState,
    isCurrentAsyncResult,
    ownerSettings,
    updateWorktreeGitIdentity,
    panelContextKeyRef,
    asyncResultKeyRef,
    setCommentsLoading,
    setEligibilityRefreshNonce,
    setAoneWorkspaceRefreshGeneration,
    prevChecksRef,
    setIsRefreshing,
    setChecksLoading,
    refreshRequestKeyRef,
    setChecks,
    setComments,
    setGitStatusSnapshot,
    pollIntervalRef,
    refreshInFlightRef
  ])
  return { handleRefresh }
}

export type ChecksPanelRefreshState = ReturnType<typeof useChecksPanelManualRefresh>
