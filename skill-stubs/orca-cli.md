# Orca CLI

This discovery stub loads the version-matched guide from the Orca executable used for this session.

Engage Orca whenever its running editor/runtime is the source of truth: Orca-managed
worktrees, folder contexts, terminals, repos, automations, durable local tasks, worktree
comments, and the browser embedded inside the Orca app. Triggers include "$orca-cli",
"Orca worktree", "Orca local task" / "本地任务", "child worktree",
"spawn codex/claude in a worktree", "read/wait/send Orca terminal", "full handoff" /
"handover" / "give this to another agent", and "control the browser inside Orca". Use
plain shell tools when Orca state does not matter.

<!-- shared: resolver -->

## Load the version-matched guide before running Orca commands

```text
ORCA skills get orca-cli
```

<!-- shared: no-guessing -->
