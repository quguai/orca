import CommentMarkdown from '@/components/sidebar/CommentMarkdown'
import { translate } from '@/i18n/i18n'
import type {
  LocalTaskActivity,
  LocalTaskComment,
  LocalTaskStatus,
  LocalTaskPriority
} from '../../../../shared/local-task-types'
import { getStatusLabel, getPriorityLabel } from './local-task-status-priority'
import { LocalTaskCommentInput } from './local-task-markdown-editor'

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) {
    return translate('auto.components.LocalTaskActivityComments.just_now', 'just now')
  }
  if (minutes < 60) {
    return translate('auto.components.LocalTaskActivityComments.minutes_ago', '{{value0}}m ago', {
      value0: minutes
    })
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return translate('auto.components.LocalTaskActivityComments.hours_ago', '{{value0}}h ago', {
      value0: hours
    })
  }
  const days = Math.floor(hours / 24)
  return translate('auto.components.LocalTaskActivityComments.days_ago', '{{value0}}d ago', {
    value0: days
  })
}

function activityDescription(activity: LocalTaskActivity): string {
  switch (activity.type) {
    case 'created':
      return translate('auto.components.LocalTaskActivityComments.activity_created', 'Task created')
    case 'status_changed':
      return translate(
        'auto.components.LocalTaskActivityComments.activity_status',
        'Status: {{value0}} → {{value1}}',
        {
          value0: activity.oldValue ? getStatusLabel(activity.oldValue as LocalTaskStatus) : '?',
          value1: activity.newValue ? getStatusLabel(activity.newValue as LocalTaskStatus) : '?'
        }
      )
    case 'priority_changed':
      return translate(
        'auto.components.LocalTaskActivityComments.activity_priority',
        'Priority: {{value0}} → {{value1}}',
        {
          value0: activity.oldValue
            ? getPriorityLabel(activity.oldValue as LocalTaskPriority)
            : '?',
          value1: activity.newValue ? getPriorityLabel(activity.newValue as LocalTaskPriority) : '?'
        }
      )
    case 'description_changed':
      return translate(
        'auto.components.LocalTaskActivityComments.activity_description',
        'Description updated'
      )
    case 'comment_added':
      return translate(
        'auto.components.LocalTaskActivityComments.activity_comment',
        'Comment added'
      )
    case 'subtask_added':
      return translate(
        'auto.components.LocalTaskActivityComments.activity_subtask',
        'Sub-task added: {{value0}}',
        {
          value0: activity.newValue ?? ''
        }
      )
    case 'due_date_changed':
      if (activity.newValue) {
        return translate(
          'auto.components.LocalTaskActivityComments.activity_due_date_set',
          'Due date set to {{value0}}',
          {
            value0: activity.newValue
          }
        )
      }
      return translate(
        'auto.components.LocalTaskActivityComments.activity_due_date_removed',
        'Due date removed'
      )
    case 'archived':
      return translate(
        'auto.components.LocalTaskActivityComments.activity_archived',
        'Task archived'
      )
    case 'unarchived':
      return translate(
        'auto.components.LocalTaskActivityComments.activity_unarchived',
        'Task unarchived'
      )
  }
}

export function ActivitySection({
  activities
}: {
  activities: LocalTaskActivity[]
}): React.JSX.Element | null {
  if (activities.length === 0) {
    return null
  }

  return (
    <div className="mt-4 space-y-2.5">
      {activities.map((a) => (
        <div key={a.id} className="flex items-start gap-2 text-xs">
          <div className="mt-0.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
          <span className="min-w-0 flex-1 text-muted-foreground">{activityDescription(a)}</span>
          <span className="shrink-0 text-muted-foreground/60">
            {formatRelativeTime(a.createdAt)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function CommentsSection({
  comments,
  submitting,
  onSubmit
}: {
  comments: LocalTaskComment[]
  submitting: boolean
  onSubmit: (content: string) => void
}): React.JSX.Element {
  return (
    <div>
      {comments.length > 0 ? (
        <div className="mb-6 flex flex-col gap-5">
          {comments.map((c) => (
            <article key={c.id} className="flex gap-3">
              <div className="size-7 shrink-0 rounded-full bg-muted" />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2 text-sm">
                  <span className="font-semibold text-foreground">
                    {translate('auto.components.LocalTaskActivityComments.you', 'You')}
                  </span>
                  <span className="text-muted-foreground">{formatRelativeTime(c.createdAt)}</span>
                </div>
                <div className="rounded-lg border border-border/60 bg-card px-4 py-3">
                  <CommentMarkdown
                    content={c.content}
                    variant="compact"
                    className="text-[14px] leading-7"
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <LocalTaskCommentInput onSubmit={onSubmit} submitting={submitting} />
    </div>
  )
}
