---
name: n8n-audit
description: Audit all workflows on the n8n instance. Produces a structured health report with errors, warnings, credential gaps, and action items. Automatically parallelizes across large workflow sets.
---

Audit all n8n workflows on the instance. $ARGUMENTS

## Instructions

Hand off to the `n8n-workflow-auditor` agent.

After reviewing the report, use `/n8n-fix [workflow-id]` to repair any broken workflows.
