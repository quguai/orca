import type * as ReactModule from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FLOATING_TERMINAL_WORKTREE_ID } from '../../../shared/constants'

const mockLaunchAgentBackgroundSession = vi.fn()
const mockLaunchWorktreeBackgroundTerminals = vi.fn()
const mockSubmitPromptToAgentPty = vi.fn()
const mockFindReusableAutomationSession = vi.fn()
const mockObserveExistingAutomationSession = vi.fn()
const mockCreateWorktree = vi.fn()
const mockMarkDispatchResult = vi.fn()
const mockOnDispatchRequested = vi.fn()
const mockRendererReady = vi.fn()
const mockCollectWeeklyReportEvidence = vi.fn()
const mockBuildWeeklyReportPrompt = vi.fn()
const mockFinalizeTerminalOwnership = vi.fn()
const mockReleaseTerminalOwnership = vi.fn()
const mockSshNeedsPassphrasePrompt = vi.fn()
const mockSshGetState = vi.fn()
const mockSshConnect = vi.fn()
const mockStoreSubscribe = vi.fn(() => () => {})

const state = {
  activeView: 'terminal' as const,
  activeWorktreeId: 'wt-active',
  activeTabId: 'tab-active',
  activeTabType: 'terminal' as const,
  repos: [{ id: 'repo-1', connectionId: null, executionHostId: null, path: '/repo' }],
  folderWorkspaces: [],
  projectGroups: [],
  worktreesByRepo: {},
  detectedWorktreesByRepo: {},
  agentStatusByPaneKey: {},
  allWorktrees: vi.fn(() => []),
  getKnownWorktreeById: vi.fn(() => undefined),
  fetchAllWorktrees: vi.fn(),
  fetchHostedReviewForBranch: vi.fn(),
  settings: null,
  createWorktree: mockCreateWorktree,
  subscribe: vi.fn(() => () => {}),
  setActiveView: vi.fn(),
  setActiveWorktree: vi.fn(),
  setActiveTab: vi.fn(),
  setActiveTabType: vi.fn()
}

function makeAutomation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'automation-1',
    projectId: 'repo-1',
    prompt: 'run this',
    precheck: null,
    agentId: 'claude',
    workspaceMode: 'new_per_run',
    workspaceId: null,
    baseBranch: null,
    setupDecision: 'run',
    reuseSession: false,
    ...overrides
  }
}

function makeRun() {
  return {
    id: 'run-1',
    automationId: 'automation-1',
    title: 'Nightly setup run',
    scheduledFor: Date.parse('2026-06-24T03:00:00Z'),
    trigger: 'scheduled',
    workspaceId: null,
    workspaceDisplayName: null
  }
}

async function registerAndDispatch(automation = makeAutomation()): Promise<void> {
  vi.doMock('react', async () => {
    const actual = await vi.importActual<typeof ReactModule>('react')
    return {
      ...actual,
      useEffect: (effect: () => void | (() => void)) => {
        effect()
      }
    }
  })
  const { useAutomationDispatchEvents: registerAutomationDispatchEvents } =
    await import('./useAutomationDispatchEvents')
  registerAutomationDispatchEvents()
  const handler = mockOnDispatchRequested.mock.calls[0]?.[0]
  if (!handler) {
    throw new Error('dispatch handler was not registered')
  }
  await handler({
    automation,
    run: makeRun(),
    dispatchToken: 'dispatch-token'
  })
}

vi.mock('@/lib/launch-agent-background-session', () => ({
  launchAgentBackgroundSession: mockLaunchAgentBackgroundSession
}))

vi.mock('@/lib/launch-worktree-background-terminals', () => ({
  launchWorktreeBackgroundTerminals: mockLaunchWorktreeBackgroundTerminals
}))

vi.mock('@/lib/agent-paste-draft', () => ({
  submitPromptToAgentPty: mockSubmitPromptToAgentPty
}))

// The reuse path reads run history over the local runtime target, not IPC.
vi.mock('@/components/automations/automation-host-client', () => ({
  listAutomationRunsForTarget: vi.fn().mockResolvedValue([])
}))

vi.mock('@/lib/automation-session-reuse', () => ({
  findReusableAutomationSession: mockFindReusableAutomationSession
}))

vi.mock('@/lib/automation-session-observer', () => ({
  observeExistingAutomationSession: mockObserveExistingAutomationSession
}))

vi.mock('@/components/automations/automation-run-output-snapshot', () => ({
  createAutomationRunOutputSnapshotBuffer: () => ({
    append: vi.fn(),
    snapshot: () => null
  }),
  selectAutomationRunOutputSnapshot: (
    assistantMessage: string | null | undefined,
    terminalSnapshot: unknown
  ) =>
    assistantMessage
      ? {
          format: 'plain_text',
          content: assistantMessage,
          capturedAt: 1,
          truncated: false
        }
      : terminalSnapshot
}))

