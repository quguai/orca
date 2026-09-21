import { GitMerge, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import {
  AoneWorkspaceMergeRequestRow,
  type AoneWorkspaceMergeRequestRowReview
} from './AoneWorkspaceMergeRequestRow'
import type {
  AoneMergeRequest,
  AoneWorkspaceMergeRequestEntry,
  AoneWorkspaceParentReview
} from './AoneWorkspaceMergeRequests'
import { mapAoneMergeRequestState } from './aone-review-normalization'
import { prStateColor } from './checks-panel/check-presentation'

type AoneWorkspaceMergeRequestOverviewProps = {
  parentRepoName: string
  parentReview: AoneWorkspaceParentReview | null
  parentLookupErrorCode: string | null
  showParent: boolean
  branch: string
  entries: AoneWorkspaceMergeRequestEntry[]
  loading: boolean
  scanFailed: boolean
  onRefresh: () => void
  onSelectParent: () => void
  onSelectChild: (entry: AoneWorkspaceMergeRequestEntry) => void
}

export function AoneWorkspaceMergeRequestOverview({
  parentRepoName,
  parentReview,
  parentLookupErrorCode,
  showParent,
  branch,
  entries,
  loading,
  scanFailed,
  onRefresh,
  onSelectParent,
  onSelectChild
}: AoneWorkspaceMergeRequestOverviewProps): React.JSX.Element {
  const repoCount = entries.length + (showParent ? 1 : 0)
  const reviewCount =
    (showParent && parentReview ? 1 : 0) + entries.filter((entry) => entry.review).length
  const openCount =
    (showParent && parentReview?.state === 'open' ? 1 : 0) +
    entries.filter((entry) => entry.review && mapAoneMergeRequestState(entry.review) === 'open')
      .length
  const title = translate(
    'auto.components.rightSidebar.AoneWorkspaceMergeRequests.workspaceTitle',
    'Workspace reviews'
  )

  return (
    <div className="flex-1 overflow-auto scrollbar-sleek" aria-label={title}>
      <header className="border-b border-border px-3 py-3">
        <div className="flex items-center gap-2">
          <GitMerge className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">{title}</span>
          {openCount > 0 ? (
            <span
              className={cn(
                'rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
                prStateColor('open')
              )}
            >
              {translate(
                'auto.components.rightSidebar.AoneWorkspaceMergeRequests.openCount',
                '{{value0}} open',
                { value0: openCount }
              )}
            </span>
          ) : null}
          <div className="ml-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground"
                  disabled={loading}
                  onClick={onRefresh}
                  aria-label={translate(
                    'auto.components.rightSidebar.AoneWorkspaceMergeRequests.refresh',
                    'Refresh workspace reviews'
                  )}
                >
                  <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" sideOffset={4}>
                {translate(
                  'auto.components.rightSidebar.AoneWorkspaceMergeRequests.refresh',
                  'Refresh workspace reviews'
                )}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="mt-2 text-[11px] text-muted-foreground">
          {translate(
            'auto.components.rightSidebar.AoneWorkspaceMergeRequests.workspaceSummary',
            '{{value0}} repositories · comments are viewed separately',
            { value0: repoCount }
          )}
        </div>
      </header>

      <section className="px-3 py-3">
        <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span>
            {translate(
              'auto.components.rightSidebar.AoneWorkspaceMergeRequests.mergeRequests',
              'Merge requests'
            )}
          </span>
          <span className="tabular-nums">{reviewCount}</span>
        </div>
        <div className="space-y-1">
          {showParent ? (
            <AoneWorkspaceMergeRequestRow
              repoName={parentRepoName}
              branch={branch}
              review={mapParentReview(parentReview)}
              lookupErrorCode={parentLookupErrorCode}
              onSelect={onSelectParent}
            />
          ) : null}
          {entries.map((entry) => (
            <AoneWorkspaceMergeRequestRow
              key={entry.repo.path}
              repoName={entry.repo.displayName}
              branch={entry.branch}
              review={mapChildReview(entry.review)}
              lookupErrorCode={entry.lookupErrorCode}
              onSelect={entry.review ? () => onSelectChild(entry) : undefined}
            />
          ))}
          {loading ? (
            <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              {translate(
                'auto.components.rightSidebar.AoneWorkspaceMergeRequests.loading',
                'Checking child repositories…'
              )}
            </div>
          ) : null}
        </div>
        {scanFailed ? (
          <div
            role="alert"
            className="mt-3 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-2 text-xs text-destructive"
          >
            <span className="min-w-0 flex-1">
              {translate(
                'auto.components.rightSidebar.AoneWorkspaceMergeRequests.scanFailed',
                'Could not scan child repositories'
              )}
            </span>
            <Button type="button" variant="outline" size="xs" onClick={onRefresh}>
              {translate('auto.components.rightSidebar.AoneWorkspaceMergeRequests.retry', 'Retry')}
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  )
}

function mapParentReview(
  review: AoneWorkspaceParentReview | null
): AoneWorkspaceMergeRequestRowReview | null {
  return review
    ? {
        id: review.number,
        title: review.title,
        state: review.state,
        url: review.url
      }
    : null
}

function mapChildReview(
  review: AoneMergeRequest | null
): AoneWorkspaceMergeRequestRowReview | null {
  if (!review) {
    return null
  }
  return {
    id: review.id,
    title: review.title,
    state: mapAoneMergeRequestState(review),
    url: review.detailUrl?.trim() || review.webUrl?.trim() || null
  }
}
