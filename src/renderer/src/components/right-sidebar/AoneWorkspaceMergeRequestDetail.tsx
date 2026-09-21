import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, ExternalLink, GitMerge, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'
import { openHttpLink } from '@/lib/http-link-routing'
import { cn } from '@/lib/utils'
import type { PRComment } from '../../../../shared/types'
import type { AoneWorkspaceMergeRequestEntry } from './AoneWorkspaceMergeRequests'
import { classifyAoneFailure, mapAoneMergeRequestState } from './aone-review-normalization'
import { PRCommentsList } from './checks-panel/comments-list'
import { prStateColor } from './checks-panel/check-presentation'
import { ChecksPanelUpdatedAtMetadata } from './checks-panel-updated-at-metadata'

type AoneComment = {
  id: number
  body?: string | null
  note?: string | null
  author?: { id?: number | null; name?: string | null; username?: string | null } | null
  createdAt?: string | null
  updatedAt?: string | null
  resolved?: boolean | null
  closed?: boolean | number | null
  filePath?: string | null
  path?: string | null
  line?: number | null
  outdated?: boolean | null
}

type AoneCommentResponse = {
  ok: boolean
  data?: AoneComment[]
  code?: string
  error?: string
}

export type AoneCommentLoadResult =
  | { ok: true; comments: PRComment[] }
  | { ok: false; code: string }

export async function loadAoneWorkspaceMergeRequestComments({
  repoPath,
  mergeRequestId,
  listMRComments
}: {
  repoPath: string
  mergeRequestId: number
  listMRComments: (args: { mr: number; repoPath?: string | null }) => Promise<unknown>
}): Promise<AoneCommentLoadResult> {
  try {
    const args = { mr: mergeRequestId, repoPath }
    let response = (await listMRComments(args)) as AoneCommentResponse
    if (!response.ok && response.code === 'invalid_output') {
      response = (await listMRComments(args)) as AoneCommentResponse
    }
    if (!response.ok) {
      return {
        ok: false,
        code: classifyAoneFailure(response.code, response.error)
      }
    }
    return { ok: true, comments: (response.data ?? []).map(mapAoneComment) }
  } catch {
    return {
      ok: false,
      code: 'unknown'
    }
  }
}

