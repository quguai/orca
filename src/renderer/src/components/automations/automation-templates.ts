import type { AutomationKind, AutomationSchedulePreset } from '../../../../shared/automations-types'
import type { TuiAgent } from '../../../../shared/types'
import { translate } from '@/i18n/i18n'
import { createLocalizedCatalog } from '@/i18n/localized-catalog'

export type AutomationTemplate = {
  id: string
  kind?: AutomationKind
  category: string
  label: string
  description: string
  name: string
  prompt: string
  preset: AutomationSchedulePreset
  time?: string
  dayOfWeek?: string
  agentId?: TuiAgent
  missedRunGraceMinutes?: string
}

export const getAutomationTemplates = createLocalizedCatalog((): AutomationTemplate[] => [
  {
    id: 'weekly-report',
    kind: 'global_task',
    category: translate(
      'auto.components.automations.automation.templates.weeklyReport.category',
      'Weekly report'
    ),
    label: translate(
      'auto.components.automations.automation.templates.weeklyReport.label',
      'Weekly change report'
    ),
    description: translate(
      'auto.components.automations.automation.templates.weeklyReport.description',
      'Use the a1-weekly-report skill to generate a structured weekly report.'
    ),
    name: translate(
      'auto.components.automations.automation.templates.weeklyReport.name',
      'Weekly change report'
    ),
    prompt: translate(
      'auto.components.automations.automation.templates.weeklyReport.prompt',
      "Use $a1-weekly-report to generate this week's report with the recommended emphasis and no interactive selection."
    ),
    preset: 'weekly',
    time: '17:00',
    dayOfWeek: '5',
    missedRunGraceMinutes: '2880'
  },
  {
    id: 'review-inbox-daily',
    kind: 'global_task',
    category: translate(
      'auto.components.automations.automation.templates.reviewInbox.category',
      'Global'
    ),
    label: translate(
      'auto.components.automations.automation.templates.reviewInbox.label',
      'Daily review inbox'
    ),
    description: translate(
      'auto.components.automations.automation.templates.reviewInbox.description',
      'Pull every merge request awaiting your review across repos (via a1) and triage by priority. Not tied to a single project.'
    ),
    name: translate(
      'auto.components.automations.automation.templates.reviewInbox.name',
      'Daily review inbox'
    ),
    prompt: translate(
      'auto.components.automations.automation.templates.reviewInbox.prompt',
      'You are a code-review triage assistant. This task is not scoped to one repo — it covers every merge request awaiting my review. Steps: (1) run `a1 repo mr list --mine review --state opened --format json` to fetch MRs awaiting my review; (2) enrich as needed with `a1 repo mr status --source <branch>` and `a1 repo mr view <id> --work-items --cr` for CI / approvals / conflicts / linked items; (3) bucket them: Blocking (CI failing, conflicts, unresolved BLOCKER comments), Awaiting my reply (@me or QUESTION), Ready to merge (approved, CI green, no conflicts), Stale (no update for days); (4) emit a concise checklist in Chinese (中文) — repo, title, MR link, current status, suggested next action. Do not modify code or change MR state. If a command returns an auth error, tell me to run `a1 auth login --buc`.'
    ),
    preset: 'daily',
    time: '10:00',
    missedRunGraceMinutes: '180'
  },
  {
    id: 'repo-health-weekday',
    category: translate(
      'auto.components.automations.automation.templates.repoHealth.category',
      'Repo health'
    ),
    label: translate(
      'auto.components.automations.automation.templates.b84757677d',
      'Weekday repo audit'
    ),
    description: translate(
      'auto.components.automations.automation.templates.a7fbd32ddb',
      'Check dependencies, failing tests, and risky open changes each weekday.'
    ),
    name: translate(
      'auto.components.automations.automation.templates.repoHealth.name',
      'Weekday repo audit'
    ),
    prompt: translate(
      'auto.components.automations.automation.templates.repoHealth.prompt',
      'Review the repository health. Check dependency updates, failing tests, lint/typecheck status, and risky open changes. Summarize findings and suggest the next action.'
    ),
    preset: 'weekdays',
    time: '09:00',
    missedRunGraceMinutes: '720'
  },
  {
    id: 'release-prep-weekly',
    category: translate(
      'auto.components.automations.automation.templates.releasePrep.category',
      'Release prep'
    ),
    label: translate(
      'auto.components.automations.automation.templates.39ed39280a',
      'Release readiness'
    ),
    description: translate(
      'auto.components.automations.automation.templates.513401db93',
      'Prepare a weekly release risk summary from the current project state.'
    ),
    name: translate(
      'auto.components.automations.automation.templates.releasePrep.name',
      'Release readiness review'
    ),
    prompt: translate(
      'auto.components.automations.automation.templates.releasePrep.prompt',
      'Prepare a release readiness summary. Look for blockers, unmerged risky changes, missing validation, and documentation gaps. End with a concise release/no-release recommendation.'
    ),
    preset: 'weekly',
    time: '14:00',
    dayOfWeek: '4',
    missedRunGraceMinutes: '1440'
  },
  {
    id: 'recurring-review-daily',
    category: translate(
      'auto.components.automations.automation.templates.recurringReview.category',
      'Recurring review'
    ),
    label: translate(
      'auto.components.automations.automation.templates.6023075b27',
      'Daily change review'
    ),
    description: translate(
      'auto.components.automations.automation.templates.3b7281c75f',
      'Scan recent work and call out correctness, UX, and test coverage risks.'
    ),
    name: translate(
      'auto.components.automations.automation.templates.recurringReview.name',
      'Daily change review'
    ),
    prompt: translate(
      'auto.components.automations.automation.templates.recurringReview.prompt',
      'Review recent changes in this workspace. Focus on correctness risks, UX regressions, missing tests, and follow-up tasks. Keep the report short and actionable.'
    ),
    preset: 'daily',
    time: '16:30',
    missedRunGraceMinutes: '180'
  },
  {
    id: 'maintenance-hourly',
    category: translate(
      'auto.components.automations.automation.templates.maintenance.category',
      'Maintenance'
    ),
    label: translate(
      'auto.components.automations.automation.templates.8a0228bea3',
      'Hourly queue check'
    ),
    description: translate(
      'auto.components.automations.automation.templates.37571fcb16',
      'Look for stuck work, stale generated files, and failed local validation.'
    ),
    name: translate(
      'auto.components.automations.automation.templates.maintenance.name',
      'Hourly maintenance check'
    ),
    prompt: translate(
      'auto.components.automations.automation.templates.maintenance.prompt',
      'Check for stuck work, stale generated files, failing validation, and anything that needs human attention. Report only actionable issues.'
    ),
    preset: 'hourly',
    time: '00:15',
    missedRunGraceMinutes: '30'
  }
])
