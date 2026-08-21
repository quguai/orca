import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  handleMock,
  discoverSkillsMock,
  discoverSkillsInWslMock,
  inventorySkillFreshnessMock,
  getDefaultWslDistroMock,
  getWslHomeMock,
  parseWslPathMock
} = vi.hoisted(() => ({
  handleMock: vi.fn(),
  discoverSkillsMock: vi.fn(),
  discoverSkillsInWslMock: vi.fn(),
  inventorySkillFreshnessMock: vi.fn(),
  getDefaultWslDistroMock: vi.fn(),
  getWslHomeMock: vi.fn(),
  parseWslPathMock: vi.fn()
}))

vi.mock('electron', () => ({
  app: {
    getVersion: () => '9.9.9-test'
  },
  ipcMain: {
    handle: handleMock
  }
}))

vi.mock('./skill-ipc-main-window', () => ({
  handleMainWindowSkillIpc: (channel: string, handler: unknown) => handleMock(channel, handler)
}))

vi.mock('../skills/discovery', () => ({
  discoverSkills: discoverSkillsMock,
  clearSkillRootScanCache: vi.fn()
}))

vi.mock('../skills/skill-discovery-wsl', () => ({
  discoverSkillsInWsl: discoverSkillsInWslMock
}))

vi.mock('../skills/skill-freshness-inventory', () => ({
  inventorySkillFreshness: inventorySkillFreshnessMock
}))

vi.mock('../wsl', () => ({
  getDefaultWslDistro: getDefaultWslDistroMock,
  getWslHome: getWslHomeMock,
  parseWslPath: parseWslPathMock,
  toLinuxPath: (pathValue: string) => {
    if (pathValue === '\\\\wsl.localhost\\Ubuntu\\home\\alice') {
      return '/home/alice'
    }
    if (pathValue === 'C:\\repo\\worktree') {
      return '/mnt/c/repo/worktree'
    }
    return pathValue
  }
}))

import { registerSkillsHandlers } from './skills'

