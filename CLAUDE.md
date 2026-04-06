# n8n Agent Builder

<!-- Last verified: n8n v1.76 — Review node typeVersions when upgrading -->

## Overview

Build n8n workflows by prompt using Claude Code + n8n-mcp MCP tools.

**Instance:** https://professionalaiassistants.com/n8n
**MCP:** `npx n8n-mcp` (stdio) — node docs, templates, validation, workflow API

---

## Build Process

**At the start of any workflow build, invoke the `n8n-node-configs` skill** — it contains all node JSON templates, typeVersions, credential keys, connections patterns, and testing info.

Then follow this sequence:

1. **Identify nodes** — Determine trigger + action nodes from the request
2. **Source node configs** using this decision tree:
   - **In `n8n-node-configs` skill?** → use directly, no MCP lookup needed (covers ~20 common nodes)
   - **Complex/unfamiliar integration?** → `search_templates` first — 34,000+ real configs
   - **Not found in templates?** → `search_nodes` → `get_node` (detail: `"standard"`)
3. **Create** — `n8n_create_workflow` with full correct config in one call
4. **Validate & Fix Loop** — `n8n_validate_workflow` with profile `"runtime"`. If errors:
   - Identify offending node/field → patch via `n8n_update_partial_workflow` → re-validate
   - **Max 3 attempts.** If still failing, report errors and do not activate.
   - Skip warnings unless they indicate a real misconfiguration.
5. **Activate** — `n8n_update_partial_workflow` with `{ type: "activateWorkflow" }` (0 errors only)
6. **Test** — `execute_workflow` for manual triggers; webhook test URL for webhook workflows
7. **Report** — Workflow URL + node summary + credentials to configure

### Context Window Management

For complex workflows (10+ nodes):
- Build nodes in logical groups (trigger → processing → output)
- Do not re-read the full workflow JSON after every edit
- If context is running low, summarize progress and continue

---

## nodeType Format Rules

Two formats — wrong format causes silent failures:

| Context | Format |
|---------|--------|
| `search_nodes`, `get_node`, `validate_node` | `nodes-base.telegram` |
| `n8n_create_workflow`, `n8n_update_partial_workflow` | `n8n-nodes-base.telegram` |
| LangChain nodes in workflows | `@n8n/n8n-nodes-langchain.agent` |

---

## Critical: Resource Locator Fields

Fields in this table **require** the `__rl` object format — a plain string fails at runtime:

```json
{ "__rl": true, "value": "={{ $json.chat.id }}", "mode": "expression" }
{ "__rl": true, "value": "STATIC_VALUE", "mode": "id" }
{ "__rl": true, "value": "gid=0", "mode": "list", "cachedResultName": "Sheet1" }
```

| Node | `__rl` fields |
|------|--------------|
| `n8n-nodes-base.telegram` | `chatId` |
| `n8n-nodes-base.slack` | `channel`, `user` |
| `n8n-nodes-base.gmail` | `sendTo`, `messageId`, `labelIds` |
| `n8n-nodes-base.googleSheets` | `documentId`, `sheetName` |
| `n8n-nodes-base.googleDrive` | `driveId`, `folderId`, `fileId` |
| `n8n-nodes-base.notion` | `pageId`, `databaseId` |
| `n8n-nodes-base.airtable` | `baseId`, `tableId` |

---

## Validation Rules

- **Errors** → must fix before activating
- **Warnings** → skip unless they indicate a real misconfiguration
- Profile `"runtime"` is standard for pre-deploy checks
- Auto-sanitization runs on every update (fixes operator structures automatically)

---

## Known Failure Patterns

### `__rl` fields passed as plain strings
Any field in the `__rl` table passed as a plain string (`"chatId": "123"`) passes JSON validation but fails at runtime. Always use the object format.

### LangChain sub-nodes connected via `main`
If OpenAI Chat Model, memory, or tool nodes connect to an AI Agent via `main` instead of `ai_languageModel` / `ai_tool` / `ai_memory`, the sub-node is silently ignored.

### Wrong nodeType prefix in workflow JSON
`nodes-base.telegram` in `n8n_create_workflow` JSON creates an invalid node type. Always use `n8n-nodes-base.telegram` in workflow JSON.

### Code node returning a plain object
`return { result: value }` crashes at runtime. Must be `return [{ json: { result: value } }]`.

### Memory node with static sessionKey
`"sessionKey": "conversation"` (static) causes all executions to share memory. Use `"sessionKey": "={{ $json.sessionId }}"`.

### Airtable `baseId` as plain string
Must be `{ "__rl": true, "value": "appXXX", "mode": "id" }` — plain string fails at runtime.

---

_Add new failure patterns via the `n8n-capture-learning` skill._

---

## Keeping Node Configs Current

Pinned to n8n **v1.76**. After any instance upgrade, run:

```bash
N8N_URL=https://professionalaiassistants.com/n8n \
N8N_API_KEY=<api_key> \
node scripts/test-node-configs.js
```

Update typeVersions in:
1. `n8n-node-configs` skill (`.claude/skills/n8n-node-configs/SKILL.md`)
2. Agent file `.claude/agents/n8n-workflow-builder.md`
3. Skill `.claude/skills/n8n-json-checker/SKILL.md`

---

## n8n Instance

**URL:** https://professionalaiassistants.com/n8n
**Type:** Self-hosted VPS

Workflow URL pattern: `https://professionalaiassistants.com/n8n/workflow/{workflow_id}`
Webhook test URL: `https://professionalaiassistants.com/n8n/webhook-test/{path}`
Webhook production URL: `https://professionalaiassistants.com/n8n/webhook/{path}`

Credential IDs in workflow JSON (e.g. `"id": "1"`) are placeholders. User connects real credentials in the n8n UI after the workflow is created.

**Production error-handler:** ID `vQKuXqX6mzCEGmaE` — set `settings.errorWorkflow` on production workflows (5+ nodes) to this ID.
