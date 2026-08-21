import fs from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { CentralSkill, ToolInfo } from '../../shared/skills'
import { hashDirectory } from './content-hash'
import {
  defaultInstalledSkillRoots,
  importUnmanagedInstalledSkills,
  type InstalledSkillRoot
} from './installed-skill-import'
import { createLocalRecord, defaultStore, deduplicateByName, recordToCentral } from './skills-store'
import type { SkillRecord, SkillsStore } from './skills-store'
import { migrateIfNeeded } from './migration'
import { syncSkill, removeTarget, targetDirName, detectExistingTargets } from './sync-engine'
import {
  getDefaultAdapters,
  getEnabledInstalledAdapters,
  getSkillsDir,
  isToolInstalled,
  type SkillSettingsAccessor
} from './tool-adapters'

export type { SkillRecord, SkillsStore } from './skills-store'

const DEFAULT_CENTRAL_REPO = path.join(os.homedir(), '.orca', 'skills')

export class SkillsRepository {
  private storePath: string
  private data: SkillsStore | null = null

  constructor(storePath?: string) {
    this.storePath = storePath ?? path.join(os.homedir(), '.orca', 'skills-store.json')
  }

  private async load(): Promise<SkillsStore> {
    if (this.data) {
      return this.data
    }
    try {
      const raw = await fs.readFile(this.storePath, 'utf-8')
      this.data = JSON.parse(raw) as SkillsStore
    } catch {
      this.data = defaultStore()
    }
    return this.data
  }

  private async save(): Promise<void> {
    if (!this.data) {
      return
    }
    await fs.mkdir(path.dirname(this.storePath), { recursive: true })
    await fs.writeFile(this.storePath, JSON.stringify(this.data, null, 2), 'utf-8')
  }

  async getCentralRepoPath(): Promise<string> {
    const store = await this.load()
    return store.settings.central_repo_path ?? DEFAULT_CENTRAL_REPO
  }

  async ensureCentralRepo(): Promise<string> {
    const repoPath = await this.getCentralRepoPath()
    await fs.mkdir(repoPath, { recursive: true })
    await migrateIfNeeded(repoPath)
    return repoPath
  }

  createSettingsAccessor(): SkillSettingsAccessor {
    const data = this.data ?? defaultStore()
    return { getSetting: (key: string) => data.settings[key] ?? null }
  }

  async listSkills(): Promise<CentralSkill[]> {
    const store = await this.load()
    return store.skills.map(recordToCentral)
  }

  async getSkill(id: string): Promise<CentralSkill | null> {
    const store = await this.load()
    const record = store.skills.find((s) => s.id === id)
    return record ? recordToCentral(record) : null
  }

  async upsertSkill(record: SkillRecord): Promise<CentralSkill> {
    const store = await this.load()
    const idx = store.skills.findIndex((s) => s.id === record.id)
    if (idx !== -1) {
      store.skills[idx] = record
    } else {
      store.skills.push(record)
    }
    await this.save()
    return recordToCentral(record)
  }

  async deleteSkill(id: string): Promise<void> {
    const store = await this.load()
    const skill = store.skills.find((s) => s.id === id)
    if (!skill) {
      return
    }

    for (const target of skill.targets) {
      const adapter = getDefaultAdapters().find((a) => a.key === target.tool)
      if (adapter) {
        const toolDir = getSkillsDir(adapter)
        const dirName = targetDirName(skill.centralPath, skill.name)
        const targetPath = path.join(toolDir, dirName)
        await removeTarget(targetPath)
      }
    }

    try {
      await fs.rm(skill.centralPath, { recursive: true, force: true })
    } catch {
      // central path may already be gone
    }

    store.skills = store.skills.filter((s) => s.id !== id)
    await this.save()
  }

  async syncSkillToAllEnabledTools(id: string): Promise<void> {
    const store = await this.load()
    const skill = store.skills.find((s) => s.id === id)
    if (!skill) {
      return
    }

    const settings = this.createSettingsAccessor()
    const adapters = getEnabledInstalledAdapters(settings)
    const targets: { tool: string; status: string }[] = []

    for (const adapter of adapters) {
      const toolDir = getSkillsDir(adapter)
      const dirName = targetDirName(skill.centralPath, skill.name)
      const targetPath = path.join(toolDir, dirName)
      const result = await syncSkill(skill.centralPath, targetPath)
      targets.push({
        tool: adapter.key,
        status: result.success ? 'synced' : 'error'
      })
    }

    skill.targets = targets
    await this.save()
  }

