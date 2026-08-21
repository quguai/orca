import type { FolderWorkspacePrListRow } from './folder-workspace-card-pr-display'
import type { WorktreeCardPrDisplay } from './worktree-card-pr-display'

function statusDotClass(status: WorktreeCardPrDisplay['status']): string {
  switch (status) {
    case 'failure':
      return 'bg-red-500'
    case 'pending':
      return 'bg-amber-500'
    case 'success':
      return 'bg-emerald-500'
    case 'neutral':
    case undefined:
      return 'bg-muted-foreground/40'
  }
}

/**
 * Why: lists one row per member repository's open review under a multi-repo
 * folder workspace card, so each repo's PR is visible instead of collapsed to
 * a single worst-status icon.
 */
export function FolderWorkspacePrList({ rows }: { rows: FolderWorkspacePrListRow[] }) {
  if (rows.length === 0) {
    return null
  }
  return (
    <div className="flex flex-col gap-0.5 px-3 pb-2">
      {rows.map((row, index) => {
        const display = row.display
        const href = 'url' in display && display.url ? display.url : undefined
        const number = 'number' in display ? display.number : null
        const key = `${row.repoDisplayName}:${number ?? index}`
        return (
          <a
            key={key}
            href={href}
            target={href ? '_blank' : undefined}
            rel={href ? 'noreferrer' : undefined}
            aria-label={`${row.repoDisplayName}${number !== null ? ` #${number}` : ''}`}
            className="flex min-w-0 items-center gap-1.5 rounded px-1 py-0.5 text-[11px] text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
          >
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={row.repoBadgeColor ? { backgroundColor: row.repoBadgeColor } : undefined}
              aria-hidden="true"
            />
            <span className="max-w-[7rem] shrink-0 truncate">{row.repoDisplayName}</span>
            {number !== null ? <span className="shrink-0">#{number}</span> : null}
            <span
              className={`size-1.5 shrink-0 rounded-full ${statusDotClass(display.status)}`}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate">{display.title}</span>
          </a>
        )
      })}
    </div>
  )
}
