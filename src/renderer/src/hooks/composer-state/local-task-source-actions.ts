import type { ComposerModel } from './composer-model'

type LocalTaskSourceActionsInput = Pick<
  ComposerModel,
  | 'branchAutoNameRef'
  | 'lastAutoNameRef'
  | 'name'
  | 'setBaseBranch'
  | 'setBranchNameOverride'
  | 'setBranchNameOverridePreservesNameEdits'
  | 'setCompareBaseRef'
  | 'setForkPushWarning'
  | 'setLinkedGitLabIssue'
  | 'setLinkedGitLabMR'
  | 'setLinkedIssue'
  | 'setLinkedPR'
  | 'setLinkedTaskSourceContext'
  | 'setLinkedWorkItem'
  | 'setName'
  | 'setPushTarget'
>

import { useCallback } from 'react'
import type { LocalTask } from '../../../../shared/local-task-types'
import { getLinkedWorkItemWorkspaceName } from '@/lib/new-workspace'
import { shouldApplyWorkspaceSourceAutoName } from '../../../../shared/new-workspace/workspace-source'
import { buildLocalTaskLinkedWorkItem } from '@/lib/local-task-linked-work-item'

export function useLocalTaskSourceActions(input: LocalTaskSourceActionsInput) {
  const {
    branchAutoNameRef,
    lastAutoNameRef,
    name,
    setBaseBranch,
    setBranchNameOverride,
    setBranchNameOverridePreservesNameEdits,
    setCompareBaseRef,
    setForkPushWarning,
    setLinkedGitLabIssue,
    setLinkedGitLabMR,
    setLinkedIssue,
    setLinkedPR,
    setLinkedTaskSourceContext,
    setLinkedWorkItem,
    setName,
    setPushTarget
  } = input

  const handleSmartLocalTaskSelect = useCallback(
    (task: LocalTask): void => {
      const linkedItem = buildLocalTaskLinkedWorkItem(task)
      setLinkedIssue('')
      setLinkedPR(null)
      setLinkedGitLabIssue(null)
      setLinkedGitLabMR(null)
      setBaseBranch(undefined)
      setCompareBaseRef(undefined)
      setPushTarget(undefined)
      setBranchNameOverride(undefined)
      setBranchNameOverridePreservesNameEdits(false)
      setForkPushWarning(null)
      branchAutoNameRef.current = ''
      setLinkedWorkItem(linkedItem)
      setLinkedTaskSourceContext(null)
      const suggestedName = getLinkedWorkItemWorkspaceName(linkedItem)?.seedName ?? task.title
      if (
        shouldApplyWorkspaceSourceAutoName({
          currentName: name,
          lastAutoName: lastAutoNameRef.current
        })
      ) {
        setName(suggestedName)
        lastAutoNameRef.current = suggestedName
      }
    },
    [
      name,
      branchAutoNameRef,
      lastAutoNameRef,
      setBaseBranch,
      setBranchNameOverride,
      setBranchNameOverridePreservesNameEdits,
      setCompareBaseRef,
      setForkPushWarning,
      setLinkedGitLabIssue,
      setLinkedGitLabMR,
      setLinkedIssue,
      setLinkedPR,
      setLinkedTaskSourceContext,
      setLinkedWorkItem,
      setName,
      setPushTarget
    ]
  )

  return { handleSmartLocalTaskSelect }
}
