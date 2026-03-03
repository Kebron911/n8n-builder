# n8n Agent Builder

<!-- Last verified: n8n v1.76 — Review node typeVersions when upgrading -->

## Overview

Build n8n workflows by prompt using Claude Code + n8n-mcp MCP tools.

**Instance:** https://n8n.cdeprosperity.com
**MCP:** `npx n8n-mcp` (stdio) — node docs, templates, validation, workflow API

---

## Build Process

When asked to create a workflow, follow this exact sequence:

1. **Identify nodes** — Determine trigger + action nodes from the request
2. **Skip lookup for known nodes** — If all nodes appear in [Common Node Configs](#common-node-configs) below, use those directly. No search needed.
3. **Look up unfamiliar nodes only** — `search_nodes` → `get_node` (detail: "standard") for anything not in the list
4. **Create** — `n8n_create_workflow` with full correct config in one call
5. **Validate & Fix Loop** — `n8n_validate_workflow` with profile `"runtime"`. If errors exist:
   - Read each error message → identify the offending node/field
   - Patch via `n8n_update_partial_workflow` with corrected node config
   - Re-validate. **Max 3 attempts.** If still failing after 3 tries, report the remaining errors to the user and do not activate.
   - Skip warnings unless they indicate a real misconfiguration.
6. **Activate** — `n8n_update_partial_workflow` with `{ type: "activateWorkflow" }` after clean validation (0 errors)
7. **Report** — Workflow URL + node summary + **all credentials** user needs to connect in n8n UI (list each credential type + which nodes use it)

**Do not search templates for common integrations.** Only use `search_templates` when the workflow pattern is genuinely unclear.

### Context Window Management

For complex workflows (10+ nodes), keep the build lean:
- Build nodes in logical groups (trigger → processing → output)
- Do not re-read the full workflow JSON after every edit — trust the structure you built
- When referencing Common Node Configs, copy them directly rather than re-reading this file
- If context is running low, summarize progress so far and continue with remaining nodes

---

## nodeType Format Rules

Two formats — wrong format causes silent failures:

| Context | Format Example |
|---------|---------------|
| `search_nodes`, `get_node`, `validate_node` | `nodes-base.telegram` |
| `n8n_create_workflow`, `n8n_update_partial_workflow` | `n8n-nodes-base.telegram` |
| LangChain nodes in workflows | `@n8n/n8n-nodes-langchain.agent` |

---

## Critical: Resource Locator Fields

Certain node fields **require** the `__rl` object format — a plain string will cause a validation warning or runtime failure.

```json
{ "__rl": true, "value": "={{ $json.chat.id }}", "mode": "expression" }
{ "__rl": true, "value": "STATIC_VALUE", "mode": "id" }
```

**Known resource locator fields — always use `__rl` format:**

| Node | Fields |
|------|--------|
| `n8n-nodes-base.telegram` | `chatId` |
| `n8n-nodes-base.slack` | `channel`, `user` |
| `n8n-nodes-base.gmail` | `sendTo`, `messageId`, `labelIds` |
| `n8n-nodes-base.googleSheets` | `documentId`, `sheetName` |
| `n8n-nodes-base.notion` | `pageId`, `databaseId` |
| `n8n-nodes-base.airtable` | `baseId`, `tableId` |

---

## Expression Conventions

```
$json.fieldName                        — current item field
$json.message.text                     — nested field
$node["NodeName"].json.fieldName       — reference another node
$json.body.fieldName                   — webhook body data
$now                                   — current timestamp (ISO 8601)
$items("NodeName")                     — all items from a node
```

---

## Common Node Configs

Use these verbatim — no lookup needed. All use `typeVersion` matching the current recommended version.

### Telegram Trigger

```json
{
  "name": "Telegram Trigger",
  "type": "n8n-nodes-base.telegramTrigger",
  "typeVersion": 1.2,
  "position": [250, 300],
  "parameters": {
    "updates": ["message"],
    "additionalFields": {}
  },
  "credentials": {
    "telegramApi": { "id": "1", "name": "Telegram account" }
  }
}
```

### Telegram Send Message

```json
{
  "name": "Send Reply",
  "type": "n8n-nodes-base.telegram",
  "typeVersion": 1.2,
  "position": [500, 300],
  "parameters": {
    "resource": "message",
    "operation": "sendMessage",
    "chatId": { "__rl": true, "value": "={{ $json.message.chat.id }}", "mode": "expression" },
    "text": "={{ $json.message.text }}",
    "additionalFields": {}
  },
  "credentials": {
    "telegramApi": { "id": "1", "name": "Telegram account" }
  }
}
```

### Webhook Trigger (POST, respond manually)

```json
{
  "name": "Webhook",
  "type": "n8n-nodes-base.webhook",
  "typeVersion": 2,
  "position": [250, 300],
  "parameters": {
    "httpMethod": "POST",
    "path": "my-webhook",
    "responseMode": "responseNode"
  }
}
```

### Schedule Trigger

```json
{
  "name": "Schedule Trigger",
  "type": "n8n-nodes-base.scheduleTrigger",
  "typeVersion": 1.2,
  "position": [250, 300],
  "parameters": {
    "rule": {
      "interval": [{ "field": "hours", "hoursInterval": 1 }]
    }
  }
}
```

### HTTP Request

```json
{
  "name": "HTTP Request",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [500, 300],
  "parameters": {
    "method": "GET",
    "url": "https://api.example.com/endpoint",
    "authentication": "none"
  }
}
```

### Code Node (JavaScript)

```json
{
  "name": "Code",
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "position": [500, 300],
  "parameters": {
    "jsCode": "return items.map(item => ({ json: { ...item.json } }));"
  }
}
```

JavaScript patterns:
```js
// Single output
return [{ json: { result: value } }];

// Transform all items
return items.map(item => ({ json: { ...item.json, newField: computed } }));

// Access input
const data = $input.first().json;
const all = $input.all();
```

### AI Agent (OpenAI / LangChain)

```json
{
  "name": "AI Agent",
  "type": "@n8n/n8n-nodes-langchain.agent",
  "typeVersion": 1.7,
  "position": [500, 300],
  "parameters": {
    "text": "={{ $json.message }}",
    "options": {}
  }
}
```

Connect LLM as sub-node via `ai_languageModel` connection type.

### IF Node

```json
{
  "name": "IF",
  "type": "n8n-nodes-base.if",
  "typeVersion": 2.2,
  "position": [500, 300],
  "parameters": {
    "conditions": {
      "options": { "caseSensitive": true, "leftValue": "" },
      "conditions": [
        {
          "id": "condition_0",
          "leftValue": "={{ $json.field }}",
          "rightValue": "expected",
          "operator": { "type": "string", "operation": "equals" }
        }
      ],
      "combinator": "and"
    },
    "options": {}
  }
}
```

Output 0 = true branch, Output 1 = false branch. See [Connections Reference](#connections-reference) for wiring.

### Switch Node

```json
{
  "name": "Switch",
  "type": "n8n-nodes-base.switch",
  "typeVersion": 3.2,
  "position": [500, 300],
  "parameters": {
    "rules": {
      "values": [
        {
          "outputKey": "Route 0",
          "conditions": {
            "options": { "caseSensitive": true, "leftValue": "" },
            "conditions": [
              {
                "leftValue": "={{ $json.type }}",
                "rightValue": "typeA",
                "operator": { "type": "string", "operation": "equals" }
              }
            ],
            "combinator": "and"
          }
        },
        {
          "outputKey": "Route 1",
          "conditions": {
            "options": { "caseSensitive": true, "leftValue": "" },
            "conditions": [
              {
                "leftValue": "={{ $json.type }}",
                "rightValue": "typeB",
                "operator": { "type": "string", "operation": "equals" }
              }
            ],
            "combinator": "and"
          }
        }
      ]
    },
    "options": {}
  }
}
```

Each rule maps to an output index (0, 1, 2…). Fallback output is the last index.

### Edit Fields (Set Node)

```json
{
  "name": "Edit Fields",
  "type": "n8n-nodes-base.set",
  "typeVersion": 3.4,
  "position": [500, 300],
  "parameters": {
    "mode": "manual",
    "fields": {
      "values": [
        { "name": "newField", "stringValue": "={{ $json.existingField }}" },
        { "name": "staticField", "stringValue": "hello" }
      ]
    },
    "options": {}
  }
}
```

### Merge Node

```json
{
  "name": "Merge",
  "type": "n8n-nodes-base.merge",
  "typeVersion": 3,
  "position": [700, 300],
  "parameters": {
    "mode": "combine",
    "combinationMode": "mergeByPosition",
    "options": {}
  }
}
```

Merge has **two inputs** (index 0 and 1). Both must be wired in `connections`. Modes: `append`, `combine` (with `mergeByPosition` or `mergeByFields`), `chooseBranch`.

### Respond to Webhook

```json
{
  "name": "Respond to Webhook",
  "type": "n8n-nodes-base.respondToWebhook",
  "typeVersion": 1.1,
  "position": [900, 300],
  "parameters": {
    "respondWith": "json",
    "responseBody": "={{ $json }}",
    "options": {}
  }
}
```

Use with Webhook trigger that has `"responseMode": "responseNode"`. Options for `respondWith`: `json`, `text`, `noData`, `redirect`.

### Split In Batches

```json
{
  "name": "Split In Batches",
  "type": "n8n-nodes-base.splitInBatches",
  "typeVersion": 3,
  "position": [500, 300],
  "parameters": {
    "batchSize": 10,
    "options": {}
  }
}
```

Output 0 = batch (loop body), Output 1 = done. Wire loop body back to Split In Batches input to continue.

### NoOp (Do Nothing)

```json
{
  "name": "No Operation",
  "type": "n8n-nodes-base.noOp",
  "typeVersion": 1,
  "position": [700, 500],
  "parameters": {}
}
```

Useful as a placeholder on branches that need no action (e.g., false branch of IF).

---

## Connections Reference

The `connections` object wires nodes together. This is the most error-prone part of workflow JSON — use these templates exactly.

### Linear Chain (A → B → C)

```json
{
  "connections": {
    "Telegram Trigger": {
      "main": [[{ "node": "Code", "type": "main", "index": 0 }]]
    },
    "Code": {
      "main": [[{ "node": "Send Reply", "type": "main", "index": 0 }]]
    }
  }
}
```

### IF Branching (true / false)

```json
{
  "connections": {
    "Trigger": {
      "main": [[{ "node": "IF", "type": "main", "index": 0 }]]
    },
    "IF": {
      "main": [
        [{ "node": "True Branch Node", "type": "main", "index": 0 }],
        [{ "node": "False Branch Node", "type": "main", "index": 0 }]
      ]
    }
  }
}
```

`main[0]` = true, `main[1]` = false.

### Switch (multiple outputs)

```json
{
  "connections": {
    "Switch": {
      "main": [
        [{ "node": "Route A Handler", "type": "main", "index": 0 }],
        [{ "node": "Route B Handler", "type": "main", "index": 0 }],
        [{ "node": "Fallback Handler", "type": "main", "index": 0 }]
      ]
    }
  }
}
```

### Merge (two inputs)

```json
{
  "connections": {
    "Branch A": {
      "main": [[{ "node": "Merge", "type": "main", "index": 0 }]]
    },
    "Branch B": {
      "main": [[{ "node": "Merge", "type": "main", "index": 1 }]]
    }
  }
}
```

**Critical:** Merge input 0 and input 1 are separate — use `"index": 0` and `"index": 1`.

### AI Agent with Sub-Nodes (LangChain)

```json
{
  "connections": {
    "Trigger": {
      "main": [[{ "node": "AI Agent", "type": "main", "index": 0 }]]
    },
    "OpenAI Chat Model": {
      "ai_languageModel": [[{ "node": "AI Agent", "type": "ai_languageModel", "index": 0 }]]
    },
    "Tool Node": {
      "ai_tool": [[{ "node": "AI Agent", "type": "ai_tool", "index": 0 }]]
    },
    "Memory Node": {
      "ai_memory": [[{ "node": "AI Agent", "type": "ai_memory", "index": 0 }]]
    }
  }
}
```

Sub-node connection types: `ai_languageModel`, `ai_tool`, `ai_memory`, `ai_outputParser`. The sub-node's key uses the **sub-node connection type** as the key (not `main`).

### Loop (Split In Batches)

```json
{
  "connections": {
    "Split In Batches": {
      "main": [
        [{ "node": "Process Item", "type": "main", "index": 0 }],
        [{ "node": "Done Handler", "type": "main", "index": 0 }]
      ]
    },
    "Process Item": {
      "main": [[{ "node": "Split In Batches", "type": "main", "index": 0 }]]
    }
  }
}
```

Output 0 = loop body → wire back to Split In Batches. Output 1 = done.

### Error Handling Branch

Use the `onError` property on a node to define error behavior:

```json
{
  "name": "HTTP Request",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [500, 300],
  "onError": "continueErrorOutput",
  "parameters": { "method": "GET", "url": "https://api.example.com/endpoint" }
}
```

With `"onError": "continueErrorOutput"`, the node gets a second output:
- `main[0]` = success
- `main[1]` = error

Wire the error output like an IF branch.

---

## Validation Rules

- **Errors** → must fix before activating
- **Warnings** → informational, skip unless they indicate a real misconfiguration
- Profile `"runtime"` is the standard for pre-deploy checks
- Auto-sanitization runs on every update (fixes operator structures automatically — no manual action needed)

---

## Code Nodes (Python)

```python
# Standard library only — no pip packages (no pandas, requests, etc.)
return [{"json": {"result": value}}]
```

---

## Workflow Settings

Optional `settings` object at the workflow level — include when relevant:

```json
{
  "settings": {
    "executionOrder": "v1",
    "saveManualExecutions": true,
    "saveExecutionProgress": true,
    "executionTimeout": 300,
    "timezone": "America/New_York"
  }
}
```

| Setting | Default | When to set |
|---------|---------|-------------|
| `executionOrder` | `"v1"` | Always leave as `"v1"` (deterministic) |
| `executionTimeout` | `-1` (none) | Set for workflows hitting external APIs that may hang |
| `saveExecutionProgress` | `false` | Set `true` for long/complex workflows to enable partial replay |
| `timezone` | Instance default | Set when Schedule Trigger needs a specific timezone |
| `errorWorkflow` | none | Set to a workflow ID that handles error notifications |

Include `settings` in the top-level workflow object alongside `nodes` and `connections`.

---

## Credential Handling

**Principle:** Credential IDs in workflow JSON are **placeholders**. The user connects real credentials in the n8n UI after creation.

### How to assign credentials in node configs

```json
"credentials": {
  "telegramApi": { "id": "1", "name": "Telegram account" }
}
```

- The `id` value (e.g., `"1"`) is a dummy — it will not resolve until the user maps it in the UI.
- The key (e.g., `telegramApi`) **must match** the credential type the node expects. Get this from `get_node` output if unsure.
- The `name` is a display hint for the user — make it descriptive (e.g., `"Production Gmail"`, `"Slack Bot Token"`).

### Common credential type keys

| Node | Credential key |
|------|----------------|
| Telegram / Telegram Trigger | `telegramApi` |
| Slack | `slackApi` or `slackOAuth2Api` |
| Gmail | `gmailOAuth2` |
| Google Sheets | `googleSheetsOAuth2Api` |
| Notion | `notionApi` |
| OpenAI (LangChain) | `openAiApi` |
| HTTP Request (Header Auth) | `httpHeaderAuth` |
| HTTP Request (Bearer) | `httpBearerAuth` |

### Reporting credentials to the user

In the **Report** step, list every credential the user needs to connect:

> **Credentials to configure in n8n UI:**
> 1. Telegram Bot API → "Telegram account" (nodes: Telegram Trigger, Send Reply)
> 2. OpenAI API Key → "OpenAI" (nodes: OpenAI Chat Model)

---

## n8n Instance

**URL:** https://n8n.cdeprosperity.com
**Type:** Self-hosted VPS

Credential IDs in workflow JSON (e.g. `"id": "1"`) are placeholders. User connects real credentials in the n8n UI after the workflow is created.
