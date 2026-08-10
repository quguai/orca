import type {
  LocalTask,
  LocalTaskActivity,
  LocalTaskComment,
  LocalTaskLabel
} from './local-task-types'

export type RuntimeLocalTaskRecord = LocalTask & {
  displayId: string
  labels: LocalTaskLabel[]
}

export type RuntimeLocalTaskListResult = {
  tasks: RuntimeLocalTaskRecord[]
}

export type RuntimeLocalTaskShowResult = {
  task: RuntimeLocalTaskRecord
  comments: LocalTaskComment[]
  activities: LocalTaskActivity[]
}
