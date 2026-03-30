# n8n Agent Builder

<!-- Last verified: n8n v1.76 — Review node typeVersions when upgrading -->

## Overview

Build n8n workflows by prompt using Claude Code + n8n-mcp MCP tools.

**Instance:** https://professionalaiassistants.com/n8n
**MCP:** `npx n8n-mcp` (stdio) — node docs, templates, validation, workflow API

---

## Build Process

When asked to create a workflow, follow this exact sequence:

1. **Identify nodes** — Determine trigger + action nodes from the request
2. **Source node configs** using this decision tree (in order):
   - **In Common Node Configs below?** → use directly, no lookup needed
   - **Complex/unfamiliar integration?** → `search_templates` first — 34,000+ real working configs. Effective queries:
     - `"telegram bot"`, `"google sheets append row"`, `"slack notification"`
     - `"ai agent openai"`, `"airtable create record"`, `"notion database"`
     - Extract the relevant node config from the template result, adapt as needed
   - **Not found in templates?** → `search_nodes` → `get_node` (detail: `"standard"`)
3. **Create** — `n8n_create_workflow` with full correct config in one call
4. **Validate & Fix Loop** — `n8n_validate_workflow` with profile `"runtime"`. If errors exist:
   - Read each error message → identify the offending node/field
   - Patch via `n8n_update_partial_workflow` with corrected node config
   - Re-validate. **Max 3 attempts.** If still failing after 3 tries, report the remaining errors to the user and do not activate.
   - Skip warnings unless they indicate a real misconfiguration.
