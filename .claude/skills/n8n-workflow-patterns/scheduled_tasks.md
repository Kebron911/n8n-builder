# Scheduled Tasks — n8n-Specific Details

---

## Schedule Trigger Config Format (n8n-specific)

The n8n Schedule Trigger uses a nested `rule.interval` array — not a cron string at the top level.

### Interval mode
```json
{
  "type": "n8n-nodes-base.scheduleTrigger",
  "typeVersion": 1.2,
  "parameters": {
    "rule": {
      "interval": [{ "field": "hours", "hoursInterval": 1 }]
    }
  }
}
```

| `field` value | Required companion field | Example |
|--------------|--------------------------|---------|
| `"minutes"` | `"minutesInterval": 15` | Every 15 min |
| `"hours"` | `"hoursInterval": 2` | Every 2 hours |
| `"days"` | `"daysInterval": 1`, `"triggerAtHour": 9` | Daily at 9 AM |
| `"weeks"` | `"weeksInterval": 1`, `"triggerAtDay": [1]`, `"triggerAtHour": 9` | Weekly Monday 9 AM |
| `"months"` | `"monthsInterval": 1`, `"triggerAtDayOfMonth": 1` | Monthly on 1st |
| `"cronExpression"` | `"expression": "0 9 * * 1-5"` | Weekdays at 9 AM |

### Cron mode
```json
{
  "rule": {
    "interval": [{ "field": "cronExpression", "expression": "0 9 * * 1-5" }]
  }
}
```

### Daily at specific time
```json
{
  "rule": {
    "interval": [{
      "field": "days",
      "daysInterval": 1,
      "triggerAtHour": 9,
      "triggerAtMinute": 0
    }]
  }
}
```

---

## Timezone (n8n-specific)

Timezone is set at the **workflow level**, not on the Schedule Trigger node:

```json
{
  "nodes": [...],
  "connections": {...},
  "settings": {
    "timezone": "America/New_York"
  }
}
```

Without this, the schedule runs in the n8n instance's system timezone. Always set explicitly when schedule must handle DST or serve a specific region.

---

## Error Workflow Linkage (n8n-specific)

Connect a dedicated error-handler workflow via `settings.errorWorkflow`:

```json
{
  "settings": {
    "errorWorkflow": "vQKuXqX6mzCEGmaE"
  }
}
```

The error workflow must start with an Error Trigger node. It receives `$json.execution` with:
- `$json.execution.id` — failed execution ID
- `$json.execution.url` — link to execution in n8n UI
- `$json.execution.error.message` — error message
- `$json.workflowData.name` — workflow name

**Production error handler already deployed**: `vQKuXqX6mzCEGmaE` — sends Telegram alerts. Reference this ID in `settings.errorWorkflow` on any production scheduled workflow.

---

## Preventing Overlapping Executions (n8n-specific)

Set `saveExecutionProgress` and use the workflow's own execution history to detect overlaps:

```json
{
  "settings": {
    "saveExecutionProgress": true,
    "executionTimeout": 300
  }
}
```

`executionTimeout` (seconds) — n8n kills stuck executions after this time. Set for workflows that call external APIs which may hang.

