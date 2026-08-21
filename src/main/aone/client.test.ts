import { beforeEach, describe, expect, it, vi } from 'vitest'

const { a1ExecJsonMock, gitExecFileAsyncMock, resolveDefaultBaseRefWithLocalGitMock } = vi.hoisted(
  () => ({
    a1ExecJsonMock: vi.fn(),
    gitExecFileAsyncMock: vi.fn(),
    resolveDefaultBaseRefWithLocalGitMock: vi.fn()
  })
)

vi.mock('./a1-runner', () => ({
  A1Error: class A1Error extends Error {
    constructor(
      readonly code: string,
      message: string,
      readonly stderr = ''
    ) {
      super(message)
    }
  },
  a1ExecFileAsync: vi.fn(),
  a1ExecJson: a1ExecJsonMock,
  isA1Installed: vi.fn()
}))

vi.mock('../git/runner', () => ({
  gitExecFileAsync: gitExecFileAsyncMock
}))

vi.mock('../git/repo', () => ({
  resolveDefaultBaseRefWithLocalGit: resolveDefaultBaseRefWithLocalGitMock
}))

import {
  getMergeRequest,
  getMergeRequestForBranch,
  getMergeRequestForBranchWithMergedFallback,
  getMergeRequestForRepositoryCurrentBranch,
  isAoneCodeRemoteUrl,
  listMergeRequests
} from './client'
import { A1Error } from './a1-runner'

describe('Aone client remote detection', () => {
  it('detects Alibaba-hosted code remotes by host suffix', () => {
    expect(isAoneCodeRemoteUrl('https://code.alibaba-inc.com/group/repo.git')).toBe(true)
    expect(isAoneCodeRemoteUrl('https://gitlab.alibaba-inc.com/group/repo.git')).toBe(true)
    expect(isAoneCodeRemoteUrl('git@gitlab.alibaba-inc.com:group/repo.git')).toBe(true)
    expect(isAoneCodeRemoteUrl('ssh://git@future-code.alibaba-inc.com/group/repo.git')).toBe(true)
  })

  it('does not match non-host occurrences of the Alibaba domain', () => {
    expect(isAoneCodeRemoteUrl('https://github.com/alibaba-inc.com/group/repo.git')).toBe(false)
    expect(isAoneCodeRemoteUrl('https://not-alibaba-inc.com/group/repo.git')).toBe(false)
    expect(isAoneCodeRemoteUrl('git@github.com:alibaba-inc.com/repo.git')).toBe(false)
  })
})

