import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LocalTasksFileV3 } from '../../../local-tasks/store'
import type { OrcaRuntimeService } from '../../orca-runtime'
import type { RpcRequest } from '../core'
import { RpcDispatcher } from '../dispatcher'

const { readDataMock } = vi.hoisted(() => ({ readDataMock: vi.fn() }))

vi.mock('../../../local-tasks/store', () => ({ readData: readDataMock }))

import { LOCAL_TASK_METHODS } from './local-tasks'

const ACTIVE_ID = 'abcdef12-3456-4789-abcd-ef1234567890'
const ARCHIVED_ID = '12345678-3456-4789-abcd-ef1234567890'

function fixture(): LocalTasksFileV3 {
  return {
    version: 3,
    tasks: [
      {
        id: ARCHIVED_ID,
        title: 'Archived task',
        status: 'done',
        priority: 'low',
        archivedAt: 300,
        createdAt: 100,
        updatedAt: 300
      },
      {
        id: ACTIVE_ID,
        title: 'Beta pool',
        status: 'in-progress',
        priority: 'high',
        description: 'Background and value',
        labelIds: ['label-1'],
        createdAt: 100,
        updatedAt: 200
      }
    ],
    labels: [{ id: 'label-1', name: 'Sentinel', color: '#5E6AD2', createdAt: 100 }],
    comments: [
      {
        id: 'comment-1',
        taskId: ACTIVE_ID,
        content: 'Ready for review',
        createdAt: 220,
        updatedAt: 220
      }
    ],
    activities: [
      {
        id: 'activity-1',
        taskId: ACTIVE_ID,
        type: 'status_changed',
        oldValue: 'todo',
        newValue: 'in-progress',
        createdAt: 210
      }
    ]
  }
}

function request(method: string, params: unknown): RpcRequest {
  return { id: 'req-1', authToken: 'token', method, params }
}

function dispatcher(): RpcDispatcher {
  const runtime = {
    getRuntimeId: () => 'runtime-1'
  } as unknown as OrcaRuntimeService
  return new RpcDispatcher({ runtime, methods: LOCAL_TASK_METHODS })
}

describe('local task RPC methods', () => {
  beforeEach(() => {
    readDataMock.mockReset()
    readDataMock.mockReturnValue(fixture())
  })

  it('lists active tasks with resolved labels by default', async () => {
    const response = await dispatcher().dispatch(
      request('localTasks.list', { includeArchived: false })
    )

    expect(response).toMatchObject({
      ok: true,
      result: {
        tasks: [
          {
            id: ACTIVE_ID,
            displayId: 'LT-abcdef',
            description: 'Background and value',
            labels: [{ id: 'label-1', name: 'Sentinel' }]
          }
        ]
      }
    })
  })

  it('shows one task by display id with comments and activity', async () => {
    const response = await dispatcher().dispatch(request('localTasks.show', { id: 'LT-abcdef' }))

    expect(response).toMatchObject({
      ok: true,
      result: {
        task: { id: ACTIVE_ID },
        comments: [{ content: 'Ready for review' }],
        activities: [{ type: 'status_changed', newValue: 'in-progress' }]
      }
    })
  })

  it('returns an invalid argument error for an unknown task', async () => {
    const response = await dispatcher().dispatch(request('localTasks.show', { id: 'LT-fedcba' }))

    expect(response).toMatchObject({
      ok: false,
      error: { code: 'invalid_argument', message: 'Local task not found: LT-fedcba' }
    })
  })
})