vi.mock('@/components/automations/automation-weekly-report-context', () => ({
  collectWeeklyReportEvidence: mockCollectWeeklyReportEvidence,
  buildWeeklyReportPrompt: mockBuildWeeklyReportPrompt
}))

vi.mock('@/i18n/i18n', () => ({
  translate: (_key: string, fallback: string) => fallback
}))

vi.mock('@/lib/browser-uuid', () => ({
  createBrowserUuid: () => 'create-request-id'
}))

vi.mock('@/store', () => ({
  useAppStore: {
    getState: () => state,
    subscribe: mockStoreSubscribe
  }
}))

describe('useAutomationDispatchEvents global scope', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    state.repos = [{ id: 'repo-1', connectionId: null, executionHostId: null, path: '/repo' }]
    state.folderWorkspaces = []
    state.projectGroups = []
    state.worktreesByRepo = {}
    state.agentStatusByPaneKey = {}
    state.allWorktrees.mockReturnValue([])
    state.getKnownWorktreeById.mockReturnValue(undefined)
    state.fetchAllWorktrees.mockResolvedValue(undefined)
    mockCollectWeeklyReportEvidence.mockResolvedValue({ workspaces: [] })
    mockBuildWeeklyReportPrompt.mockReturnValue('run this with weekly evidence')
    mockLaunchWorktreeBackgroundTerminals.mockResolvedValue(undefined)
    mockLaunchAgentBackgroundSession.mockResolvedValue({
      tabId: 'agent-tab',
      paneKey: 'agent-tab:7c6fb4e5-3bf1-4ff4-8259-03f7ae81c40d',
      ptyId: 'agent-pty',
      startupPlan: {},
      terminalOwnership: {
        finalize: mockFinalizeTerminalOwnership,
        release: mockReleaseTerminalOwnership
      }
    })
    mockOnDispatchRequested.mockReturnValue(() => {})
    mockSshNeedsPassphrasePrompt.mockResolvedValue(false)
    mockSshGetState.mockResolvedValue({ status: 'connected' })
    mockSshConnect.mockResolvedValue({ status: 'connected' })
    mockSubmitPromptToAgentPty.mockResolvedValue(true)
    vi.stubGlobal('window', {
      api: {
        automations: {
          onDispatchRequested: mockOnDispatchRequested,
          rendererReady: mockRendererReady,
          markDispatchResult: mockMarkDispatchResult,
          runPrecheck: vi.fn()
        },
        ssh: {
          needsPassphrasePrompt: mockSshNeedsPassphrasePrompt,
          getState: mockSshGetState,
          connect: mockSshConnect
        }
      }
    })
  })

  it('enriches weekly-report prompts with cross-project evidence before launch', async () => {
    await registerAndDispatch(makeAutomation({ kind: 'weekly_report' }))
    expect(state.fetchAllWorktrees).toHaveBeenCalled()
    expect(mockCollectWeeklyReportEvidence).toHaveBeenCalledWith(
      expect.objectContaining({ scheduledFor: makeRun().scheduledFor })
    )
    expect(mockLaunchAgentBackgroundSession).toHaveBeenCalledWith(
      expect.objectContaining({
        worktreeId: FLOATING_TERMINAL_WORKTREE_ID,
        prompt: 'run this with weekly evidence'
      })
    )
    expect(mockCreateWorktree).not.toHaveBeenCalled()
    expect(mockLaunchWorktreeBackgroundTerminals).not.toHaveBeenCalled()
    expect(mockMarkDispatchResult).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-1',
        status: 'dispatched',
        workspaceId: FLOATING_TERMINAL_WORKTREE_ID,
        workspaceDisplayName: 'Floating Workspace'
      })
    )
  })

  it('runs projectless global tasks without injecting Orca weekly evidence', async () => {
    await registerAndDispatch(
      makeAutomation({
        kind: 'global_task',
        projectId: '',
        runContext: null,
        setupDecision: 'skip'
      })
    )
    expect(state.fetchAllWorktrees).not.toHaveBeenCalled()
    expect(mockCollectWeeklyReportEvidence).not.toHaveBeenCalled()
    expect(mockBuildWeeklyReportPrompt).not.toHaveBeenCalled()
    expect(mockLaunchAgentBackgroundSession).toHaveBeenCalledWith(
      expect.objectContaining({ worktreeId: FLOATING_TERMINAL_WORKTREE_ID, prompt: 'run this' })
    )
    expect(mockCreateWorktree).not.toHaveBeenCalled()
  })
})
