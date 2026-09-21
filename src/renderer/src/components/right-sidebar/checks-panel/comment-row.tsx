import React, { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import CommentMarkdown from '@/components/sidebar/CommentMarkdown'
import { CommentReactions } from '@/components/github/CommentReactions'
import { isBotPRComment } from '../../../../../shared/pr-comment-audience'
import type { GitHubReactionContent, PRComment } from '../../../../../shared/github/comment-types'
import type { PRCommentGroupActionState } from '@/lib/pr-comment-action-state'
import type { PRCommentPresentationClasses } from '../pr-comment-presentation'
import { formatPrCommentRelativeTime } from '../../../../../shared/pr-comment-time'
import { translate } from '@/i18n/i18n'
import {
  buildCopyText,
  CommentMoreMenu,
  CopyButton,
  isMutablePRConversationComment,
  PRCommentActionBadge,
  QueueForAgentButton,
  ResolveButton,
  formatPRCommentCodeLocation
} from './comment-controls'

function PRCommentOutdatedBadge({
  comment,
  presentation
}: {
  comment: PRComment
  presentation: PRCommentPresentationClasses
}): React.JSX.Element | null {
  if (comment.isOutdated !== true) {
    return null
  }
  return (
    <span className={presentation.statusBadgeResolved}>
      {translate('auto.components.right.sidebar.checks.panel.content.7c38bd20cb', 'Outdated')}
    </span>
  )
}

function PRCommentLocationBadge({
  comment,
  presentation,
  onOpenCommentContext
}: {
  comment: PRComment
  presentation: PRCommentPresentationClasses
  onOpenCommentContext?: (comment: PRComment) => void
}): React.JSX.Element | null {
  const location = formatPRCommentCodeLocation(comment)
  if (!location) {
    return null
  }
  if (onOpenCommentContext) {
    return (
      <button
        type="button"
        className={cn(
          presentation.pathBadge,
          'rounded-sm text-left transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
        )}
        title={location}
        aria-label={translate(
          'auto.components.right.sidebar.checks.panel.content.f55c4decf0',
          'Open code context for {{value0}}',
          { value0: location }
        )}
        onClick={(event) => {
          event.stopPropagation()
          onOpenCommentContext(comment)
        }}
      >
        <span className="font-sans text-muted-foreground">
          {translate('auto.components.right.sidebar.checks.panel.content.a25f55b6e9', 'Code')}
        </span>{' '}
        {location}
      </button>
    )
  }
  return (
    <span className={presentation.pathBadge} title={location}>
      <span className="font-sans text-muted-foreground">
        {translate('auto.components.right.sidebar.checks.panel.content.a25f55b6e9', 'Code')}
      </span>{' '}
      {location}
    </span>
  )
}

/** A single comment row — used for both root and reply comments. */
export function CommentRow({
  comment,
  botAuthorOverrides,
  isReply,
  showResolve,
  showReply,
  selectionControl,
  actionState,
  isQueued,
  replyDisabled,
  replyDisabledReason,
  presentation,
  now,
  onResolve,
  onReply,
  onEditComment,
  onDeleteComment,
  onOpenCommentContext,
  onSetReaction,
  onQueueForAgent
}: {
  comment: PRComment
  botAuthorOverrides: ReadonlySet<string>
  isReply: boolean
  showResolve: boolean
  showReply?: boolean
  selectionControl?: React.ReactNode
  actionState: PRCommentGroupActionState
  isQueued: boolean
  replyDisabled?: boolean
  replyDisabledReason?: string
  presentation: PRCommentPresentationClasses
  now: number
  onResolve?: (threadId: string, resolve: boolean) => boolean | Promise<boolean>
  onReply?: (comment: PRComment) => void
  onEditComment?: (comment: PRComment, body: string) => Promise<boolean>
  onDeleteComment?: (comment: PRComment) => void | Promise<void>
  onOpenCommentContext?: (comment: PRComment) => void
  onSetReaction?: (
    comment: PRComment,
    content: GitHubReactionContent,
    reacted: boolean
  ) => Promise<boolean>
  onQueueForAgent?: () => void
}): React.JSX.Element {
  const automated = isBotPRComment(comment, botAuthorOverrides)
  const canMutateComment = isMutablePRConversationComment(comment)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(comment.body)
  const [submittingEdit, setSubmittingEdit] = useState(false)

  useEffect(() => {
    if (!editing) {
      setDraft(comment.body)
    }
  }, [comment.body, editing])

  const handleStartEdit = useCallback((): void => {
    setDraft(comment.body)
    setEditing(true)
  }, [comment.body])

  const handleCancelEdit = useCallback(
    (event: React.MouseEvent): void => {
      event.stopPropagation()
      setEditing(false)
      setDraft(comment.body)
    },
    [comment.body]
  )

  const handleSaveEdit = useCallback(
    async (event: React.MouseEvent): Promise<void> => {
      event.stopPropagation()
      const trimmedDraft = draft.trim()
      if (!onEditComment || !trimmedDraft || trimmedDraft === comment.body) {
        setEditing(false)
        return
      }
      setSubmittingEdit(true)
      try {
        const ok = await onEditComment(comment, trimmedDraft)
        if (ok) {
          setEditing(false)
        }
      } finally {
        setSubmittingEdit(false)
      }
    },
    [comment, draft, onEditComment]
  )

  const handleDelete = useCallback((): void => {
    void onDeleteComment?.(comment)
  }, [comment, onDeleteComment])

  const trimmedDraft = draft.trim()
  const canSaveEdit = !submittingEdit && trimmedDraft.length > 0 && trimmedDraft !== comment.body
  const relativeTime = formatPrCommentRelativeTime(comment.createdAt, now)

  const authorAvatar = comment.authorAvatarUrl ? (
    <img
      src={comment.authorAvatarUrl}
      alt={comment.author}
      className={cn(isReply ? presentation.avatarReply : presentation.avatar)}
    />
  ) : (
    <div className={cn(isReply ? presentation.avatarReply : presentation.avatar)} aria-hidden />
  )

  const authorName = (
    <span className={cn(presentation.author, comment.isResolved && presentation.authorResolved)}>
      {comment.author}
    </span>
  )
  const queueButton =
    !isReply && onQueueForAgent ? <QueueForAgentButton onQueueForAgent={onQueueForAgent} /> : null

  const hoverActions = !editing ? (
    <div className="flex items-center gap-0.5 can-hover:opacity-0 group-hover/comment:opacity-100 transition-opacity">
      {showResolve &&
        comment.threadId != null &&
        onResolve &&
        (actionState === 'open' || actionState === 'resolved') && (
          <ResolveButton
            threadId={comment.threadId}
            isResolved={comment.isResolved ?? false}
            onResolve={onResolve}
          />
        )}
      {showReply && onReply && (
        <button
          className="shrink-0 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          title={
            replyDisabled
              ? replyDisabledReason
              : translate('auto.components.right.sidebar.checks.panel.content.c1f6fc006a', 'Reply')
          }
          disabled={replyDisabled}
          onClick={(event) => {
            event.stopPropagation()
            onReply(comment)
          }}
        >
          {translate('auto.components.right.sidebar.checks.panel.content.c1f6fc006a', 'Reply')}
        </button>
      )}
      <CopyButton text={buildCopyText(comment)} />
      <CommentMoreMenu
        comment={comment}
        botAuthorOverrides={botAuthorOverrides}
        onStartEdit={canMutateComment && onEditComment ? handleStartEdit : undefined}
        onDelete={canMutateComment && onDeleteComment ? handleDelete : undefined}
        onQueueForAgent={!isReply ? onQueueForAgent : undefined}
      />
    </div>
  ) : null

  const commentActions = !editing ? (
    <div className="flex shrink-0 items-center gap-0.5">
      {presentation.useCardLayout ? null : queueButton}
      {hoverActions}
    </div>
  ) : null

  const cardMetaRow =
    presentation.useCardLayout && !isReply ? (
      <div
        className={
          selectionControl
            ? presentation.commentHeaderMetaWithSelection
            : presentation.commentHeaderMeta
        }
      >
        {relativeTime ? <span>{relativeTime}</span> : null}
        {automated ? (
          <span className={presentation.botBadge}>
            {translate('auto.components.right.sidebar.checks.panel.content.2ba0a32bdd', 'bot')}
          </span>
        ) : null}
        {comment.path ? (
          <PRCommentLocationBadge
            comment={comment}
            presentation={presentation}
            onOpenCommentContext={onOpenCommentContext}
          />
        ) : null}
        <PRCommentActionBadge
          actionState={actionState}
          isQueued={isQueued}
          presentation={presentation}
        />
        <PRCommentOutdatedBadge comment={comment} presentation={presentation} />
        {onQueueForAgent ? (
          <QueueForAgentButton
            className="ml-auto can-hover:opacity-0 group-hover/comment:opacity-100 group-focus-within/comment:opacity-100"
            onQueueForAgent={onQueueForAgent}
          />
        ) : null}
      </div>
    ) : null

  const authorLine =
    presentation.useCardLayout && !isReply ? (
      <>
        <div className={presentation.commentHeaderPrimary}>
          {selectionControl}
          {authorAvatar}
          {authorName}
          {commentActions}
        </div>
        {cardMetaRow}
      </>
    ) : (
      <>
        {selectionControl}
        {authorAvatar}
        {authorName}
        {relativeTime ? (
          <span className={presentation.time} aria-hidden={presentation.time === 'hidden'}>
            {presentation.useCardLayout ? `· ${relativeTime}` : relativeTime}
          </span>
        ) : null}
        {automated && (
          <span className={presentation.botBadge}>
            {translate('auto.components.right.sidebar.checks.panel.content.2ba0a32bdd', 'bot')}
          </span>
        )}
        {!isReply && comment.path ? (
          <PRCommentLocationBadge
            comment={comment}
            presentation={presentation}
            onOpenCommentContext={onOpenCommentContext}
          />
        ) : null}
        {!isReply ? (
          <PRCommentActionBadge
            actionState={actionState}
            isQueued={isQueued}
            presentation={presentation}
          />
        ) : null}
        {!isReply ? <PRCommentOutdatedBadge comment={comment} presentation={presentation} /> : null}
        <div className="flex-1" />
        {commentActions}
      </>
    )

  return (
    <div
      className={cn(
        'group/comment min-w-0',
        presentation.commentRow,
        isReply && presentation.commentRowReply,
        comment.isResolved && presentation.resolvedContainer
      )}
    >
      <div className="min-w-0">
        <div
          className={cn(
            isReply && presentation.useCardLayout
              ? presentation.commentHeaderReply
              : presentation.commentHeader
          )}
        >
          {authorLine}
        </div>
        {editing ? (
          <div
            className={cn(
              'mt-1 flex flex-col gap-1.5',
              presentation.useCardLayout ? 'px-3 pb-3' : isReply ? 'pl-5' : 'pl-[22px]'
            )}
          >
            <textarea
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              className="min-h-[60px] w-full resize-y rounded-md border border-border bg-background px-2 py-1.5 text-[11px] leading-snug text-foreground"
            />
            <div className="flex justify-end gap-1">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={submittingEdit}
                onClick={handleCancelEdit}
              >
                {translate(
                  'auto.components.right.sidebar.checks.panel.content.b062f55f29',
                  'Cancel'
                )}
              </Button>
              <Button
                type="button"
                size="xs"
                disabled={!canSaveEdit}
                onClick={(event) => void handleSaveEdit(event)}
              >
                {translate('auto.components.right.sidebar.checks.panel.content.f6a40263ff', 'Save')}
              </Button>
            </div>
          </div>
        ) : (
          <div className={isReply ? presentation.commentBodyReply : presentation.commentBody}>
            <CommentMarkdown content={comment.body} className={presentation.commentBodyMarkdown} />
            <CommentReactions
              reactions={comment.reactions}
              onReactionChange={
                comment.reactionSubjectId && onSetReaction
                  ? (content, reacted) => onSetReaction(comment, content, reacted)
                  : undefined
              }
            />
          </div>
        )}
      </div>
    </div>
  )
}
