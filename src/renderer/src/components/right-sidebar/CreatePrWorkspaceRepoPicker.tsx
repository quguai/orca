import { useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import { useAppStore } from '@/store'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { translate } from '@/i18n/i18n'
import type { Repo } from '../../../../shared/types'

type MemberWorktree = {
  worktreeId: string
  repoId: string
  repoDisplayName: string
  repoBadgeColor: string | null
  branch: string | null
}

function shortBranch(branch: string | null | undefined): string {
  if (!branch) {
    return ''
  }
  return branch.replace(/^refs\/heads\//, '')
}

/**
 * Why: in a multi-repo workspace (parent + nested member repos in one
 * ProjectGroup), this picker switches the source-control panel's active
 * worktree to another member repo's worktree before creating a PR. The create
 * flow stays active-worktree-scoped, so switching the active worktree is the
 * architecturally correct way to target a different member repo.
 */
export function CreatePrWorkspaceRepoPicker({
  activeWorktreeId,
  activeRepo
}: {
  activeWorktreeId: string | null | undefined
  activeRepo: Repo | null
}) {
  const repos = useAppStore((s) => s.repos)
  const worktreesByRepo = useAppStore((s) => s.worktreesByRepo)
  const setActiveWorktree = useAppStore((s) => s.setActiveWorktree)

  const groupId = activeRepo?.projectGroupId ?? null
  const memberWorktrees = useMemo<MemberWorktree[]>(() => {
    if (!groupId) {
      return []
    }
    const memberRepos = repos.filter((repo) => repo.projectGroupId === groupId)
    // Why: the picker is only useful when more than one member repo exists.
    if (memberRepos.length < 2) {
      return []
    }
    const result: MemberWorktree[] = []
    for (const repo of memberRepos) {
      for (const worktree of worktreesByRepo[repo.id] ?? []) {
        if (worktree.isArchived) {
          continue
        }
        result.push({
          worktreeId: worktree.id,
          repoId: repo.id,
          repoDisplayName: repo.displayName,
          repoBadgeColor: repo.badgeColor ?? null,
          branch: shortBranch(worktree.branch)
        })
      }
    }
    return result
  }, [repos, worktreesByRepo, groupId])

  if (memberWorktrees.length < 2) {
    return null
  }

  const activeMember =
    memberWorktrees.find((member) => member.worktreeId === activeWorktreeId) ?? null

  return (
    <div className="mb-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex w-full min-w-0 items-center gap-1.5 rounded-md border border-border/50 bg-muted/40 px-2 py-1 text-[11px] text-foreground transition hover:bg-muted/70"
          >
            {activeMember?.repoBadgeColor ? (
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: activeMember.repoBadgeColor }}
                aria-hidden="true"
              />
            ) : null}
            <span className="min-w-0 flex-1 truncate text-left">
              {activeMember?.repoDisplayName ?? activeRepo?.displayName}
              {activeMember?.branch ? (
                <span className="text-muted-foreground"> · {activeMember.branch}</span>
              ) : null}
            </span>
            <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="scrollbar-sleek max-h-80 min-w-56 overflow-y-auto"
        >
          <DropdownMenuLabel className="text-[11px] text-muted-foreground">
            {translate('auto.components.TaskPage.81f14d9924', 'Repository')}
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={activeWorktreeId ?? ''}
            onValueChange={(worktreeId) => setActiveWorktree(worktreeId)}
          >
            {memberWorktrees.map((member) => (
              <DropdownMenuRadioItem key={member.worktreeId} value={member.worktreeId}>
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={
                    member.repoBadgeColor ? { backgroundColor: member.repoBadgeColor } : undefined
                  }
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate">{member.repoDisplayName}</span>
                {member.branch ? (
                  <span className="shrink-0 text-muted-foreground">{member.branch}</span>
                ) : null}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
