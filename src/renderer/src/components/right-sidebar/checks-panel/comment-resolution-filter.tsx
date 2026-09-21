import React from 'react'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'

export type PRCommentsListResolutionFilter = 'all' | 'unresolved' | 'resolved'
export const PR_COMMENT_LIST_RESOLUTION_FILTERS: PRCommentsListResolutionFilter[] = [
  'all',
  'unresolved',
  'resolved'
]

export function getPRCommentsListResolutionFilterLabel(
  filter: PRCommentsListResolutionFilter
): string {
  if (filter === 'resolved') {
    return translate('auto.components.right.sidebar.checks.panel.content.8987d5a3dd', 'Resolved')
  }
  if (filter === 'unresolved') {
    return translate('auto.components.right.sidebar.checks.panel.content.7c1f0a2b11', 'Open')
  }
  return translate('auto.components.right.sidebar.checks.panel.content.a2508c19f2', 'All')
}

export function getPRCommentsListResolutionFilterDescription(
  filter: PRCommentsListResolutionFilter
): string {
  if (filter === 'resolved') {
    return translate('auto.components.right.sidebar.checks.panel.content.aacfd5130a', 'Resolved')
  }
  if (filter === 'unresolved') {
    return translate(
      'auto.components.right.sidebar.checks.panel.content.53beb46464',
      'Needs action'
    )
  }
  return translate('auto.components.right.sidebar.checks.panel.content.c066735e1c', 'Every thread')
}

export function PRCommentResolutionFilterRow({
  value,
  counts,
  onChange
}: {
  value: PRCommentsListResolutionFilter
  counts: Record<PRCommentsListResolutionFilter, number>
  onChange: (filter: PRCommentsListResolutionFilter) => void
}): React.JSX.Element {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {translate('auto.components.right.sidebar.checks.panel.content.b4257beec1', 'Status')}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {PR_COMMENT_LIST_RESOLUTION_FILTERS.map((filter) => {
          const isActive = value === filter
          return (
            <button
              key={filter}
              type="button"
              className={cn(
                'flex min-w-0 shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
                isActive
                  ? 'border-border bg-muted text-foreground shadow-xs'
                  : 'border-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
              aria-pressed={isActive}
              onClick={() => onChange(filter)}
            >
              <span className="truncate">{getPRCommentsListResolutionFilterLabel(filter)}</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums',
                  isActive
                    ? 'bg-background text-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {counts[filter]}
              </span>
              <span className="hidden text-[10px] text-muted-foreground @min-[360px]/right-sidebar:inline">
                {getPRCommentsListResolutionFilterDescription(filter)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
