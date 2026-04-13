---
name: n8n-monitor
description: Fast read-only dashboard of all n8n workflows. Shows active/inactive status, trigger types, credential gaps, and error handler configuration. Supports drill-down on a single workflow by name or ID. Does NOT run deep validation — use /n8n-audit for that.
---

Show the n8n workflow monitoring dashboard. $ARGUMENTS

## Instructions

Hand off to the `n8n-workflow-monitor` agent. Pass any arguments as-is.

**No validation runs here** — this is a fast read-only status overview. For deep structural validation, use `/n8n-audit` instead.

### Optional arguments

- `--active` — show only active workflows
- `--inactive` — show only inactive workflows
- `--broken` — show only workflows flagged with errors (from stored status, not live validation)
- `[workflow name or ID]` — drill down into a specific workflow