export function AoneWorkspaceMergeRequestDetail({
  entry,
  onBack
}: {
  entry: AoneWorkspaceMergeRequestEntry
  onBack: () => void
}): React.JSX.Element | null {
  const review = entry.review
  const [refreshGeneration, setRefreshGeneration] = useState(0)
  const requestKey = review ? `${entry.repo.path}\0${review.id}\0${refreshGeneration}` : ''
  const [loaded, setLoaded] = useState<{
    requestKey: string
    result: AoneCommentLoadResult
  } | null>(null)
  const result = loaded?.requestKey === requestKey ? loaded.result : null

  const loadComments = useCallback(async (): Promise<void> => {
    if (!review) {
      return
    }
    setLoaded(null)
    const next = await loadAoneWorkspaceMergeRequestComments({
      repoPath: entry.repo.path,
      mergeRequestId: review.id,
      listMRComments: window.api.aone.listMRComments
    })
    setLoaded({ requestKey, result: next })
  }, [entry.repo.path, requestKey, review])

  useEffect(() => {
    let cancelled = false
    if (!review) {
      return undefined
    }
    void loadAoneWorkspaceMergeRequestComments({
      repoPath: entry.repo.path,
      mergeRequestId: review.id,
      listMRComments: window.api.aone.listMRComments
    }).then((next) => {
      if (!cancelled) {
        setLoaded({ requestKey, result: next })
      }
    })
    return () => {
      cancelled = true
    }
  }, [entry.repo.path, requestKey, review])

  if (!review) {
    return null
  }

  const state = mapAoneMergeRequestState(review)
  const url = review.detailUrl?.trim() || review.webUrl?.trim() || null
  const updatedAt = review.updatedAt ?? review.createdAt ?? null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-2">
        <Button type="button" variant="ghost" size="xs" onClick={onBack}>
          <ArrowLeft className="size-3.5" />
          {translate('auto.components.rightSidebar.AoneWorkspaceMergeRequests.back', 'Back')}
        </Button>
        <span className="min-w-0 truncate text-xs font-medium text-foreground">
          {entry.repo.displayName}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground"
                disabled={result === null}
                onClick={() => setRefreshGeneration((value) => value + 1)}
                aria-label={translate(
                  'auto.components.rightSidebar.AoneWorkspaceMergeRequests.refreshComments',
                  'Refresh comments'
                )}
              >
                <RefreshCw className={cn('size-3.5', result === null && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={4}>
              {translate(
                'auto.components.rightSidebar.AoneWorkspaceMergeRequests.refreshComments',
                'Refresh comments'
              )}
            </TooltipContent>
          </Tooltip>
          {url ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground"
                  onClick={() => void openHttpLink(url)}
                  aria-label={translate(
                    'auto.components.rightSidebar.AoneWorkspaceMergeRequests.open',
                    'Open merge request externally'
                  )}
                >
                  <ExternalLink className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" sideOffset={4}>
                {translate(
                  'auto.components.rightSidebar.AoneWorkspaceMergeRequests.open',
                  'Open merge request externally'
                )}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-sleek">
        <header className="space-y-2 border-b border-border px-3 py-3">
          <div className="flex items-center gap-2">
            <GitMerge className="size-4 shrink-0 text-muted-foreground" />
            <span className="font-mono text-[11px] font-semibold text-foreground">
              !{review.id}
            </span>
            <span
              className={cn(
                'rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
                prStateColor(state)
              )}
            >
              {state}
            </span>
          </div>
          <div className="text-[12px] leading-snug text-foreground">{review.title}</div>
          {updatedAt ? (
            <ChecksPanelUpdatedAtMetadata reviewShortLabel="MR" updatedAt={updatedAt} />
          ) : null}
        </header>

        {result?.ok === false ? (
          <div
            role="alert"
            className="m-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            <div className="font-medium">{getCommentErrorLabel(result.code)}</div>
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="mt-2"
              onClick={() => void loadComments()}
            >
              {translate('auto.components.rightSidebar.AoneWorkspaceMergeRequests.retry', 'Retry')}
            </Button>
          </div>
        ) : (
          <PRCommentsList
            comments={result?.ok ? result.comments : []}
            commentsLoading={result === null}
            reviewKind="MR"
            selectionContextKey={`aone-child:${entry.repo.path}:${review.id}`}
            commentFileRootPath={entry.repo.path}
          />
        )}
      </div>
    </div>
  )
}

function mapAoneComment(comment: AoneComment): PRComment {
  const author = comment.author
  return {
    id: comment.id,
    author: author?.name ?? author?.username ?? (author?.id != null ? String(author.id) : ''),
    authorAvatarUrl: '',
    body: comment.body ?? comment.note ?? '',
    createdAt: comment.createdAt ?? comment.updatedAt ?? new Date().toISOString(),
    url: '',
    path: comment.filePath ?? comment.path ?? undefined,
    line: typeof comment.line === 'number' ? comment.line : undefined,
    isResolved:
      comment.resolved === true || comment.closed === true || comment.closed === 1
        ? true
        : undefined,
    isOutdated: comment.outdated === true ? true : undefined
  }
}

function getCommentErrorLabel(code: string): string {
  if (code === 'rate_limited') {
    return translate(
      'auto.components.rightSidebar.AoneWorkspaceMergeRequests.rateLimited',
      'Aone is rate limiting MR queries. Retry in a moment.'
    )
  }
  if (code === 'auth_required') {
    return translate(
      'auto.components.rightSidebar.AoneWorkspaceMergeRequests.authRequired',
      'Sign in to a1, then retry'
    )
  }
  if (code === 'not_linked') {
    return translate(
      'auto.components.rightSidebar.AoneWorkspaceMergeRequests.notLinked',
      'Repository is not linked in a1'
    )
  }
  if (code === 'binary_missing') {
    return translate(
      'auto.components.rightSidebar.AoneWorkspaceMergeRequests.binaryMissing',
      'a1 CLI is not installed'
    )
  }
  return translate(
    'auto.components.rightSidebar.AoneWorkspaceMergeRequests.commentsFailed',
    'Could not load comments'
  )
}
