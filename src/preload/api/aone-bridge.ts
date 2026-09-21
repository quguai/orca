import { ipcRenderer } from 'electron'
import type { AoneApi } from './aone-api'

export const aoneApi: AoneApi = {
  getStatus: (): Promise<unknown> => ipcRenderer.invoke('aone:getStatus'),
  listWorkItems: (args?: unknown): Promise<unknown> =>
    ipcRenderer.invoke('aone:listWorkItems', args),
  getWorkItem: (args: { identifier: string }): Promise<unknown> =>
    ipcRenderer.invoke('aone:getWorkItem', args),
  listMergeRequests: (args?: unknown): Promise<unknown> =>
    ipcRenderer.invoke('aone:listMergeRequests', args),
  getMergeRequest: (args: { id: number } | { iid: number }): Promise<unknown> =>
    ipcRenderer.invoke('aone:getMergeRequest', args),
  getMergeRequestForBranch: (args: {
    branch: string
    repoPath?: string | null
  }): Promise<unknown> => ipcRenderer.invoke('aone:getMergeRequestForBranch', args),
  getMergeRequestForRepositoryCurrentBranch: (args: {
    repoPath: string
    lookupMergeRequest?: boolean
  }): Promise<unknown> =>
    ipcRenderer.invoke('aone:getMergeRequestForRepositoryCurrentBranch', args),
  getWeeklyReportDelivery: (args: { branch: string; repoPath: string }): Promise<unknown> =>
    ipcRenderer.invoke('aone:getWeeklyReportDelivery', args),
  listMRComments: (args: {
    mr: number
    resolved?: boolean
    unresolved?: boolean
    repoPath?: string | null
  }): Promise<unknown> => ipcRenderer.invoke('aone:listMRComments', args),
  createMRComment: (args: {
    mr: number
    body: string
    filePath?: string | null
    line?: number | null
    replyTo?: number | null
    repoPath?: string | null
  }): Promise<unknown> => ipcRenderer.invoke('aone:createMRComment', args),
  resolveMRComment: (args: {
    mr: number
    commentId: number
    repoPath?: string | null
  }): Promise<unknown> => ipcRenderer.invoke('aone:resolveMRComment', args),
  mergeMR: (args: {
    mr: number
    method?: string
    deleteSourceBranch?: boolean
    message?: string | null
    repoPath?: string | null
  }): Promise<unknown> => ipcRenderer.invoke('aone:mergeMR', args),
  closeMR: (args: { mr: number; repoPath?: string | null }): Promise<unknown> =>
    ipcRenderer.invoke('aone:closeMR', args),
  reopenMR: (args: { mr: number; repoPath?: string | null }): Promise<unknown> =>
    ipcRenderer.invoke('aone:reopenMR', args),
  editMR: (args: {
    mr: number
    title?: string
    description?: string
    assignees?: string[]
    repoPath?: string | null
  }): Promise<unknown> => ipcRenderer.invoke('aone:editMR', args),
  getMRStatus: (args: { mr: number; repoPath?: string | null }): Promise<unknown> =>
    ipcRenderer.invoke('aone:getMRStatus', args),
  getMRStatusForBranch: (args: {
    source: string
    target?: string | null
    repoPath?: string | null
  }): Promise<unknown> => ipcRenderer.invoke('aone:getMRStatusForBranch', args),
  listMRDiffFiles: (args: { mr: number; repoPath?: string | null }): Promise<unknown> =>
    ipcRenderer.invoke('aone:listMRDiffFiles', args),
  getMRFileDiff: (args: {
    mr: number
    filePath: string
    context?: number
    repoPath?: string | null
  }): Promise<unknown> => ipcRenderer.invoke('aone:getMRFileDiff', args),
  getMRWithExtras: (args: {
    mr: number
    extras?: { workItems?: boolean; cr?: boolean; files?: boolean; ci?: boolean }
    repoPath?: string | null
  }): Promise<unknown> => ipcRenderer.invoke('aone:getMRWithExtras', args)
}
