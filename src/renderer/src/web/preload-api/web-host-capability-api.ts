import type {
  PreflightStatus,
  PreloadApi,
  RefreshAgentsResult
} from '../../../../preload/api-types'
import type {
  ComputerUsePermissionSetupResult,
  ComputerUsePermissionStatusResult
} from '../../../../shared/computer-use-permissions-types'
import type { SkillFreshnessInventory } from '../../../../shared/skill-freshness'
import type {
  DiscoveredSkill,
  SavedSkill,
  SkillDiscoveryResult,
  SkillPreset
} from '../../../../shared/skills'
import type { SkillDeletePlan, SkillDeleteResult } from '../../../../shared/skill-delete-contract'
import { SKILL_DELETE_CAPABILITY } from '../../../../shared/skill-install-capability'
import { callRuntimeResult, getRemoteRuntimeStatus } from './web-runtime-calls'
import { requireActiveEnvironmentOrNull } from './web-runtime-session'
import { getBrowserPlatform } from './web-storage'

export function createPreflightApi(): NonNullable<Partial<PreloadApi>['preflight']> {
  const fallbackStatus: PreflightStatus = {
    git: { installed: false },
    gh: { installed: false, authenticated: false },
    glab: { installed: false, authenticated: false },
    bitbucket: { configured: false, authenticated: false, account: null },
    azureDevOps: {
      configured: false,
      authenticated: false,
      account: null,
      baseUrl: null,
      tokenConfigured: false
    },
    gitea: {
      configured: false,
      authenticated: false,
      account: null,
      baseUrl: null,
      tokenConfigured: false
    }
  }
  const fallbackRefreshAgents: RefreshAgentsResult = {
    agents: [],
    addedPathSegments: [],
    shellHydrationOk: false,
    pathSource: 'sync_seed_only',
    pathFailureReason: 'spawn_error'
  }
  type WindowsTerminalCapabilityBridgeResult = {
    wslAvailable: boolean
    wslDistros: string[]
    pwshAvailable: boolean
    gitBashAvailable: boolean
    hostPlatform: NodeJS.Platform | null
  }
  const fallbackWindowsTerminalCapabilities = {
    wslAvailable: false,
    wslDistros: [],
    pwshAvailable: false,
    gitBashAvailable: false,
    hostPlatform: null
  }
  return {
    check: async (args) => {
      if (!requireActiveEnvironmentOrNull()) {
        return fallbackStatus
      }
      return callRuntimeResult<PreflightStatus>('preflight.check', args)
    },
    detectAgents: async () => {
      if (!requireActiveEnvironmentOrNull()) {
        return []
      }
      return callRuntimeResult<string[]>('preflight.detectAgents').catch(() => [])
    },
    refreshAgents: () =>
      requireActiveEnvironmentOrNull()
        ? callRuntimeResult('preflight.refreshAgents')
            .then((result) => result as RefreshAgentsResult)
            .catch(() => fallbackRefreshAgents)
        : Promise.resolve(fallbackRefreshAgents),
    detectRemoteAgents: async (args) =>
      requireActiveEnvironmentOrNull()
        ? callRuntimeResult<string[]>('preflight.detectRemoteAgents', args).catch(() => [])
        : [],
    detectRemoteWindowsTerminalCapabilities: async (args) =>
      requireActiveEnvironmentOrNull()
        ? callRuntimeResult<WindowsTerminalCapabilityBridgeResult>(
            'preflight.detectRemoteWindowsTerminalCapabilities',
            args
          ).catch(() => fallbackWindowsTerminalCapabilities)
        : Promise.resolve(fallbackWindowsTerminalCapabilities)
  }
}

export function createDeveloperPermissionsApi(): NonNullable<
  Partial<PreloadApi>['developerPermissions']
> {
  return {
    getStatus: () => Promise.resolve([]),
    request: ({ id }) =>
      Promise.resolve({ id, status: 'unsupported', openedSystemSettings: false } as const),
    openSettings: () => Promise.resolve(),
    testLocalNetworkConnection: ({ host, port }) =>
      Promise.resolve({
        ok: false,
        host,
        port,
        testedAt: Date.now(),
        failure: 'unsupported'
      } as const)
  }
}

export function createComputerUsePermissionsApi(): NonNullable<
  Partial<PreloadApi>['computerUsePermissions']
> {
  return {
    getStatus: () =>
      callRuntimeResult<ComputerUsePermissionStatusResult>(
        'computer.permissionsStatus',
        {},
        15_000
      ),
    openSetup: (args) =>
      callRuntimeResult<ComputerUsePermissionSetupResult>(
        'computer.permissions',
        args ?? {},
        15_000
      ).catch(() => ({
        platform: getBrowserPlatform(),
        helperAppPath: null,
        openedSettings: false,
        launchedHelper: false,
        nextStep: 'Computer-use permissions are managed on the Orca server.'
      })),
    reset: () =>
      Promise.resolve({
        platform: getBrowserPlatform(),
        helperAppPath: null,
        helperUnavailableReason: 'web_client',
        bundleId: null,
        permissions: []
      })
  }
}

