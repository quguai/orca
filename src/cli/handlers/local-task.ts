import type {
  RuntimeLocalTaskListResult,
  RuntimeLocalTaskShowResult
} from '../../shared/local-task-rpc-types'
import type { CommandHandler } from '../dispatch'
import { printResult } from '../format'
import { getRequiredStringFlag } from '../flags'
import { formatLocalTaskList, formatLocalTaskShow } from '../local-task-format'

export const LOCAL_TASK_HANDLERS: Record<string, CommandHandler> = {
  'local-task list': async ({ flags, client, json }) => {
    const result = await client.call<RuntimeLocalTaskListResult>('localTasks.list', {
      includeArchived: flags.get('include-archived') === true
    })
    printResult(result, json, formatLocalTaskList)
  },
  'local-task show': async ({ flags, client, json }) => {
    const result = await client.call<RuntimeLocalTaskShowResult>('localTasks.show', {
      id: getRequiredStringFlag(flags, 'id')
    })
    printResult(result, json, formatLocalTaskShow)
  }
}
