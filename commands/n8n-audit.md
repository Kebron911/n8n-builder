---
name: n8n-audit
description: Deep structural audit of all workflows. Validates every workflow for errors, wiring issues, missing triggers, and credential gaps. Produces prioritized report with action items. Parallelizes in batches of 5 for 11+ workflows.
---

Audit all n8n workflows on the instance. $ARGUMENTS

## Instructions

Hand off to the `n8n-workflow-auditor` agent.

After reviewing the report, use `/n8n-fix [workflow-id]` to repair any broken workflows.