describe('Aone client merge request lookup', () => {
  beforeEach(() => {
    a1ExecJsonMock.mockReset()
    gitExecFileAsyncMock.mockReset()
    resolveDefaultBaseRefWithLocalGitMock.mockReset()
  })

  it('unwraps repo mr view payloads', async () => {
    a1ExecJsonMock.mockResolvedValue({
      mergeRequest: {
        id: 28280121,
        iid: 1,
        title: 'Init',
        state: 'opened',
        sourceBranch: 'docs/init',
        targetBranch: 'master',
        detailUrl: 'https://code.alibaba-inc.com/quguai.ly/bruno/codereview/28280121'
      }
    })

    await expect(getMergeRequest(28280121, { cwd: '/repo' })).resolves.toMatchObject({
      id: 28280121,
      detailUrl: 'https://code.alibaba-inc.com/quguai.ly/bruno/codereview/28280121'
    })
    expect(a1ExecJsonMock).toHaveBeenCalledWith(['repo', 'mr', 'view', '28280121'], {
      cwd: '/repo'
    })
  })

  it('hydrates branch lookup results with the canonical view URL', async () => {
    a1ExecJsonMock
      .mockResolvedValueOnce([
        {
          id: 28280121,
          iid: 1,
          title: 'Init',
          state: 'opened',
          sourceBranch: 'docs/init',
          targetBranch: 'master',
          webUrl: '',
          detailUrl: ''
        }
      ])
      .mockResolvedValueOnce({
        mergeRequest: {
          id: 28280121,
          iid: 1,
          title: 'Init',
          state: 'opened',
          sourceBranch: 'docs/init',
          targetBranch: 'master',
          detailUrl: 'https://code.alibaba-inc.com/quguai.ly/bruno/codereview/28280121'
        }
      })

    await expect(getMergeRequestForBranch('docs/init', { cwd: '/repo' })).resolves.toMatchObject({
      id: 28280121,
      detailUrl: 'https://code.alibaba-inc.com/quguai.ly/bruno/codereview/28280121'
    })
    expect(a1ExecJsonMock).toHaveBeenNthCalledWith(
      1,
      ['repo', 'mr', 'list', '--state', 'opened', '--source', 'docs/init'],
      { cwd: '/repo' }
    )
    expect(a1ExecJsonMock).toHaveBeenNthCalledWith(2, ['repo', 'mr', 'view', '28280121'], {
      cwd: '/repo'
    })
  })

  it('falls back to the latest merged MR when a branch has no open MR', async () => {
    a1ExecJsonMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 28280120,
          iid: 1,
          title: 'Older merged review',
          state: 'merged',
          sourceBranch: 'docs/init',
          targetBranch: 'master',
          updatedAt: '2026-01-01T00:00:00.000Z'
        },
        {
          id: 28280121,
          iid: 2,
          title: 'Latest merged review',
          state: 'merged',
          sourceBranch: 'docs/init',
          targetBranch: 'master',
          updatedAt: '2026-01-02T00:00:00.000Z'
        }
      ])
      .mockResolvedValueOnce({
        mergeRequest: {
          id: 28280121,
          iid: 2,
          title: 'Latest merged review',
          state: 'merged',
          sourceBranch: 'docs/init',
          targetBranch: 'master',
          updatedAt: '2026-01-02T00:00:00.000Z',
          detailUrl: 'https://code.alibaba-inc.com/team/repo/codereview/28280121'
        }
      })

    await expect(
      getMergeRequestForBranchWithMergedFallback('docs/init', { cwd: '/repo' })
    ).resolves.toMatchObject({ id: 28280121, state: 'merged' })
    expect(a1ExecJsonMock).toHaveBeenNthCalledWith(
      1,
      ['repo', 'mr', 'list', '--state', 'opened', '--source', 'docs/init'],
      { cwd: '/repo' }
    )
    expect(a1ExecJsonMock).toHaveBeenNthCalledWith(
      2,
      ['repo', 'mr', 'list', '--state', 'merged', '--source', 'docs/init'],
      { cwd: '/repo' }
    )
    expect(a1ExecJsonMock).toHaveBeenNthCalledWith(3, ['repo', 'mr', 'view', '28280121'], {
      cwd: '/repo'
    })
  })

  it('looks up a nested repository MR using its own current branch', async () => {
    gitExecFileAsyncMock.mockResolvedValue({
      stdout: 'feature/child-listener\n',
      stderr: ''
    })
    resolveDefaultBaseRefWithLocalGitMock.mockResolvedValue('origin/main')
    a1ExecJsonMock.mockResolvedValueOnce([]).mockResolvedValueOnce([])

    await expect(
      getMergeRequestForRepositoryCurrentBranch('/workspace/repos/mw-cli')
    ).resolves.toEqual({
      branch: 'feature/child-listener',
      isDefaultBranch: false,
      mergeRequest: null
    })
    expect(gitExecFileAsyncMock).toHaveBeenCalledWith(['branch', '--show-current'], {
      cwd: '/workspace/repos/mw-cli'
    })
    expect(a1ExecJsonMock).toHaveBeenNthCalledWith(
      1,
      ['repo', 'mr', 'list', '--state', 'opened', '--source', 'feature/child-listener'],
      { cwd: '/workspace/repos/mw-cli' }
    )
    expect(a1ExecJsonMock).toHaveBeenNthCalledWith(
      2,
      ['repo', 'mr', 'list', '--state', 'merged', '--source', 'feature/child-listener'],
      { cwd: '/workspace/repos/mw-cli' }
    )
  })

  it('does not fall back to another branch for a detached nested repository', async () => {
    gitExecFileAsyncMock.mockResolvedValue({ stdout: '', stderr: '' })

    await expect(
      getMergeRequestForRepositoryCurrentBranch('/workspace/repos/mw-cli')
    ).resolves.toEqual({ branch: null, isDefaultBranch: false, mergeRequest: null })
    expect(a1ExecJsonMock).not.toHaveBeenCalled()
  })

  it('does not query Aone for a repository checked out on its default branch', async () => {
    gitExecFileAsyncMock.mockResolvedValue({ stdout: 'main\n', stderr: '' })
    resolveDefaultBaseRefWithLocalGitMock.mockResolvedValue('origin/main')

    await expect(
      getMergeRequestForRepositoryCurrentBranch('/workspace/repos/mw-cli')
    ).resolves.toEqual({ branch: 'main', isDefaultBranch: true, mergeRequest: null })
    expect(a1ExecJsonMock).not.toHaveBeenCalled()
  })

  it('distinguishes an empty MR list from malformed JSON output', async () => {
    a1ExecJsonMock.mockRejectedValueOnce(
      new A1Error('invalid_output', 'a1 returned an empty response')
    )

    await expect(listMergeRequests({ state: 'opened' }, { cwd: '/repo' })).resolves.toEqual([])

    const malformed = new A1Error('invalid_output', 'Failed to parse a1 JSON output', '{broken')
    a1ExecJsonMock.mockRejectedValueOnce(malformed)

    await expect(listMergeRequests({ state: 'opened' }, { cwd: '/repo' })).rejects.toBe(malformed)
  })

  it('serializes MR list calls and stops queued calls after Sentinel rate limiting', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
    let rejectFirst: ((error: Error) => void) | undefined
    a1ExecJsonMock.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectFirst = reject
        })
    )

    const first = listMergeRequests({ state: 'opened', source: 'feature/one' })
    const queued = listMergeRequests({ state: 'opened', source: 'feature/two' })
    await vi.waitFor(() => expect(a1ExecJsonMock).toHaveBeenCalledTimes(1))

    const rateLimited = new A1Error('rate_limited', 'Aone is rate limiting requests')
    rejectFirst?.(rateLimited)
    await expect(first).rejects.toBe(rateLimited)
    await expect(queued).rejects.toMatchObject({ code: 'rate_limited' })
    expect(a1ExecJsonMock).toHaveBeenCalledTimes(1)

    now.mockReturnValue(1_060_001)
    a1ExecJsonMock.mockResolvedValueOnce([])
    await expect(listMergeRequests({ state: 'opened' })).resolves.toEqual([])
    expect(a1ExecJsonMock).toHaveBeenCalledTimes(2)
    now.mockRestore()
  })
})
