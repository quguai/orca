import { readFile, readdir, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import type { NestedRepoCandidate, NestedRepoScanResult } from '../../shared/project-group-types'
import { isGitRepo } from '../git/repo'
import {
  isIgnoredNestedRepoDirectory,
  normalizeNestedRepoScanOptions,
  readNestedRepoGitignoreRules,
  type NestedRepoDirectoryEntry,
  type NestedRepoScanFilesystem,
  type TraversalFolder
} from './nested-repo-scan-rules'

async function hasGitMarker(dirPath: string): Promise<boolean> {
  try {
    const marker = await stat(join(dirPath, '.git'))
    if (marker.isDirectory() || marker.isFile()) {
      return true
    }
  } catch {
    // Continue to cheap bare-repository marker checks below.
  }
  const [head, objects, refs] = await Promise.all([
    stat(join(dirPath, 'HEAD')).catch(() => null),
    stat(join(dirPath, 'objects')).catch(() => null),
    stat(join(dirPath, 'refs')).catch(() => null)
  ])
  return head?.isFile() === true && objects?.isDirectory() === true && refs?.isDirectory() === true
}

async function readLocalDirectory(dirPath: string): Promise<NestedRepoDirectoryEntry[]> {
  const entries = await readdir(dirPath, { withFileTypes: true })
  return Promise.all(
    entries.map(async (entry) => {
      const isSymlink = entry.isSymbolicLink()
      // Why: workspace manifests commonly expose member repos as directory
      // symlinks; stat only links so regular scans retain cheap Dirent checks.
      const isDirectory = isSymlink
        ? await stat(join(dirPath, entry.name))
            .then((target) => target.isDirectory())
            .catch(() => false)
        : entry.isDirectory()
      return { name: entry.name, isDirectory, isSymlink }
    })
  )
}

export async function scanNestedRepos(args: {
  path: string
  options?: unknown
  filesystem?: NestedRepoScanFilesystem
  signal?: AbortSignal
  onProgress?: (scan: NestedRepoScanResult) => void
}): Promise<NestedRepoScanResult> {
  const startedAt = Date.now()
  const options = normalizeNestedRepoScanOptions(args.options)
  const repos: NestedRepoCandidate[] = []
  let truncated = false
  let timedOut = false
  let stopped = false
  const filesystem = args.filesystem ?? {
    readDirectory: readLocalDirectory,
    readTextFile: (path: string) => readFile(path, 'utf8'),
    joinPath: join,
    basename,
    hasGitMarker,
    isSelectedPathGitRepo: async (path: string) => isGitRepo(path) || (await hasGitMarker(path))
  }
  const buildResult = (selectedPathKind: NestedRepoScanResult['selectedPathKind']) => ({
    selectedPath: args.path,
    selectedPathKind,
    repos: [...repos],
    truncated,
    timedOut,
    stopped,
    durationMs: Date.now() - startedAt,
    maxDepth: options.maxDepth,
    maxRepos: options.maxRepos,
    timeoutMs: options.timeoutMs
  })
  const noteAbort = (): boolean => {
    if (!args.signal?.aborted) {
      return false
    }
    stopped = true
    return true
  }
  const emitProgress = (): void => {
    args.onProgress?.(buildResult('non_git_folder'))
  }

  const selectedPathIsGitRepo = await filesystem.isSelectedPathGitRepo(args.path)
  // Why: by default a git-repo selection is imported as one repo. Workspace mode
  // (descendIntoGitRepoRoot) instead treats the parent repo as a member and
  // surfaces the independent git repos nested inside it, so a "parent + nested
  // children" workspace imports as one ProjectGroup.
  if (selectedPathIsGitRepo && !options.descendIntoGitRepoRoot) {
    return buildResult('git_repo')
  }
  if (noteAbort()) {
    return buildResult(selectedPathIsGitRepo ? 'git_repo' : 'non_git_folder')
  }
  if (selectedPathIsGitRepo) {
    // Why: the root repo is a workspace member too; seed it before descending so
    // the normal traversal only needs to discover its nested children.
    repos.push({
      path: args.path,
      displayName: filesystem.basename(args.path),
      depth: 0
    })
    emitProgress()
  }
  // Why: nested repositories are normally ignored by their parent repository;
  // explicit workspace mode must still discover them while hard skip rules
  // continue to exclude metadata, build output, and hidden directories.
  const ignoreSelectedRepoRules = selectedPathIsGitRepo && options.descendIntoGitRepoRoot

  const foldersToTraverse: (TraversalFolder | undefined)[] = [
    { path: args.path, depth: 0, segments: [], ignoreRules: [] }
  ]
  let nextFolderIndex = 0

  while (nextFolderIndex < foldersToTraverse.length) {
    if (repos.length >= options.maxRepos) {
      truncated = true
      break
    }
    if (options.timeoutMs !== null && Date.now() - startedAt > options.timeoutMs) {
      timedOut = true
      break
    }
    if (noteAbort()) {
      break
    }
    const currentFolder = foldersToTraverse[nextFolderIndex++]!
    // Release processed paths and inherited ignore rules before the next filesystem await.
    foldersToTraverse[nextFolderIndex - 1] = undefined
    if (nextFolderIndex >= 64 && nextFolderIndex * 2 >= foldersToTraverse.length) {
      foldersToTraverse.splice(0, nextFolderIndex)
      nextFolderIndex = 0
    }
    if (currentFolder.depth > options.maxDepth) {
      continue
    }

    let entries: NestedRepoDirectoryEntry[]
    try {
      entries = await filesystem.readDirectory(currentFolder.path)
    } catch {
      continue
    }
    if (noteAbort()) {
      break
    }
    const currentIgnoreRules = [
      ...currentFolder.ignoreRules,
      ...(!ignoreSelectedRepoRules || currentFolder.depth > 0
        ? await readNestedRepoGitignoreRules({
            folderPath: currentFolder.path,
            entries,
            filesystem,
            baseSegments: currentFolder.segments
          })
        : [])
    ]

    const dirs = entries
      .filter((entry) => entry.isDirectory)
      .sort((left, right) => left.name.localeCompare(right.name))
    for (const entry of dirs) {
      const name = entry.name
      if (repos.length >= options.maxRepos) {
        truncated = true
        break
      }
      if (options.timeoutMs !== null && Date.now() - startedAt > options.timeoutMs) {
        timedOut = true
        break
      }
      if (noteAbort()) {
        break
      }
      const childSegments = [...currentFolder.segments, name]
      if (isIgnoredNestedRepoDirectory(name, childSegments, currentIgnoreRules)) {
        continue
      }
      const childPath = filesystem.joinPath(currentFolder.path, name)
      // Why: broad scans should use cheap filesystem markers instead of
      // spawning Git for every candidate directory, especially over SSH.
      const childHasGitMarker = await filesystem.hasGitMarker(childPath)
      if (noteAbort()) {
        break
      }
      if (childHasGitMarker) {
        repos.push({
          path: childPath,
          displayName: filesystem.basename(childPath),
          depth: currentFolder.depth + 1
        })
        emitProgress()
        // Project Groups organize sibling repos; nested repos stay hidden until a
        // later UI can explain and select submodule-style layouts explicitly.
        continue
      }
      // Why: a direct symlink may represent a workspace member repo, but an
      // arbitrary linked directory must not expand scanning outside the root.
      if (entry.isSymlink) {
        continue
      }
      // Why: group import should prefer nearby sibling repos over spending the
      // bounded scan inside an alphabetically early, deeply nested folder.
      if (currentFolder.depth < options.maxDepth) {
        foldersToTraverse.push({
          path: childPath,
          depth: currentFolder.depth + 1,
          segments: childSegments,
          ignoreRules: currentIgnoreRules
        })
      }
    }
  }

  if (selectedPathIsGitRepo) {
    if (repos.length > 1) {
      return buildResult('git_repo_with_nested')
    }
    // Why: no nested members were found — drop the seeded root so a childless
    // git-repo root behaves exactly like a plain git-repo selection (empty repos,
    // single-repo import path).
    repos.length = 0
    return buildResult('git_repo')
  }
  return buildResult('non_git_folder')
}
