# n8n Agent Builder

<!-- Last verified: n8n v1.76 — Review node typeVersions when upgrading -->

## Overview

Build n8n workflows by prompt using Claude Code + n8n-mcp MCP tools.

**Instance:** https://professionalaiassistants.com/n8n (self-hosted VPS)
**MCP:** `npx n8n-mcp` (stdio) — node docs, templates, validation, workflow API

URL patterns: `.../workflow/{id}` | webhook test: `.../webhook-test/{path}` | webhook prod: `.../webhook/{path}`

Credential IDs in workflow JSON are placeholders — user connects real credentials in the UI.
**Production error-handler:** ID `vQKuXqX6mzCEGmaE` — set `settings.errorWorkflow` on production workflows (5+ nodes).

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
   - Skip warnings unless they indicate a real misconfiguration. Auto-sanitization runs on every update.
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

Many node fields require the `__rl` object format — a plain string fails at runtime:

```json
{ "__rl": true, "value": "={{ $json.chat.id }}", "mode": "expression" }
{ "__rl": true, "value": "STATIC_VALUE", "mode": "id" }
{ "__rl": true, "value": "gid=0", "mode": "list", "cachedResultName": "Sheet1" }
```

**Full node/field list:** see `n8n-json-checker` skill (section 2.2) — 20 nodes covered.

---

## Known Failure Patterns

### LangChain sub-nodes connected via `main`
If OpenAI Chat Model, memory, or tool nodes connect to an AI Agent via `main` instead of `ai_languageModel` / `ai_tool` / `ai_memory`, the sub-node is silently ignored.

### Wrong nodeType prefix in workflow JSON
`nodes-base.telegram` in `n8n_create_workflow` JSON creates an invalid node type. Always use `n8n-nodes-base.telegram` in workflow JSON.

### Code node returning a plain object
`return { result: value }` crashes at runtime. Must be `return [{ json: { result: value } }]`.

### Memory node with static sessionKey
`"sessionKey": "conversation"` (static) causes all executions to share memory. Use `"sessionKey": "={{ $json.sessionId }}"`.

---

_Add new failure patterns via the `n8n-capture-learning` skill._

---

## Keeping Node Configs Current

Pinned to n8n **v1.76**. After any instance upgrade, run `N8N_API_KEY=<key> node scripts/test-node-configs.js` and update typeVersions in: `n8n-node-configs` skill, `.claude/agents/n8n-workflow-builder.md`, and `n8n-json-checker` skill.
