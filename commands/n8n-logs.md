---
name: n8n-logs
description: View execution history for any n8n workflow. Shows last N runs with status, duration, and error details. Drill into specific executions for node-by-node output. Flags: --limit N, --failed, --exec <id>.
---

Show execution logs for an n8n workflow. Target: $ARGUMENTS

## Instructions

Hand off to the `n8n-workflow-tester` agent in **logs** mode.

Pass the full arguments string from `$ARGUMENTS` as-is.

### What the tester does

1. Resolves the workflow ID or name
2. Fetches the last N executions via the n8n executions API
3. For each execution: status, start time, duration, trigger mode
4. Expands failed executions — shows which node failed, the error message, and the input data that caused it
5. Optionally shows full node-by-node output for a specific execution

### Usage examples

```
/n8n-logs abc123
/n8n-logs abc123 --limit 20
/n8n-logs "My Workflow" --failed
/n8n-logs abc123 --exec exec_id_here
```

### Flags

- `--limit N` — number of executions to show (default: 10)
- `--failed` — show only failed executions
- `--exec <execution-id>` — drill into a specific execution, show all node outputs
