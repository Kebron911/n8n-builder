---
name: n8n-fix
description: Fix validation and runtime errors in existing n8n workflows. Pass workflow IDs, names, or a comma-separated list. Fixes in priority order: typeVersion → nodeType → __rl → missing fields → credentials → connections → code. Parallelizes for multiple workflows.
---

Fix n8n workflow errors. Target: $ARGUMENTS

## Instructions

Hand off to the `n8n-workflow-fixer` agent.

### Multiple workflows

If the user passes **multiple workflow IDs or names** (comma-separated or listed), spawn one `n8n-workflow-fixer` subagent per workflow **in parallel**. Each subagent independently:
1. Fetches the workflow
2. Validates and identifies all errors
3. Applies fixes in batched `n8n_update_partial_workflow` calls
4. Re-validates (up to 3 rounds)
5. Reports results

Merge all individual fix reports into a unified summary at the end.

### Single workflow

Invoke `n8n-workflow-fixer` directly with the workflow ID or name.

The fixer handles the full fix lifecycle — see `n8n-workflow-fixer` agent for details.

To review workflow JSON **before** it's on the instance, use the `n8n-json-checker` skill instead.