5. **Activate** — `n8n_update_partial_workflow` with `{ type: "activateWorkflow" }` after clean validation (0 errors)
6. **Test** — For manual trigger workflows, call `execute_workflow` with the workflow ID to verify it runs. For webhook workflows, provide the test URL: `https://professionalaiassistants.com/n8n/webhook-test/{path}`
7. **Report** — Include all of the following:
   - **Workflow URL:** `https://professionalaiassistants.com/n8n/workflow/{workflow_id}`
   - Node summary (trigger type, key action nodes)
   - **Credentials to configure** — list each credential type + which nodes use it (see [Credential Handling](#credential-handling))

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
{ "__rl": true, "value": "gid=0", "mode": "list", "cachedResultName": "Sheet1", "cachedResultUrl": "..." }
```

**Known resource locator fields — always use `__rl` format:**

| Node | Fields |
|------|--------|
| `n8n-nodes-base.telegram` | `chatId` |
| `n8n-nodes-base.slack` | `channel`, `user` |
| `n8n-nodes-base.gmail` | `sendTo`, `messageId`, `labelIds` |
| `n8n-nodes-base.googleSheets` | `documentId`, `sheetName` |
| `n8n-nodes-base.googleDrive` | `driveId`, `folderId`, `fileId` |
| `n8n-nodes-base.notion` | `pageId`, `databaseId` |
| `n8n-nodes-base.airtable` | `baseId`, `tableId` |

---

## typeVersion Reference

Use these versions exactly. Older versions may still work but miss features/fixes.

| Node type | typeVersion |
|-----------|-------------|
| `n8n-nodes-base.telegramTrigger` | `1.2` |
| `n8n-nodes-base.telegram` | `1.2` |
| `n8n-nodes-base.webhook` | `2` |
| `n8n-nodes-base.scheduleTrigger` | `1.2` |
| `n8n-nodes-base.manualTrigger` | `1` |
| `n8n-nodes-base.httpRequest` | `4.2` |
| `n8n-nodes-base.code` | `2` |
| `n8n-nodes-base.set` | `3.4` |
| `n8n-nodes-base.if` | `2.2` |
| `n8n-nodes-base.switch` | `3.2` |
| `n8n-nodes-base.merge` | `3` |
| `n8n-nodes-base.splitInBatches` | `3` |
| `n8n-nodes-base.respondToWebhook` | `1.1` |
| `n8n-nodes-base.filter` | `2` |
| `n8n-nodes-base.aggregate` | `1` |
| `n8n-nodes-base.removeDuplicates` | `1.1` |
| `n8n-nodes-base.wait` | `1.1` |
| `n8n-nodes-base.errorTrigger` | `1` |
| `n8n-nodes-base.executeCommand` | `1` |
| `n8n-nodes-base.stickyNote` | `1` |
| `n8n-nodes-base.noOp` | `1` |
| `n8n-nodes-base.slack` | `2.3` |
| `n8n-nodes-base.gmail` | `2.1` |
| `n8n-nodes-base.googleSheets` | `4.5` |
| `n8n-nodes-base.googleDrive` | `3` |
| `@n8n/n8n-nodes-langchain.agent` | `1.7` |
| `@n8n/n8n-nodes-langchain.lmOpenAi` | `1.2` |
| `@n8n/n8n-nodes-langchain.memoryBufferWindow` | `1.3` |
| `@n8n/n8n-nodes-langchain.calculatorTool` | `1` |
| `@n8n/n8n-nodes-langchain.toolHttpRequest` | `1.1` |
| `@n8n/n8n-nodes-langchain.outputParserStructured` | `1.2` |
| `@n8n/n8n-nodes-langchain.textClassifier` | `1` |

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

### Manual Trigger

```json
{
  "name": "When clicking 'Test workflow'",
  "type": "n8n-nodes-base.manualTrigger",
  "typeVersion": 1,
  "position": [250, 300],
  "parameters": {}
}
```

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

### Error Trigger

```json
{
  "name": "Error Trigger",
  "type": "n8n-nodes-base.errorTrigger",
  "typeVersion": 1,
  "position": [250, 300],
  "parameters": {}
}
```

Use this as the start of a dedicated error-handling workflow. Set `settings.errorWorkflow` on production workflows to point to this workflow's ID.

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

### Filter

```json
{
  "name": "Filter",
  "type": "n8n-nodes-base.filter",
  "typeVersion": 2,
  "position": [500, 300],
  "parameters": {
    "conditions": {
      "options": { "caseSensitive": true, "leftValue": "" },
      "conditions": [
        {
          "id": "condition_0",
          "leftValue": "={{ $json.status }}",
          "rightValue": "active",
          "operator": { "type": "string", "operation": "equals" }
        }
      ],
      "combinator": "and"
    },
    "options": {}
  }
}
```

Items that pass the condition continue; others are dropped. Unlike IF, there is only one output.

### Aggregate

```json
{
  "name": "Aggregate",
  "type": "n8n-nodes-base.aggregate",
  "typeVersion": 1,
  "position": [700, 300],
  "parameters": {
    "aggregate": "aggregateAllItemData",
    "destinationFieldName": "data",
    "options": {}
  }
}
```

Modes: `aggregateAllItemData` (wraps all items into one array field), `aggregateIndividualFields` (use `fieldsToAggregate` to pick specific fields).

### Remove Duplicates

```json
{
  "name": "Remove Duplicates",
  "type": "n8n-nodes-base.removeDuplicates",
  "typeVersion": 1.1,
  "position": [700, 300],
  "parameters": {
    "compare": "allFields",
    "options": {}
  }
}
```

`compare` options: `"allFields"` (default), `"selectedFields"` (add `"fieldsToCompare": { "fields": [{ "fieldName": "id" }] }`).

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

### Wait

```json
{
  "name": "Wait",
  "type": "n8n-nodes-base.wait",
  "typeVersion": 1.1,
  "position": [700, 300],
  "parameters": {
    "resume": "timeInterval",
    "amount": 5,
    "unit": "seconds",
    "options": {}
  }
}
```

`resume` options: `"timeInterval"` (wait fixed duration), `"webhook"` (wait for external call), `"form"` (wait for form submission). `unit` options: `"seconds"`, `"minutes"`, `"hours"`, `"days"`.

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

### Slack — Send Message

```json
{
  "name": "Slack",
  "type": "n8n-nodes-base.slack",
  "typeVersion": 2.3,
  "position": [700, 300],
  "parameters": {
    "resource": "message",
    "operation": "post",
    "channel": { "__rl": true, "value": "#general", "mode": "name" },
    "text": "={{ $json.message }}",
    "otherOptions": {}
  },
  "credentials": {
    "slackApi": { "id": "1", "name": "Slack account" }
  }
}
```

`channel` mode options: `"name"` (use `#channel-name`), `"id"` (use channel ID), `"expression"`. For OAuth2 credentials, use `slackOAuth2Api` instead of `slackApi`.

### Gmail — Send Email

```json
{
  "name": "Gmail",
  "type": "n8n-nodes-base.gmail",
  "typeVersion": 2.1,
  "position": [700, 300],
  "parameters": {
    "resource": "message",
    "operation": "send",
    "sendTo": { "__rl": true, "value": "={{ $json.email }}", "mode": "expression" },
    "subject": "={{ $json.subject }}",
    "emailType": "text",
    "message": "={{ $json.body }}",
    "options": {}
  },
  "credentials": {
    "gmailOAuth2": { "id": "1", "name": "Gmail account" }
  }
}
```

`emailType` options: `"text"`, `"html"`. For HTML emails, change `message` key to `html`.

### Google Sheets — Append Row

```json
{
  "name": "Google Sheets",
  "type": "n8n-nodes-base.googleSheets",
  "typeVersion": 4.5,
  "position": [700, 300],
  "parameters": {
    "resource": "sheet",
    "operation": "append",
    "documentId": { "__rl": true, "value": "SPREADSHEET_ID", "mode": "id" },
    "sheetName": { "__rl": true, "value": "gid=0", "mode": "list", "cachedResultName": "Sheet1" },
    "columns": {
      "mappingMode": "autoMapInputData",
      "value": {},
      "matchingColumns": [],
      "schema": []
    },
    "options": {}
  },
  "credentials": {
    "googleSheetsOAuth2Api": { "id": "1", "name": "Google Sheets account" }
  }
}
```

For **read** operations, change `operation` to `"read"` and add `"filtersUI": { "values": [] }`. For **update**, use `operation: "update"` with `matchingColumns` set to the key column name.

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

Connect LLM as sub-node via `ai_languageModel` connection type. Always pair with OpenAI Chat Model below.

### OpenAI Chat Model (LangChain sub-node)

```json
{
  "name": "OpenAI Chat Model",
  "type": "@n8n/n8n-nodes-langchain.lmOpenAi",
  "typeVersion": 1.2,
  "position": [500, 500],
  "parameters": {
    "model": "gpt-4o-mini",
    "options": {}
  },
  "credentials": {
    "openAiApi": { "id": "1", "name": "OpenAI account" }
  }
}
```

Connect via `ai_languageModel` → AI Agent. Common models: `"gpt-4o"`, `"gpt-4o-mini"`, `"gpt-4-turbo"`.

### Window Buffer Memory (LangChain sub-node)

```json
{
  "name": "Window Buffer Memory",
  "type": "@n8n/n8n-nodes-langchain.memoryBufferWindow",
  "typeVersion": 1.3,
  "position": [700, 500],
  "parameters": {
    "sessionKey": "={{ $json.sessionId }}",
    "contextWindowLength": 10
  }
}
```

Connect via `ai_memory` → AI Agent. `contextWindowLength` = number of message pairs to retain.

### Calculator Tool (LangChain sub-node)

```json
{
  "name": "Calculator",
  "type": "@n8n/n8n-nodes-langchain.calculatorTool",
  "typeVersion": 1,
  "position": [300, 500],
  "parameters": {}
}
```

Connect via `ai_tool` → AI Agent. No configuration needed — gives the agent math capabilities.

### HTTP Request Tool (LangChain sub-node)

```json
{
  "name": "HTTP Request Tool",
  "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
  "typeVersion": 1.1,
  "position": [500, 500],
  "parameters": {
    "name": "search_api",
    "description": "Search an external API. Input should be a search query string.",
    "method": "GET",
    "url": "https://api.example.com/search",
    "sendQuery": true,
    "parametersQuery": {
      "values": [{ "name": "q", "valueProvider": "fieldValue", "value": "" }]
    }
  }
}
```

Connect via `ai_tool` → AI Agent. The agent passes its tool input as the query parameter.

### Structured Output Parser (LangChain sub-node)

```json
{
  "name": "Structured Output Parser",
  "type": "@n8n/n8n-nodes-langchain.outputParserStructured",
  "typeVersion": 1.2,
  "position": [700, 500],
  "parameters": {
    "schema": {
      "type": "object",
      "properties": {
        "result": { "type": "string", "description": "The main result" },
        "confidence": { "type": "number", "description": "Confidence score 0-1" }
      },
      "required": ["result"]
    }
  }
}
```

Connect via `ai_outputParser` → AI Agent. Forces the LLM to return structured JSON matching the schema.

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
    "Calculator": {
      "ai_tool": [[{ "node": "AI Agent", "type": "ai_tool", "index": 0 }]]
    },
    "Window Buffer Memory": {
      "ai_memory": [[{ "node": "AI Agent", "type": "ai_memory", "index": 0 }]]
    },
    "Structured Output Parser": {
      "ai_outputParser": [[{ "node": "AI Agent", "type": "ai_outputParser", "index": 0 }]]
    }
  }
}
```

Sub-node connection types: `ai_languageModel`, `ai_tool`, `ai_memory`, `ai_outputParser`. The sub-node's key uses the **sub-node connection type** as the key (not `main`). Multiple tools connect to the same agent — each tool gets its own entry under its own name.

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

### Error Output (continueErrorOutput)

Add `"onError": "continueErrorOutput"` to any node to give it a second output for errors. Wire it like an IF branch:

```json
{
  "connections": {
    "HTTP Request": {
      "main": [
        [{ "node": "Success Handler", "type": "main", "index": 0 }],
        [{ "node": "Error Handler", "type": "main", "index": 0 }]
      ]
    }
  }
}
```

The node config must include `"onError": "continueErrorOutput"`. `main[0]` = success, `main[1]` = error. The error output receives the original item plus an `error` field with message and stack.

### Error Trigger Workflow (separate workflow pattern)

For production workflows, create a dedicated error-handler workflow:

```json
{
  "connections": {
    "Error Trigger": {
      "main": [[{ "node": "Slack", "type": "main", "index": 0 }]]
    }
  }
}
```

Then on the main workflow, set `settings.errorWorkflow` to this workflow's ID. The Error Trigger receives `$json.execution` (id, url, error, workflowData).

---

## Validation Rules

- **Errors** → must fix before activating
- **Warnings** → informational, skip unless they indicate a real misconfiguration
- Profile `"runtime"` is the standard for pre-deploy checks
- Auto-sanitization runs on every update (fixes operator structures automatically — no manual action needed)

---

## Testing Workflows

After activation, verify the workflow runs correctly:

### Manual Trigger workflows
```
execute_workflow({ workflowId: "WORKFLOW_ID" })
```
Check the response for execution status. A successful run returns execution data with `finished: true`.

### Webhook workflows
- **Test URL** (workflow must be open in editor): `https://professionalaiassistants.com/n8n/webhook-test/{path}`
- **Production URL** (workflow must be active): `https://professionalaiassistants.com/n8n/webhook/{path}`
- Send a POST request with test data matching the expected payload structure.

