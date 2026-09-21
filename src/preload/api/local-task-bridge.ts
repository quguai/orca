import { ipcRenderer } from 'electron'
import type {
  LocalTaskActivitiesApi,
  LocalTaskCommentsApi,
  LocalTaskLabelsApi,
  LocalTasksApi
} from './local-task-api'

export const localTasksApi: LocalTasksApi = {
  list: (args?: { repoPath?: string; parentId?: string | null }): Promise<unknown> =>
    ipcRenderer.invoke('localTasks:list', args),
  get: (args: { id: string }): Promise<unknown> => ipcRenderer.invoke('localTasks:get', args),
  create: (args: {
    title: string
    status?: string
    priority?: string
    description?: string
    labelIds?: string[]
    parentId?: string
    repoPath?: string
  }): Promise<unknown> => ipcRenderer.invoke('localTasks:create', args),
  update: (args: {
    id: string
    title?: string
    status?: string
    priority?: string
    description?: string
    labelIds?: string[]
    parentId?: string
    repoPath?: string
  }): Promise<unknown> => ipcRenderer.invoke('localTasks:update', args),
  delete: (args: { id: string }): Promise<unknown> => ipcRenderer.invoke('localTasks:delete', args)
}

export const localTaskLabelsApi: LocalTaskLabelsApi = {
  list: (): Promise<unknown> => ipcRenderer.invoke('localTaskLabels:list'),
  create: (args: { name: string; color: string }): Promise<unknown> =>
    ipcRenderer.invoke('localTaskLabels:create', args),
  update: (args: { id: string; name?: string; color?: string }): Promise<unknown> =>
    ipcRenderer.invoke('localTaskLabels:update', args),
  delete: (args: { id: string }): Promise<unknown> =>
    ipcRenderer.invoke('localTaskLabels:delete', args)
}

export const localTaskCommentsApi: LocalTaskCommentsApi = {
  list: (args: { taskId: string }): Promise<unknown> =>
    ipcRenderer.invoke('localTaskComments:list', args),
  create: (args: { taskId: string; content: string }): Promise<unknown> =>
    ipcRenderer.invoke('localTaskComments:create', args),
  delete: (args: { id: string }): Promise<unknown> =>
    ipcRenderer.invoke('localTaskComments:delete', args)
}

export const localTaskActivitiesApi: LocalTaskActivitiesApi = {
  list: (args: { taskId: string }): Promise<unknown> =>
    ipcRenderer.invoke('localTaskActivities:list', args)
}
