import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { SkillsRepository } from './skills-repository'

const tempRoots: string[] = []

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('SkillsRepository.scanInstalledSkills', () => {
  it('imports agent-home skills into the configured central repository once', async () => {
    const root = await mkdtemp(join(tmpdir(), 'orca-skills-repository-scan-'))
    tempRoots.push(root)
    const centralRepoPath = join(root, 'central')
    const installedRoot = join(root, '.agents', 'skills')
    const storePath = join(root, 'skills-store.json')
    await mkdir(join(installedRoot, 'local-review'), { recursive: true })
    await writeFile(join(installedRoot, 'local-review', 'SKILL.md'), '# Local review\n')
    await writeFile(
      storePath,
      JSON.stringify({ skills: [], settings: { central_repo_path: centralRepoPath } })
    )
    const repository = new SkillsRepository(storePath)
    const roots = [{ toolKey: 'agent-skills', path: installedRoot }]

    await expect(repository.scanInstalledSkills(roots)).resolves.toEqual([
      expect.objectContaining({
        name: 'local-review',
        centralPath: join(centralRepoPath, 'local-review'),
        targets: [{ tool: 'agent-skills', status: 'synced' }]
      })
    ])
    await expect(repository.scanInstalledSkills(roots)).resolves.toEqual([])
    await expect(repository.listSkills()).resolves.toHaveLength(1)
  })
})
