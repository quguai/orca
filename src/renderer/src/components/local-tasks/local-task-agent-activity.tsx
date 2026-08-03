import { useMemo } from 'react'
import { Bot } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useLiveDashboardSnapshot } from '@/components/dashboard/useLiveDashboardSnapshot'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'

type LocalTaskAgentActivityGroup = {
  worktrees: {
    worktree: { linkedLocalTask?: string | null }
    agents: readonly unknown[]
  }[]
}

export function collectLocalTaskAgentActivityCounts(
  groups: readonly LocalTaskAgentActivityGroup[]
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>()
  for (const group of groups) {
    for (const { worktree, agents } of group.worktrees) {
      const taskId = worktree.linkedLocalTask?.trim()
      if (!taskId || agents.length === 0) {
        continue
      }
      counts.set(taskId, (counts.get(taskId) ?? 0) + agents.length)
    }
  }
  return counts
}

export function useLocalTaskAgentActivityCounts(): ReadonlyMap<string, number> {
  const { cards } = useLiveDashboardSnapshot()
  const worktreesByRepo = useAppStore((state) => state.worktreesByRepo)
  // Why: task links live on worktrees; aggregate once per active view instead
  // of subscribing every task card to the global Agent status maps.
  return useMemo(() => {
    const taskByWorktree = new Map<string, string>()
    for (const worktrees of Object.values(worktreesByRepo)) {
      for (const worktree of worktrees) {
        const taskId = worktree.linkedLocalTask?.trim()
        if (taskId) {
          taskByWorktree.set(worktree.id, taskId)
        }
      }
    }
    const counts = new Map<string, number>()
    for (const card of cards) {
      const taskId = taskByWorktree.get(card.worktreeId)
      if (taskId) {
        counts.set(taskId, (counts.get(taskId) ?? 0) + 1)
      }
    }
    return counts
  }, [cards, worktreesByRepo])
}

export function LocalTaskAgentActivityIndicator({
  count
}: {
  count: number
}): React.JSX.Element | null {
  if (count <= 0) {
    return null
  }
  const label = translate(
    'auto.components.LocalTaskAgentActivityIndicator.label',
    'Agent activity: {{value0}}',
    { value0: count }
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          aria-label={label}
          className="h-4 gap-0.5 border-border/60 bg-muted/20 px-1 text-[9px] leading-none text-muted-foreground"
        >
          <Bot className="size-2.5" />
          {count}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
