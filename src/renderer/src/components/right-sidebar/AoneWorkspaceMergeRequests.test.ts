import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearAoneNestedRepoScanCache,
  loadAoneChildMergeRequests,
  loadAoneWorkspaceMergeRequests
} from './AoneWorkspaceMergeRequests'

beforeEach(() => {
  clearAoneNestedRepoScanCache()
})

describe('loadAoneChildMergeRequests', () => {
  it('queries each nested repository current branch and preserves merged reviews', async () => {
    const scanNestedRepos = vi.fn(async () => ({
      repos: [
        { path: '/workspace', displayName: 'workspace', depth: 0 },
        { path: '/workspace/repos/diamondops', displayName: 'diamondops', depth: 2 },
        { path: '/workspace/repos/mw-cli', displayName: 'mw-cli', depth: 2 }
      ]
    }))
    const getMergeRequestForRepositoryCurrentBranch = vi.fn(
      async ({ repoPath }: { repoPath: string }) =>
        repoPath.endsWith('diamondops')
          ? {
              ok: true,
              data: {
                branch: 'feature/diamond-listener',
                mergeRequest: {
                  id: 28612989,
                  title: 'Support listener queries',
                  state: 'merged'
                }
              }
            }
          : { ok: false, code: 'not_linked' }
    )

    const result = await loadAoneChildMergeRequests({
      parentWorktreePath: '/workspace',
      scanNestedRepos,
      getMergeRequestForRepositoryCurrentBranch
    })

    expect(scanNestedRepos).toHaveBeenCalledWith({
      path: '/workspace',
      options: { descendIntoGitRepoRoot: true, maxRepos: 50, timeoutMs: 10_000 }
    })
    expect(getMergeRequestForRepositoryCurrentBranch.mock.calls.map(([args]) => args)).toEqual([
      { repoPath: '/workspace/repos/diamondops' },
      { repoPath: '/workspace/repos/mw-cli' }
    ])
    expect(result).toEqual([
      {
        repo: { path: '/workspace/repos/diamondops', displayName: 'diamondops', depth: 2 },
        branch: 'feature/diamond-listener',
        review: {
          id: 28612989,
          title: 'Support listener queries',
          state: 'merged'
        },
        lookupErrorCode: null
      },
      {
        repo: { path: '/workspace/repos/mw-cli', displayName: 'mw-cli', depth: 2 },
        branch: null,
        review: null,
        lookupErrorCode: 'not_linked'
      }
    ])
  })

  it('filters child repositories checked out on their default branches', async () => {
    const getMergeRequestForRepositoryCurrentBranch = vi.fn(
      async ({ repoPath }: { repoPath: string }) => ({
        ok: true,
        data: repoPath.endsWith('default-repo')
          ? { branch: 'main', isDefaultBranch: true, mergeRequest: null }
          : {
              branch: 'feature/child-review',
              isDefaultBranch: false,
              mergeRequest: { id: 28613303, title: 'Child review', state: 'opened' }
            }
      })
    )

    await expect(
      loadAoneChildMergeRequests({
        parentWorktreePath: '/workspace',
        scanNestedRepos: vi.fn(async () => ({
          repos: [
            { path: '/workspace', displayName: 'workspace', depth: 0 },
            { path: '/workspace/default-repo', displayName: 'default-repo', depth: 1 },
            { path: '/workspace/feature-repo', displayName: 'feature-repo', depth: 1 }
          ]
        })),
        getMergeRequestForRepositoryCurrentBranch
      })
    ).resolves.toEqual([
      {
        repo: { path: '/workspace/feature-repo', displayName: 'feature-repo', depth: 1 },
        branch: 'feature/child-review',
        review: { id: 28613303, title: 'Child review', state: 'opened' },
        lookupErrorCode: null
      }
    ])
  })

  it('retries a transient lookup failure once', async () => {
    const scanNestedRepos = vi.fn(async () => ({
      repos: [
        { path: '/workspace', displayName: 'workspace', depth: 0 },
        { path: '/workspace/repos/mw-cli', displayName: 'mw-cli', depth: 2 }
      ]
    }))
    const getMergeRequestForRepositoryCurrentBranch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, code: 'invalid_output' })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          branch: 'feature/mw-listener',
          mergeRequest: { id: 28613303, title: 'Listener queries', state: 'opened' }
        }
      })

    await expect(
      loadAoneChildMergeRequests({
        parentWorktreePath: '/workspace',
        scanNestedRepos,
        getMergeRequestForRepositoryCurrentBranch
      })
    ).resolves.toEqual([
      {
        repo: { path: '/workspace/repos/mw-cli', displayName: 'mw-cli', depth: 2 },
        branch: 'feature/mw-listener',
        review: { id: 28613303, title: 'Listener queries', state: 'opened' },
        lookupErrorCode: null
      }
    ])
    expect(getMergeRequestForRepositoryCurrentBranch).toHaveBeenCalledTimes(2)
  })

  it('keeps other repositories when one lookup rejects', async () => {
    const scanNestedRepos = vi.fn(async () => ({
      repos: [
        { path: '/workspace', displayName: 'workspace', depth: 0 },
        { path: '/workspace/repos/diamondops', displayName: 'diamondops', depth: 2 },
        { path: '/workspace/repos/mw-cli', displayName: 'mw-cli', depth: 2 }
      ]
    }))
    const getMergeRequestForRepositoryCurrentBranch = vi.fn(
      async ({ repoPath }: { repoPath: string }) => {
        if (repoPath.endsWith('diamondops')) {
          throw new Error('transport closed')
        }
        return {
          ok: true,
          data: {
            branch: 'feature/mw-listener',
            mergeRequest: { id: 28613303, title: 'Listener queries', state: 'opened' }
          }
        }
      }
    )

    await expect(
      loadAoneChildMergeRequests({
        parentWorktreePath: '/workspace',
        scanNestedRepos,
        getMergeRequestForRepositoryCurrentBranch
      })
    ).resolves.toEqual([
      {
        repo: { path: '/workspace/repos/diamondops', displayName: 'diamondops', depth: 2 },
        branch: null,
        review: null,
        lookupErrorCode: 'unknown'
      },
      {
        repo: { path: '/workspace/repos/mw-cli', displayName: 'mw-cli', depth: 2 },
        branch: 'feature/mw-listener',
        review: { id: 28613303, title: 'Listener queries', state: 'opened' },
        lookupErrorCode: null
      }
    ])
  })

  it('fills a missing merged parent review only after finding child repositories', async () => {
    const getMergeRequestForRepositoryCurrentBranch = vi.fn(
      async ({ repoPath }: { repoPath: string }) => ({
        ok: true,
        data:
          repoPath === '/workspace'
            ? {
                branch: 'feature/listener_influence',
                isDefaultBranch: false,
                mergeRequest: { id: 28570763, title: 'Workspace review', state: 'merged' }
              }
            : {
                branch: 'feature/mw-listener',
                isDefaultBranch: false,
                mergeRequest: { id: 28613303, title: 'CLI review', state: 'opened' }
              }
      })
    )

    await expect(
      loadAoneWorkspaceMergeRequests(
        {
          parentWorktreePath: '/workspace',
          scanNestedRepos: vi.fn(async () => ({
            repos: [
              { path: '/workspace', displayName: 'workspace', depth: 0 },
              { path: '/workspace/repos/mw-cli', displayName: 'mw-cli', depth: 2 }
            ]
          })),
          getMergeRequestForRepositoryCurrentBranch
        },
        true
      )
    ).resolves.toMatchObject({
      entries: [{ review: { id: 28613303 } }],
      parentLookup: { review: { id: 28570763, state: 'merged' }, lookupErrorCode: null },
      showParent: true
    })
    expect(getMergeRequestForRepositoryCurrentBranch).toHaveBeenCalledWith({
      repoPath: '/workspace/repos/mw-cli'
    })
    expect(getMergeRequestForRepositoryCurrentBranch).toHaveBeenCalledWith({
      repoPath: '/workspace'
    })
  })

  it('hides a parent repository checked out on its default branch', async () => {
    const getMergeRequestForRepositoryCurrentBranch = vi.fn(
      async ({ repoPath }: { repoPath: string }) => ({
        ok: true,
        data:
          repoPath === '/workspace'
            ? { branch: 'main', isDefaultBranch: true, mergeRequest: null }
            : {
                branch: 'feature/child-review',
                isDefaultBranch: false,
                mergeRequest: { id: 28613303, title: 'Child review', state: 'opened' }
              }
      })
    )

    await expect(
      loadAoneWorkspaceMergeRequests(
        {
          parentWorktreePath: '/workspace',
          scanNestedRepos: vi.fn(async () => ({
            repos: [
              { path: '/workspace', displayName: 'workspace', depth: 0 },
              { path: '/workspace/child', displayName: 'child', depth: 1 }
            ]
          })),
          getMergeRequestForRepositoryCurrentBranch
        },
        true
      )
    ).resolves.toMatchObject({
      entries: [{ repo: { displayName: 'child' } }],
      parentLookup: { review: null, lookupErrorCode: null },
      showParent: false
    })
  })

  it('does not retry an authentication failure', async () => {
    const getMergeRequestForRepositoryCurrentBranch = vi.fn().mockResolvedValue({
      ok: false,
      code: 'auth_required'
    })

    await loadAoneChildMergeRequests({
      parentWorktreePath: '/workspace',
      scanNestedRepos: vi.fn(async () => ({
        repos: [
          { path: '/workspace', displayName: 'workspace', depth: 0 },
          { path: '/workspace/repos/mw-cli', displayName: 'mw-cli', depth: 2 }
        ]
      })),
      getMergeRequestForRepositoryCurrentBranch
    })

    expect(getMergeRequestForRepositoryCurrentBranch).toHaveBeenCalledTimes(1)
  })

  it('surfaces Aone flow control without retrying it immediately', async () => {
    const getMergeRequestForRepositoryCurrentBranch = vi.fn().mockResolvedValue({
      ok: false,
      code: 'unknown',
      error: 'a1-server error: FLOW_CONTROL_ERROR Sentinel block signature'
    })

    await expect(
      loadAoneChildMergeRequests({
        parentWorktreePath: '/workspace',
        scanNestedRepos: vi.fn(async () => ({
          repos: [
            { path: '/workspace', displayName: 'workspace', depth: 0 },
            { path: '/workspace/repos/mw-cli', displayName: 'mw-cli', depth: 2 }
          ]
        })),
        getMergeRequestForRepositoryCurrentBranch
      })
    ).resolves.toEqual([
      {
        repo: { path: '/workspace/repos/mw-cli', displayName: 'mw-cli', depth: 2 },
        branch: null,
        review: null,
        lookupErrorCode: 'rate_limited'
      }
    ])
    expect(getMergeRequestForRepositoryCurrentBranch).toHaveBeenCalledTimes(1)
  })
})