describe('registerSkillsHandlers', () => {
  const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform')
  const repos = [{ id: 'repo-1', path: 'C:\\Users\\alice\\repo' }]
  const savedSkills = [
    {
      id: 'skill-1',
      name: 'review',
      description: 'Review code',
      providers: ['codex'],
      sourceKind: 'home',
      sourceLabel: 'Codex home',
      rootPath: '/Users/alice/.codex/skills',
      directoryPath: '/Users/alice/.codex/skills/review',
      skillFilePath: '/Users/alice/.codex/skills/review/SKILL.md',
      fileCount: 1,
      discoveredUpdatedAt: 100,
      savedAt: 200,
      updatedAt: 300
    }
  ]
  const skillPresets = [
    {
      id: 'preset-1',
      name: 'Review preset',
      skillIds: ['skill-1'],
      createdAt: 100,
      updatedAt: 200
    }
  ]
  const store = {
    getRepos: vi.fn(() => repos),
    listSavedSkills: vi.fn(() => savedSkills),
    saveSkill: vi.fn((skill) => skill),
    removeSavedSkill: vi.fn(),
    listSkillPresets: vi.fn(() => skillPresets),
    saveSkillPreset: vi.fn((preset) => preset),
    removeSkillPreset: vi.fn()
  }

  beforeEach(() => {
    handleMock.mockReset()
    discoverSkillsMock.mockReset()
    discoverSkillsInWslMock.mockReset()
    getDefaultWslDistroMock.mockReset()
    getWslHomeMock.mockReset()
    store.getRepos.mockClear()
    store.listSavedSkills.mockClear()
    store.saveSkill.mockClear()
    store.removeSavedSkill.mockClear()
    store.listSkillPresets.mockClear()
    store.saveSkillPreset.mockClear()
    store.removeSkillPreset.mockClear()
    parseWslPathMock.mockReset()
    parseWslPathMock.mockReturnValue(null)
    discoverSkillsMock.mockResolvedValue({ skills: [], sources: [], scannedAt: 1 })
    discoverSkillsInWslMock.mockResolvedValue({ skills: [], sources: [], scannedAt: 1 })
    inventorySkillFreshnessMock.mockResolvedValue({
      schemaVersion: 1,
      installations: [],
      eligibleUpdateNames: [],
      scanIssues: [],
      scannedAt: 1
    })
    getWslHomeMock.mockReturnValue('\\\\wsl.localhost\\Ubuntu\\home\\alice')
    Object.defineProperty(process, 'platform', {
      configurable: true,
      value: 'win32'
    })
  })

  afterEach(() => {
    if (originalPlatform) {
      Object.defineProperty(process, 'platform', originalPlatform)
    }
  })

  function getHandler(channel: string) {
    registerSkillsHandlers(store as never)
    const call = handleMock.mock.calls.find((entry: unknown[]) => entry[0] === channel)
    if (!call) {
      throw new Error(`${channel} handler was not registered`)
    }
    return call[1] as (_event: unknown, target?: unknown) => Promise<unknown>
  }

  function getFreshnessHandler() {
    registerSkillsHandlers(store as never)
    const call = handleMock.mock.calls.find(
      (entry: unknown[]) => entry[0] === 'skills:freshnessInventory'
    )
    if (!call) {
      throw new Error('skills:freshnessInventory handler was not registered')
    }
    return call[1] as (_event: unknown) => Promise<unknown>
  }

  it('uses host skill discovery when resolved project runtime overrides stale WSL target state', async () => {
    const handler = getHandler('skills:discover')

    await handler(null, {
      runtime: 'wsl',
      wslDistro: 'Debian',
      projectRuntime: {
        status: 'resolved',
        runtime: {
          kind: 'windows-host',
          hostPlatform: 'win32',
          projectId: 'repo-1',
          reason: 'project-override',
          cacheKey: 'repo-1:windows-host'
        }
      }
    })

    expect(discoverSkillsMock).toHaveBeenCalledWith({ repos, refresh: false })
    expect(getWslHomeMock).not.toHaveBeenCalled()
  })

  it('scopes host skill discovery to the active workspace cwd when provided', async () => {
    const handler = getHandler('skills:discover')

    await handler(null, { cwd: '/repo/worktree' })

    expect(discoverSkillsMock).toHaveBeenCalledWith({
      repos: [],
      cwd: '/repo/worktree',
      refresh: false
    })
  })

  it('uses the selected project WSL distro for skill discovery', async () => {
    const handler = getHandler('skills:discover')

    await handler(null, {
      projectRuntime: {
        status: 'resolved',
        runtime: {
          kind: 'wsl',
          hostPlatform: 'wsl',
          projectId: 'repo-1',
          distro: 'Ubuntu',
          reason: 'project-override',
          cacheKey: 'repo-1:wsl:Ubuntu'
        }
      }
    })

    expect(getDefaultWslDistroMock).not.toHaveBeenCalled()
    expect(getWslHomeMock).toHaveBeenCalledWith('Ubuntu')
    expect(discoverSkillsInWslMock).toHaveBeenCalledWith({
      distro: 'Ubuntu',
      homeDir: '/home/alice',
      cwd: '/home/alice'
    })
  })

  it('scans the requested project directory in the selected WSL runtime', async () => {
    const handler = getHandler('skills:discover')

    await handler(null, {
      cwd: 'C:\\repo\\worktree',
      projectRuntime: {
        status: 'resolved',
        runtime: {
          kind: 'wsl',
          hostPlatform: 'wsl',
          projectId: 'repo-1',
          distro: 'Ubuntu',
          reason: 'project-override',
          cacheKey: 'repo-1:wsl:Ubuntu'
        }
      }
    })

    expect(discoverSkillsInWslMock).toHaveBeenCalledWith({
      distro: 'Ubuntu',
      homeDir: '/home/alice',
      cwd: '/mnt/c/repo/worktree'
    })
  })

  it('blocks skill discovery when project runtime requires repair', async () => {
    const handler = getHandler('skills:discover')

    await expect(
      handler(null, {
        projectRuntime: {
          status: 'repair-required',
          repair: {
            projectId: 'repo-1',
            preferredRuntime: { kind: 'wsl', distro: 'Ubuntu' },
            reason: 'wsl-distro-missing',
            source: 'project-override',
            cacheKey: 'repo-1:repair:wsl-distro-missing:Ubuntu'
          }
        }
      })
    ).rejects.toThrow('Project runtime requires repair before skill discovery')
    expect(discoverSkillsMock).not.toHaveBeenCalled()
  })

  it('lists saved skills from persistence', async () => {
    const handler = getHandler('skills:listSaved')

    expect(handler(null)).toEqual(savedSkills)
    expect(store.listSavedSkills).toHaveBeenCalled()
  })

  it('saves a discovered skill snapshot into persistence', async () => {
    const handler = getHandler('skills:save')

    const result = await handler(null, {
      skill: {
        id: 'skill-2',
        name: 'planner',
        description: 'Plan work',
        providers: ['codex'],
        sourceKind: 'repo',
        sourceLabel: 'Repo orca .agents',
        rootPath: '/repo/.agents/skills',
        directoryPath: '/repo/.agents/skills/planner',
        skillFilePath: '/repo/.agents/skills/planner/SKILL.md',
        installed: true,
        fileCount: 2,
        updatedAt: 999
      }
    })

    expect(store.saveSkill).toHaveBeenCalled()
    expect(result).toMatchObject({
      id: 'skill-2',
      name: 'planner',
      discoveredUpdatedAt: 999
    })
  })

  it('rejects empty preset saves', async () => {
    const handler = getHandler('skills:savePreset')

    expect(() =>
      handler(null, {
        name: 'Empty preset',
        skillIds: []
      })
    ).toThrow('Select at least one saved skill')
  })

  it('saves a preset with saved skill ids only', async () => {
    const handler = getHandler('skills:savePreset')

    const result = await handler(null, {
      name: ' Review preset ',
      skillIds: ['skill-1', 'missing-skill', 'skill-1']
    })

    expect(store.saveSkillPreset).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Review preset',
        skillIds: ['skill-1']
      })
    )
    expect(result).toMatchObject({
      name: 'Review preset',
      skillIds: ['skill-1']
    })
  })

  it('keeps freshness inventory local and read-only over known repositories', async () => {
    const handler = getFreshnessHandler()

    await handler(null)

    expect(inventorySkillFreshnessMock).toHaveBeenCalledWith({
      currentAppVersion: '9.9.9-test',
      repos
    })
    expect(getWslHomeMock).not.toHaveBeenCalled()
  })
})
