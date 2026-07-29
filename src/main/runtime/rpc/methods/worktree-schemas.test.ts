import { describe, expect, it } from 'vitest'
import { WorktreeActivate, WorktreeCreate, WorktreeSet } from './worktree-schemas'

describe('worktree RPC schemas', () => {
  it('validates additive navigation intent', () => {
    expect(WorktreeActivate.parse({ worktree: 'id:wt-1', navigation: 'clients' }).navigation).toBe(
      'clients'
    )
    expect(
      WorktreeActivate.safeParse({ worktree: 'id:wt-1', navigation: 'everyone' }).success
    ).toBe(false)
  })

  it('rejects invalid startup agent values', () => {
    const parsed = WorktreeCreate.safeParse({
      repo: 'repo-1',
      name: 'agent-startup',
      startupAgent: 'wat',
      startupPrompt: 'hi'
    })

    expect(parsed.success).toBe(false)
  })

  it('rejects startup prompts without startup agents', () => {
    const parsed = WorktreeCreate.safeParse({
      repo: 'repo-1',
      name: 'agent-startup',
      startupPrompt: 'hi'
    })

    expect(parsed.success).toBe(false)
  })

  it('accepts durable local task links on create and unlink on set', () => {
    expect(
      WorktreeCreate.safeParse({
        repo: 'repo-1',
        name: 'task-workspace',
        linkedLocalTask: 'task-1'
      }).success
    ).toBe(true)
    expect(WorktreeSet.safeParse({ worktree: 'id:wt-1', linkedLocalTask: null }).success).toBe(true)
  })
})
