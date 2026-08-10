import type { CommandSpec } from '../args'
import { GLOBAL_FLAGS } from '../args'

export const LOCAL_TASK_COMMAND_SPECS: CommandSpec[] = [
  {
    path: ['local-task', 'list'],
    summary: 'List durable Orca local tasks',
    usage: 'orca local-task list [--include-archived] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'include-archived'],
    notes: [
      'Archived tasks are excluded unless --include-archived is passed.',
      'JSON output includes descriptions, timestamps, label ids, and resolved labels.'
    ],
    examples: ['orca local-task list --json']
  },
  {
    path: ['local-task', 'show'],
    summary: 'Show one durable Orca local task with comments and activity',
    usage: 'orca local-task show <id> [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'id'],
    positionalArgs: ['id'],
    notes: [
      'Accepts a full UUID, LT-xxxxxx display id, or a unique id prefix of at least six characters.'
    ],
    examples: ['orca local-task show LT-0afa16 --json']
  }
]
