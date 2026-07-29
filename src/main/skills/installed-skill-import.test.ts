import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  defaultInstalledSkillRoots,
  importUnmanagedInstalledSkills
} from './installed-skill-import'

const tempRoots: string[] = []

async function makeTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'orca-installed-skill-import-'))
  tempRoots.push(root)
  return root
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('installed skill import', () => {
  it('includes the shared agent skill home without requiring a tool detect directory', () => {
    expect(defaultInstalledSkillRoots()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: join(homedir(), '.agents', 'skills') })
      ])
    )
  })

  it('imports unmanaged agent skills while ignoring the central repository', async () => {
    const root = await makeTempRoot()
    const centralRepoPath = join(root, 'central')
    const agentRoot = join(root, '.agents', 'skills')
    await mkdir(join(centralRepoPath, 'managed'), { recursive: true })
    await mkdir(join(agentRoot, 'new-skill'), { recursive: true })
    await mkdir(join(agentRoot, 'not-a-skill'), { recursive: true })
    await writeFile(join(centralRepoPath, 'managed', 'SKILL.md'), '# Managed\n')
    await writeFile(join(agentRoot, 'new-skill', 'SKILL.md'), '# New skill\n\nImported.\n')

    const imported = await importUnmanagedInstalledSkills({
      centralRepoPath,
      existingNames: new Set(['managed']),
      roots: [
        { toolKey: 'central', path: centralRepoPath },
        { toolKey: 'agent-skills', path: agentRoot }
      ]
    })

    expect(imported).toHaveLength(1)
    expect(imported[0]).toMatchObject({
      name: 'new-skill',
      sourceType: 'import',
      sourceRef: join(agentRoot, 'new-skill'),
      targets: [{ tool: 'agent-skills', status: 'synced' }]
    })
    await expect(readFile(join(centralRepoPath, 'new-skill', 'SKILL.md'), 'utf8')).resolves.toBe(
      '# New skill\n\nImported.\n'
    )
  })

  it('deduplicates shared homes and does not overwrite an existing skill name', async () => {
    const root = await makeTempRoot()
    const centralRepoPath = join(root, 'central')
    const sharedRoot = join(root, '.agents', 'skills')
    await mkdir(join(sharedRoot, 'shared-skill'), { recursive: true })
    await writeFile(join(sharedRoot, 'shared-skill', 'SKILL.md'), '# Shared\n')

    const imported = await importUnmanagedInstalledSkills({
      centralRepoPath,
      existingNames: new Set(),
      roots: [
        { toolKey: 'cline', path: sharedRoot },
        { toolKey: 'warp', path: sharedRoot }
      ]
    })

    expect(imported).toHaveLength(1)
    expect(imported[0]?.targets).toEqual([
      { tool: 'cline', status: 'synced' },
      { tool: 'warp', status: 'synced' }
    ])

    await expect(
      importUnmanagedInstalledSkills({
        centralRepoPath,
        existingNames: new Set(['shared-skill']),
        roots: [{ toolKey: 'cline', path: sharedRoot }]
      })
    ).resolves.toEqual([])
  })
})
