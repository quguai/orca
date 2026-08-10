import type { AutomationKind } from './automations-types'

/**
 * Where an automation runs, independent of what its prompt does.
 *
 * - `repo`: scoped to a single registered repo + workspace (the default).
 * - `global`: not tied to any repo — runs in the floating workspace.
 *
 * Why: the codebase used to overload `kind === 'weekly_report'` for both
 * "global/floating scope" plumbing and "weekly-report prompt builder". Scope
 * is the plumbing half, derived from kind so it needs no persisted field or
 * migration. Promote to a real field later by swapping this helper.
 */
export type AutomationScope = 'repo' | 'global'

export function getAutomationScope(automation: { kind?: AutomationKind }): AutomationScope {
  return isGlobalScopedKind(automation.kind) ? 'global' : 'repo'
}

export function isGlobalScopedKind(kind?: AutomationKind): boolean {
  return kind === 'weekly_report' || kind === 'global_task'
}

export function isGlobalScopedAutomation(automation: { kind?: AutomationKind }): boolean {
  return getAutomationScope(automation) === 'global'
}