  async syncToTool(skillId: string, toolKey: string): Promise<void> {
    const store = await this.load()
    const skill = store.skills.find((s) => s.id === skillId)
    if (!skill) {
      throw new Error(`Skill ${skillId} not found`)
    }

    const adapter = getDefaultAdapters().find((a) => a.key === toolKey)
    if (!adapter) {
      throw new Error(`Tool ${toolKey} not found`)
    }

    const toolDir = getSkillsDir(adapter)
    const dirName = targetDirName(skill.centralPath, skill.name)
    const targetPath = path.join(toolDir, dirName)
    const result = await syncSkill(skill.centralPath, targetPath)

    const existing = skill.targets.findIndex((t) => t.tool === toolKey)
    const entry = { tool: toolKey, status: result.success ? 'synced' : 'error' }
    if (existing !== -1) {
      skill.targets[existing] = entry
    } else {
      skill.targets.push(entry)
    }
    await this.save()
  }

  async unsyncFromTool(skillId: string, toolKey: string): Promise<void> {
    const store = await this.load()
    const skill = store.skills.find((s) => s.id === skillId)
    if (!skill) {
      return
    }

    const adapter = getDefaultAdapters().find((a) => a.key === toolKey)
    if (adapter) {
      const toolDir = getSkillsDir(adapter)
      const dirName = targetDirName(skill.centralPath, skill.name)
      const targetPath = path.join(toolDir, dirName)
      await removeTarget(targetPath)
    }

    skill.targets = skill.targets.filter((t) => t.tool !== toolKey)
    await this.save()
  }

  async getToolsStatus(): Promise<ToolInfo[]> {
    await this.load()
    const settings = this.createSettingsAccessor()
    const adapters = getDefaultAdapters()

    return adapters
      .filter((a) => isToolInstalled(a))
      .map((adapter): ToolInfo => {
        const disabledKey = `tool_disabled_${adapter.key}`
        const disabled = settings.getSetting(disabledKey)
        return {
          key: adapter.key,
          displayName: adapter.displayName,
          installed: true,
          enabled: disabled !== 'true',
          category: adapter.category
        }
      })
  }

  async updateSkillStatus(
    skillId: string,
    updates: Partial<Pick<SkillRecord, 'updateStatus' | 'remoteRevision' | 'contentHash'>>
  ): Promise<void> {
    const store = await this.load()
    const skill = store.skills.find((s) => s.id === skillId)
    if (!skill) {
      return
    }
    Object.assign(skill, updates, { updatedAt: Date.now() })
    await this.save()
  }

  async scanInstalledSkills(
    roots: readonly InstalledSkillRoot[] = defaultInstalledSkillRoots()
  ): Promise<CentralSkill[]> {
    await this.scanCentralRepo()
    const centralRepo = await this.ensureCentralRepo()
    const store = await this.load()
    const imported = await importUnmanagedInstalledSkills({
      centralRepoPath: centralRepo,
      existingNames: new Set(store.skills.map((skill) => skill.name)),
      roots
    })
    store.skills.push(...imported)
    await this.save()
    return imported.map(recordToCentral)
  }

  async scanCentralRepo(): Promise<void> {
    const centralRepo = await this.ensureCentralRepo()
    const store = await this.load()

    let entries: Dirent<string>[]
    try {
      entries = (await fs.readdir(centralRepo, {
        withFileTypes: true,
        encoding: 'utf-8'
      })) as Dirent<string>[]
    } catch {
      return
    }

    store.skills = deduplicateByName(store.skills, centralRepo)
    const existingPaths = new Set(store.skills.map((s) => s.centralPath))
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) {
        continue
      }
      const dirPath = path.join(centralRepo, entry.name)
      if (existingPaths.has(dirPath)) {
        continue
      }

      const existingIdx = store.skills.findIndex((s) => s.name === entry.name)
      if (existingIdx !== -1) {
        store.skills[existingIdx].centralPath = dirPath
      } else {
        store.skills.push(createLocalRecord(entry.name, dirPath, await hashDirectory(dirPath)))
      }
    }

    const validSkills: typeof store.skills = []
    for (const s of store.skills) {
      try {
        await fs.access(s.centralPath)
        validSkills.push(s)
      } catch {
        // skill directory no longer exists
      }
    }
    store.skills = validSkills

    const installedAdapters = getDefaultAdapters().filter((a) => isToolInstalled(a))
    const targetMap = await detectExistingTargets(centralRepo, installedAdapters, getSkillsDir)
    for (const skill of store.skills) {
      const detected = targetMap.get(skill.centralPath)
      if (detected) {
        skill.targets = detected
      }
    }

    await this.save()
  }
}