### Schedule / Trigger workflows
- Temporarily change the schedule to run every minute, activate, wait for one execution, then restore the schedule.
- Or use `execute_workflow` with `startNodes` to run from a specific node.

### Interpreting execution results
- `finished: true` + no error → success
- `finished: false` + `data.resultData.error` → inspect the error message and the node that failed
- Empty output from a node → upstream data didn't match (check IF/Filter conditions and expression paths)

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
    "timezone": "America/New_York",
    "errorWorkflow": "WORKFLOW_ID_OF_ERROR_HANDLER"
  }
}
```

| Setting | Default | When to set |
|---------|---------|-------------|
| `executionOrder` | `"v1"` | Always leave as `"v1"` (deterministic) |
| `executionTimeout` | `-1` (none) | Set for workflows hitting external APIs that may hang |
| `saveExecutionProgress` | `false` | Set `true` for long/complex workflows to enable partial replay |
| `timezone` | Instance default | Set when Schedule Trigger needs a specific timezone |
| `errorWorkflow` | none | Set to ID of a workflow starting with Error Trigger node |

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
| Slack (API token) | `slackApi` |
| Slack (OAuth2) | `slackOAuth2Api` |
| Gmail | `gmailOAuth2` |
| Google Sheets | `googleSheetsOAuth2Api` |
| Google Drive | `googleDriveOAuth2Api` |
| YouTube | `youTubeOAuth2Api` |
| Notion | `notionApi` |
| Airtable | `airtableTokenApi` |
| OpenAI (LangChain) | `openAiApi` |
| HTTP Request (Header Auth) | `httpHeaderAuth` |
| HTTP Request (Bearer) | `httpBearerAuth` |
| HTTP Request (Basic Auth) | `httpBasicAuth` |

### Reporting credentials to the user

In the **Report** step, list every credential the user needs to connect:

> **Credentials to configure in n8n UI:**
> 1. Telegram Bot API → "Telegram account" (nodes: Telegram Trigger, Send Reply)
> 2. OpenAI API Key → "OpenAI account" (nodes: OpenAI Chat Model)

---

## n8n Instance

**URL:** https://professionalaiassistants.com/n8n
**Type:** Self-hosted VPS

Workflow URL pattern: `https://professionalaiassistants.com/n8n/workflow/{workflow_id}`
Webhook test URL: `https://professionalaiassistants.com/n8n/webhook-test/{path}`
Webhook production URL: `https://professionalaiassistants.com/n8n/webhook/{path}`

Credential IDs in workflow JSON (e.g. `"id": "1"`) are placeholders. User connects real credentials in the n8n UI after the workflow is created.