export function createSkillsApi(): NonNullable<Partial<PreloadApi>['skills']> {
  const localOnly = (): Promise<never> =>
    Promise.reject(new Error('Skill management is only available in the desktop app.'))
  return {
    discover: (target) =>
      callRuntimeResult<SkillDiscoveryResult>('skills.discover', target, 15_000),
    listSaved: () => Promise.resolve([] satisfies SavedSkill[]),
    save: (args: { skill: DiscoveredSkill }) => {
      const now = Date.now()
      return Promise.resolve({
        id: args.skill.id,
        name: args.skill.name,
        description: args.skill.description,
        providers: [...args.skill.providers],
        sourceKind: args.skill.sourceKind,
        sourceLabel: args.skill.sourceLabel,
        rootPath: args.skill.rootPath,
        directoryPath: args.skill.directoryPath,
        skillFilePath: args.skill.skillFilePath,
        fileCount: args.skill.fileCount ?? 0,
        discoveredUpdatedAt: args.skill.updatedAt,
        savedAt: now,
        updatedAt: now
      } satisfies SavedSkill)
    },
    remove: () => Promise.resolve(),
    listPresets: () => Promise.resolve([] satisfies SkillPreset[]),
    savePreset: (args: { id?: string; name: string; skillIds: string[] }) =>
      Promise.resolve({
        id: args.id ?? 'web-skill-preset',
        name: args.name,
        skillIds: [...args.skillIds],
        createdAt: Date.now(),
        updatedAt: Date.now()
      } satisfies SkillPreset),
    removePreset: () => Promise.resolve(),
    list: () => Promise.resolve([]),
    getDocument: () => Promise.resolve(null),
    deleteCentral: () => Promise.resolve(),
    installLocal: localOnly,
    installGit: localOnly,
    installFromMarketplace: localOnly,
    previewGitInstall: localOnly,
    confirmGitInstall: localOnly,
    checkUpdate: localOnly,
    checkAllUpdates: () => Promise.resolve(),
    scanInstalledSkills: () => Promise.resolve([]),
    batchImportFolder: () => Promise.resolve([]),
    syncToTool: () => Promise.resolve(),
    unsyncFromTool: () => Promise.resolve(),
    getToolsStatus: () => Promise.resolve([]),
    marketplaceFetchLeaderboard: () => Promise.resolve([]),
    marketplaceSearch: () => Promise.resolve([]),
    // Why: browser clients have no local skill homes; remote-host freshness stays off until its update rail covers it.
    freshnessInventory: (): Promise<SkillFreshnessInventory> =>
      Promise.resolve({
        schemaVersion: 1,
        installations: [],
        eligibleUpdateNames: [],
        scanIssues: [],
        scannedAt: Date.now()
      }),
    // Why: with no local skill homes there is nothing to update, so the run rail
    // reports a permanently idle state rather than spawning anything.
    startUpdateRun: () => Promise.resolve({ started: false as const, reason: 'invalid-names' }),
    cancelUpdateRun: () => Promise.resolve(),
    acknowledgeUpdateRun: () => Promise.resolve(),
    getUpdateRun: () => Promise.resolve({ state: 'idle' as const }),
    prepareShare: () => Promise.reject(new Error('Skill publishing requires the desktop app.')),
    publishShare: () => Promise.reject(new Error('Skill publishing requires the desktop app.')),
    cancelShare: () => Promise.resolve(),
    releaseShare: () => Promise.resolve(),
    resolveShare: () => Promise.reject(new Error('Skill share links require the desktop app.')),
    installShare: () => Promise.reject(new Error('Skill installation requires the desktop app.')),
    installBundleShare: () =>
      Promise.reject(new Error('Skill installation requires the desktop app.')),
    installPackageVersion: () =>
      Promise.reject(new Error('Skill installation requires the desktop app.')),
    installBundlePackageVersion: () =>
      Promise.reject(new Error('Skill installation requires the desktop app.')),
    cancelInstall: () => Promise.resolve({ cancelled: false }),
    previewInstall: () => Promise.reject(new Error('Skill installation requires the desktop app.')),
    previewBundleInstall: () =>
      Promise.reject(new Error('Skill installation requires the desktop app.')),
    removeInstall: () => Promise.reject(new Error('Skill installation requires the desktop app.')),
    // Disable deletion when the paired host predates the capability.
    deleteSupported: async () => {
      const status = await getRemoteRuntimeStatus().catch(() => null)
      return status?.capabilities?.includes(SKILL_DELETE_CAPABILITY) === true
    },
    previewDelete: (request) =>
      callRuntimeResult<SkillDeletePlan>('skills.previewDelete', request, 60_000),
    delete: (request) => callRuntimeResult<SkillDeleteResult>('skills.delete', request, 5 * 60_000),
    listManagedInstalls: () =>
      Promise.reject(new Error('Skill installation requires the desktop app.')),
    getPackage: () => Promise.reject(new Error('Skill installation requires the desktop app.')),
    listOwnedShares: () =>
      Promise.reject(new Error('Skill package management requires the desktop app.')),
    revokeShare: () =>
      Promise.reject(new Error('Skill package management requires the desktop app.')),
    deletePackageVersion: () =>
      Promise.reject(new Error('Skill package management requires the desktop app.')),
    deletePackage: () =>
      Promise.reject(new Error('Skill package management requires the desktop app.')),
    listWslDistros: () => Promise.resolve([]),
    onInstallProgress: () => () => {},
    onShareProgress: () => () => {},
    onUpdateRun: () => () => {}
  }
}
