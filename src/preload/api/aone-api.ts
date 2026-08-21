export type AoneApi = {
  getStatus: () => Promise<unknown>
  listWorkItems: (args?: unknown) => Promise<unknown>
  getWorkItem: (args: { identifier: string }) => Promise<unknown>
  listMergeRequests: (args?: unknown) => Promise<unknown>
  getMergeRequest: (args: { id: number } | { iid: number }) => Promise<unknown>
  getMergeRequestForBranch: (args: { branch: string; repoPath?: string | null }) => Promise<unknown>
  getMergeRequestForRepositoryCurrentBranch: (args: {
    repoPath: string
    lookupMergeRequest?: boolean
  }) => Promise<unknown>
  getWeeklyReportDelivery: (args: { branch: string; repoPath: string }) => Promise<unknown>
  listMRComments: (args: {
    mr: number
    resolved?: boolean
    unresolved?: boolean
    repoPath?: string | null
  }) => Promise<unknown>
  createMRComment: (args: {
    mr: number
    body: string
    filePath?: string | null
    line?: number | null
    replyTo?: number | null
    repoPath?: string | null
  }) => Promise<unknown>
  resolveMRComment: (args: {
    mr: number
    commentId: number
    repoPath?: string | null
  }) => Promise<unknown>
  mergeMR: (args: {
    mr: number
    method?: string
    deleteSourceBranch?: boolean
    message?: string | null
    repoPath?: string | null
  }) => Promise<unknown>
  closeMR: (args: { mr: number; repoPath?: string | null }) => Promise<unknown>
  reopenMR: (args: { mr: number; repoPath?: string | null }) => Promise<unknown>
  editMR: (args: {
    mr: number
    title?: string
    description?: string
    assignees?: string[]
    repoPath?: string | null
  }) => Promise<unknown>
  getMRStatus: (args: { mr: number; repoPath?: string | null }) => Promise<unknown>
  getMRStatusForBranch: (args: {
    source: string
    target?: string | null
    repoPath?: string | null
  }) => Promise<unknown>
  listMRDiffFiles: (args: { mr: number; repoPath?: string | null }) => Promise<unknown>
  getMRFileDiff: (args: {
    mr: number
    filePath: string
    context?: number
    repoPath?: string | null
  }) => Promise<unknown>
  getMRWithExtras: (args: {
    mr: number
    extras?: { workItems?: boolean; cr?: boolean; files?: boolean; ci?: boolean }
    repoPath?: string | null
  }) => Promise<unknown>
}
