import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ipcMain } from 'electron'
import type { Store } from '../persistence'
import { parseGitSource, resolveRemoteRevision } from '../skills/git-fetcher'
import { SkillsRepository } from '../skills/skills-repository'
import type { CentralSkill, ToolInfo } from '../../shared/skills'
import { registerSkillsInstallHandlers } from './skills-install-handlers'

const DOC_NAMES = ['SKILL.md', 'skill.md', 'CLAUDE.md', 'claude.md', 'README.md', 'readme.md']

export function registerCentralSkillsHandlers(_store: Store): void {
  const repo = new SkillsRepository()

  ipcMain.handle('skills:list', async (): Promise<CentralSkill[]> => {
    await repo.scanCentralRepo()
    return repo.listSkills()
  })

  ipcMain.handle(
    'skills:getDocument',
    async (_event, args: { skillId: string }): Promise<string | null> => {
      const skill = await repo.getSkill(args.skillId)
      if (!skill?.centralPath) {
        return null
      }

      for (const name of DOC_NAMES) {
        try {
          return await readFile(join(skill.centralPath, name), 'utf-8')
        } catch {
          // try next
        }
      }
      return null
    }
  )

  ipcMain.handle('skills:delete', async (_event, args: { skillId: string }): Promise<void> => {
    await repo.deleteSkill(args.skillId)
  })

  ipcMain.handle(
    'skills:checkUpdate',
    async (_event, args: { skillId: string }): Promise<CentralSkill> => {
      const skill = await repo.getSkill(args.skillId)
      if (!skill) {
        throw new Error(`Skill ${args.skillId} not found`)
      }

      if ((skill.sourceType === 'git' || skill.sourceType === 'skillssh') && skill.sourceRef) {
        const source = parseGitSource(skill.sourceRef)
        const remoteRev = await resolveRemoteRevision(
          source.cloneUrl,
          skill.sourceBranch ?? undefined
        )
        if (remoteRev) {
          const hasUpdate = remoteRev !== skill.sourceRevision
          await repo.updateSkillStatus(args.skillId, {
            remoteRevision: remoteRev,
            updateStatus: hasUpdate ? 'update_available' : 'up_to_date'
          })
        }
      }

      const updated = await repo.getSkill(args.skillId)
      return updated ?? skill
    }
  )

  ipcMain.handle('skills:checkAllUpdates', async (): Promise<void> => {
    const skills = await repo.listSkills()
    for (const skill of skills) {
      if ((skill.sourceType === 'git' || skill.sourceType === 'skillssh') && skill.sourceRef) {
        const source = parseGitSource(skill.sourceRef)
        const remoteRev = await resolveRemoteRevision(
          source.cloneUrl,
          skill.sourceBranch ?? undefined
        )
        if (remoteRev) {
          const hasUpdate = remoteRev !== skill.sourceRevision
          await repo.updateSkillStatus(skill.id, {
            remoteRevision: remoteRev,
            updateStatus: hasUpdate ? 'update_available' : 'up_to_date'
          })
        }
      }
    }
  })

  ipcMain.handle('skills:scanInstalledSkills', async (): Promise<CentralSkill[]> => {
    return repo.scanInstalledSkills()
  })

  ipcMain.handle(
    'skills:syncToTool',
    async (_event, args: { skillId: string; toolKey: string }): Promise<void> => {
      await repo.syncToTool(args.skillId, args.toolKey)
    }
  )

  ipcMain.handle(
    'skills:unsyncFromTool',
    async (_event, args: { skillId: string; toolKey: string }): Promise<void> => {
      await repo.unsyncFromTool(args.skillId, args.toolKey)
    }
  )

  ipcMain.handle('skills:getToolsStatus', async (): Promise<ToolInfo[]> => {
    return repo.getToolsStatus()
  })

  registerSkillsInstallHandlers(repo)
}
