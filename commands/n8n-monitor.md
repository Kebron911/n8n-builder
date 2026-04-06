---
name: n8n-monitor
description: Display a fast status dashboard of all n8n workflows — active/inactive, trigger types, credential gaps. Use for a quick overview or to drill into a specific workflow. For deep structural validation across all workflows, use /n8n-audit instead.
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
