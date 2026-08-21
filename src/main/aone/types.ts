// Type shapes for `a1 -f json` outputs we consume. Hand-derived from real
// captures (see /Users/liyang/.qoder/plans/clever-crest-gudgeon.md for samples).
// Keep these minimal — only fields the UI actually renders — and additive,
// since a1 may grow its JSON surface without notice.

export type A1WorkItemCategory = 'Req' | 'Bug' | 'Task' | 'Risk' | 'NodeflowNode' | (string & {})

export type A1WorkItem = {
  identifier: string
  subject: string
  status: string
  assignedTo?: string | null
  creator?: string | null
  workitemType?: string | null
  categoryIdentifier?: A1WorkItemCategory | null
  spaceIdentifier?: string | null
  gmtModified?: string | null
  gmtCreate?: string | null
}

export type A1MergeRequestState = 'opened' | 'closed' | 'merged' | (string & {})

export type A1MergeRequestUser = {
  id?: number | null
  name?: string | null
  username?: string | null
}

export type A1MergeRequestCheckResult = {
  total_check_result?: 'satisfied' | 'unsatisfied' | (string & {}) | null
  satisfied_check_results?: readonly unknown[]
  unsatisfied_check_results?: readonly unknown[]
}

export type A1MergeRequest = {
  id: number
  iid: number
  title: string
  description?: string | null
  state: A1MergeRequestState
  sourceBranch: string
  targetBranch: string
  webUrl?: string | null
  detailUrl?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  author?: A1MergeRequestUser | null
  assignees?: readonly A1MergeRequestUser[] | null
  mergeStatus?: string | null
  projectPath?: string | null
  isConflicted?: boolean | null
  workInProgress?: boolean | null
  qualityScanStatus?: string | null
  approveCheckResult?: A1MergeRequestCheckResult | null
}

export type A1MergeRequestViewPayload = A1MergeRequest | { mergeRequest: A1MergeRequest | null }

export type A1LinkStatus = {
  repo?: { path?: string | null; webUrl?: string | null } | null
  app?: { name?: string | null; id?: string | null } | null
  project?: { id?: string | null; name?: string | null } | null
}

export type A1MergeRequestComment = {
  id: number
  body?: string | null
  note?: string | null
  author?: A1MergeRequestUser | null
  createdAt?: string | null
  updatedAt?: string | null
  resolved?: boolean | null
  closed?: boolean | number | null
  filePath?: string | null
  path?: string | null
  line?: number | null
  outdated?: boolean | null
  parentId?: number | null
  type?: 'inline' | 'global' | 'reply' | (string & {}) | null
}

export type A1MergeRequestDiffFile = {
  newPath?: string | null
  oldPath?: string | null
  newFile?: boolean | null
  renamedFile?: boolean | null
  deletedFile?: boolean | null
  additions?: number | null
  deletions?: number | null
  diff?: string | null
}

export type A1MergeRequestStatusBlocker = {
  type?: string | null
  message?: string | null
  level?: 'error' | 'warning' | 'info' | (string & {}) | null
}

export type A1MergeRequestStatus = {
  mergeStatus?: string | null
  ciStatus?: string | null
  approveStatus?: string | null
  blockers?: readonly A1MergeRequestStatusBlocker[] | null
}
