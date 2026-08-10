import { z } from 'zod'
import {
  getLocalTaskDisplayId,
  type LocalTask,
  type LocalTaskLabel
} from '../../../../shared/local-task-types'
import type {
  RuntimeLocalTaskListResult,
  RuntimeLocalTaskRecord,
  RuntimeLocalTaskShowResult
} from '../../../../shared/local-task-rpc-types'
import { readData, type LocalTasksFileV3 } from '../../../local-tasks/store'
import { defineMethod, InvalidArgumentError, type RpcMethod } from '../core'

const LIST_PARAMS = z.object({
  includeArchived: z.boolean().default(false)
})

const SHOW_PARAMS = z.object({
  id: z.string().trim().min(1, 'Missing local task id')
})

function expandTask(task: LocalTask, labelsById: ReadonlyMap<string, LocalTaskLabel>) {
  return {
    ...task,
    displayId: getLocalTaskDisplayId(task.id),
    labels: (task.labelIds ?? []).flatMap((id) => {
      const label = labelsById.get(id)
      return label ? [label] : []
    })
  } satisfies RuntimeLocalTaskRecord
}

function resolveTask(data: LocalTasksFileV3, selector: string): LocalTask {
  const normalized = selector.toLowerCase()
  const exact = data.tasks.find((task) => task.id.toLowerCase() === normalized)
  if (exact) {
    return exact
  }

  const prefix = normalized.startsWith('lt-') ? normalized.slice(3) : normalized
  if (prefix.length < 6 || !/^[0-9a-f-]+$/.test(prefix)) {
    throw new InvalidArgumentError(`Invalid local task id: ${selector}`)
  }
  const matches = data.tasks.filter((task) => task.id.toLowerCase().startsWith(prefix))
  if (matches.length === 1) {
    return matches[0]
  }
  if (matches.length > 1) {
    throw new InvalidArgumentError(`Ambiguous local task id: ${selector}; use the full UUID`)
  }
  throw new InvalidArgumentError(`Local task not found: ${selector}`)
}

export const LOCAL_TASK_METHODS: RpcMethod[] = [
  defineMethod({
    name: 'localTasks.list',
    params: LIST_PARAMS,
    handler: (params): RuntimeLocalTaskListResult => {
      const data = readData()
      const labelsById = new Map(data.labels.map((label) => [label.id, label]))
      const tasks = [...data.tasks]
        .filter((task) => params.includeArchived || task.archivedAt === undefined)
        .sort((left, right) => right.updatedAt - left.updatedAt)
        .map((task) => expandTask(task, labelsById))
      return { tasks }
    }
  }),
  defineMethod({
    name: 'localTasks.show',
    params: SHOW_PARAMS,
    handler: (params): RuntimeLocalTaskShowResult => {
      const data = readData()
      const task = resolveTask(data, params.id)
      const labelsById = new Map(data.labels.map((label) => [label.id, label]))
      const comments = data.comments
        .filter((comment) => comment.taskId === task.id)
        .sort((left, right) => left.createdAt - right.createdAt)
      const activities = data.activities
        .filter((activity) => activity.taskId === task.id)
        .sort((left, right) => left.createdAt - right.createdAt)
      return { task: expandTask(task, labelsById), comments, activities }
    }
  })
]
