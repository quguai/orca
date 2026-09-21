import React from 'react'
import { Check, SendHorizontal, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { PRCommentGroup } from '../../../../../shared/pr-comment-groups'
import { translate } from '@/i18n/i18n'

/** Header actions for queuing and dispatching comment threads to an AI agent. */
export function CommentsListAiActions({
  reviewKind,
  commentsLoading,
  isSelectingForAI,
  selectableGroups,
  selectedGroups,
  selectedCommentQueueCount,
  visibleSelectableCount,
  resolveCommentsWithAIDisabled,
  resolveCommentsWithAIDisabledReason,
  onResolveSelectedCommentsWithAI,
  onSelectVisible,
  onClearSelection
}: {
  reviewKind: 'PR' | 'MR'
  commentsLoading: boolean
  isSelectingForAI: boolean
  selectableGroups: PRCommentGroup[]
  selectedGroups: PRCommentGroup[]
  selectedCommentQueueCount: number
  visibleSelectableCount: number
  resolveCommentsWithAIDisabled?: boolean
  resolveCommentsWithAIDisabledReason?: string
  onResolveSelectedCommentsWithAI?: (groups: PRCommentGroup[]) => void
  onSelectVisible: () => void
  onClearSelection: () => void
}): React.JSX.Element {
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-foreground"
            aria-label={translate(
              'auto.components.right.sidebar.checks.panel.content.8b665c395e',
              'Select visible unresolved comments'
            )}
            disabled={commentsLoading || visibleSelectableCount === 0}
            onClick={onSelectVisible}
          >
            <Check className="size-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={4}>
          {translate(
            'auto.components.right.sidebar.checks.panel.content.8b665c395e',
            'Select visible unresolved comments'
          )}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-foreground"
            aria-label={translate(
              'auto.components.right.sidebar.checks.panel.content.d7a2f9c401',
              'Send unresolved {{value0}} comments',
              { value0: reviewKind }
            )}
            disabled={commentsLoading || resolveCommentsWithAIDisabled}
            title={
              resolveCommentsWithAIDisabled ? resolveCommentsWithAIDisabledReason : undefined
            }
            onClick={() => onResolveSelectedCommentsWithAI?.(selectableGroups)}
          >
            <Sparkles className="size-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={4}>
          {resolveCommentsWithAIDisabled && resolveCommentsWithAIDisabledReason
            ? resolveCommentsWithAIDisabledReason
            : translate(
                'auto.components.right.sidebar.checks.panel.content.d7a2f9c401',
                'Send unresolved {{value0}} comments',
                { value0: reviewKind }
              )}
        </TooltipContent>
      </Tooltip>
      {isSelectingForAI && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="default"
                size="icon-xs"
                className="relative"
                aria-label={translate(
                  'auto.components.right.sidebar.checks.panel.content.d91f2a6c39',
                  'Send {{value0}} queued comments to AI',
                  { value0: selectedCommentQueueCount }
                )}
                disabled={
                  selectedCommentQueueCount === 0 ||
                  commentsLoading ||
                  resolveCommentsWithAIDisabled
                }
                title={
                  resolveCommentsWithAIDisabled ? resolveCommentsWithAIDisabledReason : undefined
                }
                onClick={() => onResolveSelectedCommentsWithAI?.(selectedGroups)}
              >
                <SendHorizontal className="size-3" />
                <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full border border-border bg-background px-0.5 text-[9px] leading-none text-foreground tabular-nums">
                  {selectedCommentQueueCount}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={4}>
              {resolveCommentsWithAIDisabled && resolveCommentsWithAIDisabledReason
                ? resolveCommentsWithAIDisabledReason
                : translate(
                    'auto.components.right.sidebar.checks.panel.content.d91f2a6c39',
                    'Send {{value0}} queued comments to AI',
                    { value0: selectedCommentQueueCount }
                  )}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-foreground"
                aria-label={translate(
                  'auto.components.right.sidebar.checks.panel.content.a6de3e5a20',
                  'Clear queued comments'
                )}
                onClick={onClearSelection}
              >
                <X className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={4}>
              {translate(
                'auto.components.right.sidebar.checks.panel.content.a6de3e5a20',
                'Clear queued comments'
              )}
            </TooltipContent>
          </Tooltip>
        </>
      )}
    </>
  )
}
