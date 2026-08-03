// Cards for Aone-side integrations (task tracker + code review). Both share
// the same source of truth — the local `a1` CLI — so the cards expose status
// derived from the aone:getStatus IPC channel rather than per-token config.
//
// First pass keeps the UI minimal: a single "Aone (a1 CLI)" status indicator
// reused for both the task-provider and review-provider sections.

import { useEffect, useState } from 'react'
import { Briefcase, GitPullRequestArrow } from 'lucide-react'
import { IntegrationCardDetails, IntegrationCardShell } from './integration-card-shell'
import { translate } from '@/i18n/i18n'

export type AoneStatus =
  | { kind: 'checking' }
  | { kind: 'missing' }
  | { kind: 'unauthenticated' }
  | { kind: 'connected'; project?: string | null; repoPath?: string | null }
  | { kind: 'error'; message: string }

function describeLink(link: unknown): { project?: string | null; repoPath?: string | null } {
  if (!link || typeof link !== 'object') {
    return {}
  }
  const obj = link as {
    project?: { name?: string | null } | null
    repo?: { path?: string | null } | null
  }
  return {
    project: obj.project?.name ?? null,
    repoPath: obj.repo?.path ?? null
  }
}

export function useAoneStatus(): { status: AoneStatus; refresh: () => void } {
  const [status, setStatus] = useState<AoneStatus>({ kind: 'checking' })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    const api = (window as unknown as { api?: { aone?: { getStatus?: () => Promise<unknown> } } })
      .api
    if (!api?.aone?.getStatus) {
      setStatus({ kind: 'missing' })
      return
    }
    api.aone
      .getStatus()
      .then((result) => {
        if (cancelled) {
          return
        }
        const r = result as
          | { ok: true; installed: boolean; link: unknown }
          | { ok: false; code: string; error: string }
        if (r.ok === false) {
          if (r.code === 'auth_required') {
            setStatus({ kind: 'unauthenticated' })
            return
          }
          if (r.code === 'binary_missing') {
            setStatus({ kind: 'missing' })
            return
          }
          setStatus({ kind: 'error', message: r.error })
          return
        }
        if (!r.installed) {
          setStatus({ kind: 'missing' })
          return
        }
        if (!r.link) {
          setStatus({ kind: 'unauthenticated' })
          return
        }
        setStatus({ kind: 'connected', ...describeLink(r.link) })
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }
        setStatus({
          kind: 'error',
          message: error instanceof Error ? error.message : String(error)
        })
      })
    return () => {
      cancelled = true
    }
  }, [tick])

  return { status, refresh: () => setTick((value) => value + 1) }
}

type StatusPresentation = {
  tone: 'connected' | 'attention'
  label: string
  description: string
  details: string | null
}

function presentStatus(status: AoneStatus, baseDescription: string): StatusPresentation {
  switch (status.kind) {
    case 'checking':
      return {
        tone: 'attention',
        label: translate('auto.aone.checking', 'Checking…'),
        description: baseDescription,
        details: null
      }
    case 'missing':
      return {
        tone: 'attention',
        label: translate('auto.aone.notInstalled', 'a1 CLI not installed'),
        description: baseDescription,
        details: translate(
          'auto.aone.installHint',
          'Install: curl -fsSL https://git.cn-hangzhou.oss-cdn.aliyun-inc.com/aone-cli/install.sh | sh'
        )
      }
    case 'unauthenticated':
      return {
        tone: 'attention',
        label: translate('auto.aone.signedOut', 'Sign-in required'),
        description: baseDescription,
        details: translate(
          'auto.aone.signInHint',
          'Run `a1 auth login --buc` in a terminal to authenticate.'
        )
      }
    case 'error':
      return {
        tone: 'attention',
        label: translate('auto.aone.errorLabel', 'Error'),
        description: baseDescription,
        details: status.message
      }
    case 'connected': {
      const target = status.project ?? status.repoPath ?? 'a1 CLI'
      return {
        tone: 'connected',
        label: translate('auto.aone.connected', 'Connected'),
        description: translate('auto.aone.connectedDescription', 'Linked: {{value0}}', {
          value0: target
        }),
        details: null
      }
    }
  }
}

export function AoneTaskIntegrationCard(): React.JSX.Element {
  const { status } = useAoneStatus()
  const baseDescription = translate(
    'auto.aone.taskCard.baseDescription',
    'Browse Aone work items via the local a1 CLI. Run `a1 auth login --buc` and `a1 link` first.'
  )
  const presentation = presentStatus(status, baseDescription)
  return (
    <IntegrationCardShell
      icon={<Briefcase className="size-5" />}
      name="Aone (Tasks)"
      description={presentation.description}
      checking={status.kind === 'checking'}
      statusTone={presentation.tone}
      statusLabel={presentation.label}
    >
      {presentation.details ? (
        <IntegrationCardDetails>
          <p className="text-xs text-muted-foreground">{presentation.details}</p>
        </IntegrationCardDetails>
      ) : null}
    </IntegrationCardShell>
  )
}

export function AoneCodeIntegrationCard(): React.JSX.Element {
  const { status } = useAoneStatus()
  const baseDescription = translate(
    'auto.aone.codeCard.baseDescription',
    'Merge requests and review status from Aone Code via the local a1 CLI.'
  )
  const presentation = presentStatus(status, baseDescription)
  return (
    <IntegrationCardShell
      icon={<GitPullRequestArrow className="size-5" />}
      name="Aone Code"
      description={presentation.description}
      checking={status.kind === 'checking'}
      statusTone={presentation.tone}
      statusLabel={presentation.label}
    >
      {presentation.details ? (
        <IntegrationCardDetails>
          <p className="text-xs text-muted-foreground">{presentation.details}</p>
        </IntegrationCardDetails>
      ) : null}
    </IntegrationCardShell>
  )
}
