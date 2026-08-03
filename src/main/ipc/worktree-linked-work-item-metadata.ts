import type { Worktree, WorktreeMeta } from '../../shared/types'

type LinkedWorkItemMetadata = Pick<
  Worktree,
  | 'linkedGitLabMR'
  | 'linkedGitLabIssue'
  | 'linkedBitbucketPR'
  | 'linkedAzureDevOpsPR'
  | 'linkedGiteaPR'
  | 'linkedCodeMR'
  | 'linkedLocalTask'
  | 'linkedWorkItem'
  | 'linkedTaskSourceContext'
>

export function getLinkedWorkItemMetadata(meta: WorktreeMeta | undefined): LinkedWorkItemMetadata {
  return {
    linkedGitLabMR: meta?.linkedGitLabMR ?? null,
    linkedGitLabIssue: meta?.linkedGitLabIssue ?? null,
    linkedBitbucketPR: meta?.linkedBitbucketPR ?? null,
    linkedAzureDevOpsPR: meta?.linkedAzureDevOpsPR ?? null,
    linkedGiteaPR: meta?.linkedGiteaPR ?? null,
    linkedCodeMR: meta?.linkedCodeMR ?? null,
    linkedLocalTask: meta?.linkedLocalTask ?? null,
    linkedWorkItem: meta?.linkedWorkItem ?? null,
    linkedTaskSourceContext: meta?.linkedTaskSourceContext ?? null
  }
}
