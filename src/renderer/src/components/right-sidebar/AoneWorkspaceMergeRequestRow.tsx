import { ChevronRight, ExternalLink, GitMerge } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'
import { openHttpLink } from '@/lib/http-link-routing'
import { cn } from '@/lib/utils'
import type { HostedReviewState } from '../../../../shared/hosted-review'
import { prStateColor } from './checks-panel/check-presentation'

export type AoneWorkspaceMergeRequestRowReview = {
  id: number
  title: string
  state: HostedReviewState
  url: string | null
}

type AoneWorkspaceMergeRequestRowProps = {
  repoName: string
  branch: string | null
  review: AoneWorkspaceMergeRequestRowReview | null
  lookupErrorCode?: string | null
  onSelect?: () => void
}

export function AoneWorkspaceMergeRequestRow({
  repoName,
  branch,
  review,
  lookupErrorCode,
  onSelect
}: AoneWorkspaceMergeRequestRowProps): React.JSX.Element {
  const rowContent = (
    <>
      <GitMerge className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[13px] font-medium text-foreground">{repoName}</span>
          {review ? (
            <span
              className={cn(
                'shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
                prStateColor(review.state)
              )}
            >
              {review.state}
            </span>
          ) : null}
        </div>
        {review ? (
          <div className="mt-1 flex min-w-0 items-baseline gap-1.5">
            <span className="shrink-0 font-mono text-[11px] font-semibold text-foreground">
              !{review.id}
            </span>
            <span className="truncate text-xs text-muted-foreground">{review.title}</span>
          </div>
        ) : (
          <div
            className={cn(
              'mt-1 truncate text-xs',
              lookupErrorCode ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {lookupErrorCode
              ? getLookupErrorLabel(lookupErrorCode)
              : !branch
                ? translate(
                    'auto.components.right.sidebar.checks.panel.review.detached.title',
                    'No current branch'
                  )
                : translate(
                    'auto.components.rightSidebar.AoneWorkspaceMergeRequests.noReview',
                    'No MR for {{value0}}',
                    { value0: branch }
                  )}
          </div>
        )}
      </div>
      {onSelect ? <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" /> : null}
    </>
  )

  return (
    <div className="group flex min-w-0 items-start rounded-md hover:bg-accent">
      {onSelect ? (
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-2 rounded-md px-2 py-2 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onClick={onSelect}
          aria-label={
            review
              ? translate(
                  'auto.components.rightSidebar.AoneWorkspaceMergeRequests.view',
                  'View {{value0}} merge request',
                  { value0: repoName }
                )
              : translate(
                  'auto.components.rightSidebar.AoneWorkspaceMergeRequests.viewRepository',
                  'View review actions for {{value0}}',
                  { value0: repoName }
                )
          }
        >
          {rowContent}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-start gap-2 px-2 py-2">{rowContent}</div>
      )}
      {review?.url ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="mr-1 mt-1.5 shrink-0 text-muted-foreground"
              onClick={() => void openHttpLink(review.url!)}
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
  )
}

function getLookupErrorLabel(code: string): string {
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
    'auto.components.rightSidebar.AoneWorkspaceMergeRequests.lookupFailed',
    'MR lookup failed'
  )
}
