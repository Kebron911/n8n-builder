---
name: n8n-build
description: Build one or more n8n workflows from natural language. Routes to n8n-workflow-builder for the full lifecycle (source nodes → create → validate → fix → activate → test). Spawns parallel builders for batch requests.
---

Build the n8n workflow described by the user's arguments: $ARGUMENTS

## Instructions

Hand off to the `n8n-workflow-builder` agent. Pass the full user request as-is.

### Parallel builds

If the user requests **more than one workflow**, parse into distinct descriptions and spawn one `n8n-workflow-builder` subagent per workflow **in parallel**. Merge all results into a unified report.

### Single workflow

Invoke `n8n-workflow-builder` directly with the request.
