export type LocalTasksApi = {
  list: (args?: { repoPath?: string; parentId?: string | null }) => Promise<unknown>
  get: (args: { id: string }) => Promise<unknown>
  create: (args: {
    title: string
    status?: string
    priority?: string
    description?: string
    labelIds?: string[]
    parentId?: string
    repoPath?: string
  }) => Promise<unknown>
  update: (args: {
    id: string
    title?: string
    status?: string
    priority?: string
    description?: string
    labelIds?: string[]
    parentId?: string
    repoPath?: string
  }) => Promise<unknown>
  delete: (args: { id: string }) => Promise<unknown>
}

export type LocalTaskLabelsApi = {
  list: () => Promise<unknown>
  create: (args: { name: string; color: string }) => Promise<unknown>
  update: (args: { id: string; name?: string; color?: string }) => Promise<unknown>
  delete: (args: { id: string }) => Promise<unknown>
}

export type LocalTaskCommentsApi = {
  list: (args: { taskId: string }) => Promise<unknown>
  create: (args: { taskId: string; content: string }) => Promise<unknown>
  delete: (args: { id: string }) => Promise<unknown>
}

export type LocalTaskActivitiesApi = {
  list: (args: { taskId: string }) => Promise<unknown>
}
