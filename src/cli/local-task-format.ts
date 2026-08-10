import type {
  RuntimeLocalTaskListResult,
  RuntimeLocalTaskRecord,
  RuntimeLocalTaskShowResult
} from '../shared/local-task-rpc-types'

function timestamp(value: number): string {
  return new Date(value).toISOString()
}

function labelNames(task: RuntimeLocalTaskRecord): string {
  return task.labels.map((label) => label.name).join(', ') || 'none'
}

export function formatLocalTaskList(result: RuntimeLocalTaskListResult): string {
  if (result.tasks.length === 0) {
    return 'No local tasks.'
  }
  return result.tasks
    .map(
      (task) =>
        `${task.displayId}  ${task.status}  ${task.priority}  ${task.title}  [${labelNames(task)}]`
    )
    .join('\n')
}

export function formatLocalTaskShow(result: RuntimeLocalTaskShowResult): string {
  const { task } = result
  const lines = [
    `${task.displayId} ${task.title}`,
    `id: ${task.id}`,
    `status: ${task.status}`,
    `priority: ${task.priority}`,
    `labels: ${labelNames(task)}`,
    `createdAt: ${timestamp(task.createdAt)}`,
    `updatedAt: ${timestamp(task.updatedAt)}`
  ]
  if (task.repoPath) {
    lines.push(`repoPath: ${task.repoPath}`)
  }
  if (task.dueDate) {
    lines.push(`dueDate: ${task.dueDate}`)
  }
  if (task.archivedAt !== undefined) {
    lines.push(`archivedAt: ${timestamp(task.archivedAt)}`)
  }
  if (task.description) {
    lines.push('', 'description:', ...task.description.split('\n').map((line) => `  ${line}`))
  }
  if (result.comments.length > 0) {
    lines.push('', 'comments:')
    for (const comment of result.comments) {
      lines.push(
        `  ${timestamp(comment.createdAt)}`,
        ...comment.content.split('\n').map((line) => `    ${line}`)
      )
    }
  }
  if (result.activities.length > 0) {
    lines.push('', 'activities:')
    for (const activity of result.activities) {
      const transition =
        activity.oldValue || activity.newValue
          ? ` (${activity.oldValue ?? 'none'} -> ${activity.newValue ?? 'none'})`
          : ''
      lines.push(`  ${timestamp(activity.createdAt)} ${activity.type}${transition}`)
    }
  }
  return lines.join('\n')
}
