import type { HostedReviewProvider } from '../../../../shared/hosted-review'

type WorktreeReviewLink = Partial<{
  linkedPR: number
  linkedGitLabMR: number
  linkedBitbucketPR: number
  linkedAzureDevOpsPR: number
  linkedGiteaPR: number
  linkedCodeMR: number
}>

type HostedReviewLookupLink = Partial<{
  linkedGitHubPR: number
  linkedGitLabMR: number
  linkedBitbucketPR: number
  linkedAzureDevOpsPR: number
  linkedGiteaPR: number
  linkedCodeMR: number
}>

export type CreatedHostedReviewLink = {
  worktree: WorktreeReviewLink
  lookup: HostedReviewLookupLink
}

export function resolveCreatedHostedReviewLink(
  provider: HostedReviewProvider,
  number: number
): CreatedHostedReviewLink {
  switch (provider) {
    case 'github':
      return { worktree: { linkedPR: number }, lookup: { linkedGitHubPR: number } }
    case 'gitlab':
      return { worktree: { linkedGitLabMR: number }, lookup: { linkedGitLabMR: number } }
    case 'azure-devops':
      return {
        worktree: { linkedAzureDevOpsPR: number },
        lookup: { linkedAzureDevOpsPR: number }
      }
    case 'gitea':
      return { worktree: { linkedGiteaPR: number }, lookup: { linkedGiteaPR: number } }
    case 'bitbucket':
      return { worktree: { linkedBitbucketPR: number }, lookup: { linkedBitbucketPR: number } }
    case 'code':
      return { worktree: { linkedCodeMR: number }, lookup: { linkedCodeMR: number } }
    case 'unsupported':
      return { worktree: {}, lookup: {} }
  }
}
