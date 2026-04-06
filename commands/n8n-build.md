---
name: n8n-build
description: Build a new n8n workflow from a natural language description. Handles the full lifecycle — plan, create, validate, fix, activate, test. For multiple workflows, spawns parallel builder subagents.
---

Build the n8n workflow described by the user's arguments: $ARGUMENTS

## Instructions

Hand off to the `n8n-workflow-builder` agent. Pass the full user request as-is.

### Parallel builds (multiple workflows requested at once)

If the user requests **more than one workflow** in a single command, spawn one `n8n-workflow-builder` subagent per workflow **in parallel** rather than building them sequentially.

**Pattern:**
1. Parse the request into N distinct workflow descriptions
2. Spawn N parallel subagents, each with: "Build the following n8n workflow: [description]"
3. Collect all results and present a unified report

### Single workflow

Invoke `n8n-workflow-builder` directly with the request.
