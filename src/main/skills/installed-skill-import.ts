import { readdir, realpath, stat } from 'node:fs/promises'
import { isAbsolute, join, relative, sep } from 'node:path'
import { installFromLocal, sanitizeName } from './installer'
import type { SkillRecord } from './skills-store'
import { getDefaultAdapters, getSkillsDir } from './tool-adapters'

export type InstalledSkillRoot = {
  toolKey: string
  path: string
}

type InstalledSkillCandidate = {
  name: string
  directoryPath: string
  toolKeys: string[]
}

function isWithinRoot(rootPath: string, candidatePath: string): boolean {
  const pathFromRoot = relative(rootPath, candidatePath)
  return (
    pathFromRoot === '' ||
    (!isAbsolute(pathFromRoot) && pathFromRoot !== '..' && !pathFromRoot.startsWith(`..${sep}`))
  )
}

export function defaultInstalledSkillRoots(): InstalledSkillRoot[] {
  // Why: a shared skill home can exist even when an adapter's own detect directory does not.
  return getDefaultAdapters().map((adapter) => ({
    toolKey: adapter.key,
    path: getSkillsDir(adapter)
  }))
}

async function findInstalledSkillCandidates(
  roots: readonly InstalledSkillRoot[],
  centralRepoPath: string
): Promise<InstalledSkillCandidate[]> {
  const resolvedCentralRepo = await realpath(centralRepoPath).catch(() => centralRepoPath)
  const candidatesByPath = new Map<string, InstalledSkillCandidate>()

  for (const root of roots) {
    const entries = await readdir(root.path, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      if (entry.name.startsWith('.')) {
        continue
      }
      const directoryPath = join(root.path, entry.name)
      const resolvedDirectory = await realpath(directoryPath).catch(() => null)
      if (!resolvedDirectory || isWithinRoot(resolvedCentralRepo, resolvedDirectory)) {
        continue
      }
      const skillFile = await stat(join(resolvedDirectory, 'SKILL.md')).catch(() => null)
      if (!skillFile?.isFile()) {
        continue
      }

      const existing = candidatesByPath.get(resolvedDirectory)
      if (existing) {
        if (!existing.toolKeys.includes(root.toolKey)) {
          existing.toolKeys.push(root.toolKey)
        }
        continue
      }
      candidatesByPath.set(resolvedDirectory, {
        name: entry.name,
        directoryPath,
        toolKeys: [root.toolKey]
      })
    }
  }

  return [...candidatesByPath.values()]
}

export async function importUnmanagedInstalledSkills(args: {
  centralRepoPath: string
  existingNames: ReadonlySet<string>
  roots?: readonly InstalledSkillRoot[]
}): Promise<SkillRecord[]> {
  const candidates = await findInstalledSkillCandidates(
    args.roots ?? defaultInstalledSkillRoots(),
    args.centralRepoPath
  )
  const claimedNames = new Set(args.existingNames)
  const imported: SkillRecord[] = []

  for (const candidate of candidates) {
    const name = sanitizeName(candidate.name)
    if (!name || claimedNames.has(name)) {
      continue
    }
    const result = await installFromLocal(candidate.directoryPath, name, args.centralRepoPath)
    const now = Date.now()
    imported.push({
      id: `import-${result.name}-${now}`,
      name: result.name,
      description: result.description,
      sourceType: 'import',
      sourceRef: candidate.directoryPath,
      sourceBranch: null,
      sourceRevision: null,
      remoteRevision: null,
      centralPath: result.centralPath,
      contentHash: result.contentHash,
      enabled: true,
      tags: null,
      updateStatus: 'local_only',
      targets: candidate.toolKeys.map((tool) => ({ tool, status: 'synced' })),
      createdAt: now,
      updatedAt: now
    })
    claimedNames.add(result.name)
  }

  return imported
}
