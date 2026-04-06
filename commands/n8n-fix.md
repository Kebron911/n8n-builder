---
name: n8n-fix
description: Fix errors in one or more existing n8n workflows. Pass a workflow ID, name, or list of IDs. Parallelizes when multiple workflows need fixing.
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

---

The fixer will:
1. Fetch the workflow from the instance
2. Run `n8n_validate_workflow` to collect all errors
3. Fix errors in priority order: `__rl` fields → typeVersion → connections → credential keys → code syntax
4. Re-validate after each fix round (max 3 attempts)
5. Optionally activate when 0 errors remain (if user requested)
6. Report every fix applied and any remaining manual-fix items
7. Use `n8n-capture-learning` to record any new error patterns

To review a workflow's JSON **before** it's on the instance, use the `n8n-json-checker` skill instead.
