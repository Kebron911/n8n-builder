---
name: n8n-test
description: Execute a manual-trigger workflow on-demand and inspect node output, or show test URL for webhook workflows. Does NOT execute schedule/timer triggers. Pass a workflow ID or name. Flags: --last (show last execution instead of re-running).
---

Execute and inspect an existing n8n workflow. Target: $ARGUMENTS

## Instructions

Hand off to the `n8n-workflow-tester` agent in **test** mode.

Pass the workflow ID or name from `$ARGUMENTS` as-is.

### What the tester does

1. Resolves the workflow (by ID or name search)
2. Checks the trigger type — manual triggers use `execute_workflow`; webhook triggers print the test URL instead
3. Executes the workflow
4. Pretty-prints per-node output data
5. Surfaces any runtime errors with node name and error message
6. Reports execution status (success / error / waiting)

### Usage examples

```
/n8n-test abc123
/n8n-test "My Slack Notification Workflow"
/n8n-test abc123 --last   ← show last execution result instead of re-running
```

### Flags

- `--last` — skip execution, fetch and display the most recent execution result instead
