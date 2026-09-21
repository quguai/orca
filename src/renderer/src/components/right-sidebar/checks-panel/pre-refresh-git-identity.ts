import type { RefObject } from 'react'
import {
  hasChecksPanelGitStatusBranchChanged,
  readChecksPanelRefreshGitIdentitySnapshot,
  shouldCommitChecksPanelGitStatusSnapshot,
  type ChecksPanelGitStatusSnapshot
} from '../checks-panel-git-status-snapshot'
import { getRuntimeGitStatus, getRuntimeGitUpstreamStatus } from '@/runtime/runtime-git-client'
import type { GitPushTarget } from '../../../../../shared/worktree/types'
import type { ChecksPanelControllerState } from './use-checks-panel-controller-state'

type PreRefreshGitIdentityArgs = {
  activeWorktreeId: string | null
  activeWorktreePath: string | null
  activeWorktreePushTarget: GitPushTarget | null
  activeConnectionId: string | null
  branch: string
  gitStatusSnapshot: ChecksPanelGitStatusSnapshot | null
  isFolder: boolean
  ownerSettings: ChecksPanelControllerState['ownerSettings']
  panelContextKey: string
  panelContextKeyRef: RefObject<string>
  isCurrentRequest: () => boolean
  updateWorktreeGitIdentity: ChecksPanelControllerState['updateWorktreeGitIdentity']
  setGitStatusSnapshot: ChecksPanelControllerState['setGitStatusSnapshot']
}

/**
 * Re-read git identity before a manual refresh. Returns 'branch-changed' when
 * the click discovered a terminal branch switch; callers must then let
 * branch-keyed render/effects restart instead of refreshing old PR data.
 */
export async function reconcileChecksPanelGitIdentityBeforeRefresh({
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
}: PreRefreshGitIdentityArgs): Promise<'branch-changed' | 'current'> {
  if (!activeWorktreeId || !activeWorktreePath || isFolder) {
    return 'current'
  }
  const snapshotIdentity = readChecksPanelRefreshGitIdentitySnapshot({
    snapshot: gitStatusSnapshot,
    contextKey: panelContextKey,
    currentBranch: branch
  })
  if (snapshotIdentity.kind === 'changed') {
    updateWorktreeGitIdentity(activeWorktreeId, {
      head: snapshotIdentity.head,
      branch: snapshotIdentity.branch
    })
    return 'branch-changed'
  }
  try {
    const statusContext = {
      settings: ownerSettings,
      worktreeId: activeWorktreeId,
      worktreePath: activeWorktreePath,
      connectionId: activeConnectionId ?? undefined
    }
    const status = await getRuntimeGitStatus(statusContext, {
      admissionTier: 'interactive'
    })
    const observedBranch = status.branch ?? (status.head ? null : undefined)
    updateWorktreeGitIdentity(activeWorktreeId, {
      head: status.head,
      branch: observedBranch
    })
    if (
      observedBranch !== undefined &&
      hasChecksPanelGitStatusBranchChanged({
        observedBranch,
        currentBranch: branch
      })
    ) {
      return 'branch-changed'
    }
    let freshRemoteStatus = status.upstreamStatus
    if (activeWorktreePushTarget) {
      freshRemoteStatus = await getRuntimeGitUpstreamStatus(statusContext, activeWorktreePushTarget)
    } else if (
      !freshRemoteStatus ||
      (freshRemoteStatus.ahead > 0 &&
        freshRemoteStatus.behind > 0 &&
        freshRemoteStatus.behindCommitsArePatchEquivalent === undefined)
    ) {
      freshRemoteStatus = await getRuntimeGitUpstreamStatus(statusContext)
    }
    if (
      isCurrentRequest() &&
      shouldCommitChecksPanelGitStatusSnapshot(panelContextKeyRef.current, panelContextKey)
    ) {
      // Why: the Refresh click already paid for this status read; commit it so empty-state Publish/Create eligibility is fresh.
      setGitStatusSnapshot({
        contextKey: panelContextKey,
        hasUncommittedChanges: status.entries.length > 0,
        remoteStatus: freshRemoteStatus,
        gitIdentity: {
          head: status.head,
          branch: observedBranch
        }
      })
    }
  } catch (error) {
    console.warn('[ChecksPanel] pre-refresh git identity refresh failed', error)
  }
  return 'current'
}
