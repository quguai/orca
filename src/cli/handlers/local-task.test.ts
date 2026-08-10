import { beforeEach, describe, expect, it, vi } from 'vitest'

const callMock = vi.fn()

vi.mock('../runtime-client', async () => {
  class RuntimeClient {
    readonly isRemote = false
    call = callMock
    getCliStatus = vi.fn()
    openOrca = vi.fn()
  }
  const { RuntimeClientError, RuntimeRpcFailureError } = await import('../runtime/types.js')
  return { RuntimeClient, RuntimeClientError, RuntimeRpcFailureError }
})

import { main } from '../index'
import { okFixture, queueFixtures } from '../test-fixtures'

const TASK = {
  id: 'abcdef12-3456-4789-abcd-ef1234567890',
  displayId: 'LT-abcdef',
  title: 'Beta pool',
  status: 'in-progress',
  priority: 'high',
  description: 'Background and value',
  labelIds: ['label-1'],
  labels: [{ id: 'label-1', name: 'Sentinel', color: '#5E6AD2', createdAt: 100 }],
  createdAt: 100,
  updatedAt: 200
}

describe('orca local-task CLI handlers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    callMock.mockReset()
    process.exitCode = undefined
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('prints local task group help', async () => {
    await main(['local-task', '--help'], '/tmp/repo')

    const output = vi.mocked(console.log).mock.calls[0][0]
    expect(output).toContain('list')
    expect(output).toContain('show')
  })

  it('lists non-archived tasks as JSON by default', async () => {
    queueFixtures(callMock, okFixture('req-list', { tasks: [TASK] }))

    await main(['local-task', 'list', '--json'], '/tmp/repo')

    expect(callMock).toHaveBeenCalledWith('localTasks.list', { includeArchived: false })
    const output = JSON.parse(String(vi.mocked(console.log).mock.calls[0][0]))
    expect(output.result.tasks[0]).toMatchObject({
      id: TASK.id,
      description: 'Background and value'
    })
  })

  it('passes the archived flag and positional display id', async () => {
    queueFixtures(
      callMock,
      okFixture('req-list', { tasks: [] }),
      okFixture('req-show', { task: TASK, comments: [], activities: [] })
    )

    await main(['local-task', 'list', '--include-archived'], '/tmp/repo')
    await main(['local-task', 'show', 'LT-abcdef'], '/tmp/repo')

    expect(callMock).toHaveBeenNthCalledWith(1, 'localTasks.list', { includeArchived: true })
    expect(callMock).toHaveBeenNthCalledWith(2, 'localTasks.show', { id: 'LT-abcdef' })
    expect(vi.mocked(console.log).mock.calls[1][0]).toContain('Background and value')
  })
})
