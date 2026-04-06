---
name: n8n-json-checker
description: >
  Pre-flight validation of n8n workflow JSON BEFORE deploying to the instance.
  Trigger when user pastes workflow JSON, asks "check this n8n json", "does this
  workflow look right", "validate this workflow", or "will this work?" with JSON
  in context. Do NOT use for live MCP validator errors — use n8n-validation-expert.
---

# n8n JSON Checker

Pre-flight static analysis + MCP validation for n8n workflow JSON. Catches structural errors before deployment.

## When to Use This Skill vs n8n-validation-expert

| Situation | Use |
|-----------|-----|
| User pastes workflow JSON for review | **This skill** |
| "Does this workflow look right?" / "Will this work?" | **This skill** |
| Reviewing a workflow file before deploying | **This skill** |
| MCP validator returned errors after create/update | **n8n-validation-expert** |
| Workflow is live but broken | **n8n-validation-expert** |

---

## Step 1: Get the JSON

Use JSON from the message directly, or read from a file path. If neither, ask for it.

---

## Step 2: Static Analysis Checklist

Run every check below. Record ALL findings before moving to Step 3.

---

### 2.1 nodeType Format

Three valid prefixes:

| Node category | Type format | Example |
|---------------|-------------|---------|
| Built-in | `n8n-nodes-base.<name>` | `n8n-nodes-base.telegram` |
| LangChain | `@n8n/n8n-nodes-langchain.<name>` | `@n8n/n8n-nodes-langchain.agent` |
| Community | `<npm-package-name>.<NodeName>` | `n8n-nodes-evolution-api.EvolutionApi` |

**Error:** `nodes-base.telegram` — missing the `n8n-` prefix.

**NEVER validate the suffix** — only the prefix matters. `lmChatOpenAi`, `lmChatAnthropic`, `toolCode`, `toolWorkflow` are all valid suffixes. Do NOT flag them as wrong node types.

Example: `@n8n/n8n-nodes-langchain.lmChatOpenAi` is valid — prefix `@n8n/n8n-nodes-langchain.` is correct. Never flag the `.lmChatOpenAi` part.

**Community node:** anything not matching the first two patterns → flag as warning (see 2.11).

---

### 2.2 Resource Locator Fields (`__rl`)

These fields **must** use the `__rl` object — a plain string silently breaks at runtime.

Three valid modes:
```json
{ "__rl": true, "value": "STATIC_ID", "mode": "id" }
{ "__rl": true, "value": "={{ $json.id }}", "mode": "expression" }
{ "__rl": true, "value": "gid=0", "mode": "list", "cachedResultName": "Sheet1", "cachedResultUrl": "..." }
```

**Complete `__rl` field table — check all of these:**

| Node | Fields requiring `__rl` |
|------|------------------------|
| `n8n-nodes-base.telegram` | `chatId` |
| `n8n-nodes-base.slack` | `channel`, `user` |
| `n8n-nodes-base.gmail` | `sendTo`, `messageId`, `labelIds`, `threadId` |
| `n8n-nodes-base.googleSheets` | `documentId`, `sheetName` |
| `n8n-nodes-base.googleDrive` | `driveId`, `folderId`, `fileId` |
| `n8n-nodes-base.googleCalendar` | `calendarId`, `eventId` |
| `n8n-nodes-base.notion` | `pageId`, `databaseId`, `blockId` |
| `n8n-nodes-base.airtable` | `baseId`, `tableId` |
| `n8n-nodes-base.hubspot` | `contactId`, `companyId`, `dealId` |
| `n8n-nodes-base.pipedrive` | `dealId`, `personId`, `organizationId` |
| `n8n-nodes-base.salesforce` | `recordId` |
| `n8n-nodes-base.googleDocs` | `documentId` |
| `n8n-nodes-base.jira` | `issueId`, `projectId` |
| `n8n-nodes-base.github` | `owner`, `repository`, `issueNumber` |
| `n8n-nodes-base.microsoftTeams` | `channelId`, `teamId` |
| `n8n-nodes-base.clickUp` | `listId`, `taskId` |
| `n8n-nodes-base.asana` | `taskId`, `projectId` |
| `n8n-nodes-base.zendesk` | `ticketId` |
| `n8n-nodes-base.freshdesk` | `ticketId` |
| `n8n-nodes-base.executeWorkflow` | `workflowId` |

**Error** if the field is a plain string. For each error, show the corrected JSON:
```json
// WRONG
"chatId": "{{ $json.message.chat.id }}"

// CORRECT
"chatId": { "__rl": true, "value": "={{ $json.message.chat.id }}", "mode": "expression" }
```

---

### 2.3 Required Fields Per Node Type

| Node type | Required fields |
|-----------|----------------|
| `n8n-nodes-base.telegram` (sendMessage) | `chatId` (__rl), `text` |
| `n8n-nodes-base.slack` (post message) | `channel` (__rl), `text` |
| `n8n-nodes-base.gmail` (send) | `sendTo` (__rl), `subject`, `message` |
| `n8n-nodes-base.httpRequest` | `url` |
| `n8n-nodes-base.code` | `jsCode` (JS) or `pythonCode` (Python) |
| `n8n-nodes-base.set` | `fields.values` array |
| `n8n-nodes-base.if` | `conditions.conditions` array (non-empty) |
| `n8n-nodes-base.switch` | `rules.values` array (non-empty) |
| `n8n-nodes-base.webhook` | `path`, `httpMethod` |
| `n8n-nodes-base.scheduleTrigger` | `rule.interval` array |
| `n8n-nodes-base.googleSheets` (append/appendOrUpdate/read/update/upsert) | `documentId` (__rl), `sheetName` (__rl) |
| `@n8n/n8n-nodes-langchain.agent` | connected language model via `ai_languageModel` |
| `@n8n/n8n-nodes-langchain.lmOpenAi` | credentials block with `openAiApi` |

---

### 2.3a JavaScript Code Node Checks

> **Source of truth:** `n8n-code-javascript` skill. Update that skill first, then mirror error/warning entries here.

For `n8n-nodes-base.code` nodes with `jsCode`:

**Errors (will break execution):**
- `import ` or `export ` keywords — not supported in Code node sandbox. Fix: use `require('module-name')` instead. Example: `import { parse } from 'json5'` → `const { parse } = require('json5')`.
- `this.getCredentials(` — silently fails. Fix: use HTTP Request node with credentials.
- `$itemIndex`, `$secrets`, `$version` inside `jsCode` — expression-only variables, not available in code context.

**Warnings (likely runtime errors):**
- `return` returning a plain object: `return { result }` → should be `return [{ json: { result } }]`
- `json:` key followed by `[` — `json` must be an object, not array
- No `return` statement at all
- `.toDate()`, `.isEmail()`, `.toTitleCase()` — expression helpers that don't work in jsCode

---

### 2.3b Python Code Node Checks

For `n8n-nodes-base.code` nodes with `pythonCode`:

**Errors:**
- `import pandas`, `import numpy`, `import requests` — only standard library available. Fix: use HTTP Request node for HTTP calls.
- Bare `return` with no value (just `return` on its own at module level) — use `return [{"json": {...}}]` or `return_value = [{"json": {...}}]` instead.

> **Valid Python return patterns in n8n:** Both `return [{"json": {...}}]` and `return_value = [{"json": {...}}]` are correct. Do NOT flag `return [{"json": row} for row in data]` or any `return [...]` as an error — these are correct syntax.

**Warnings:**
- Using `datetime` without `from datetime import datetime`.
- `json.loads` on `_input.first().json` — `.json` is already a dict in Python, not a string.

---

### 2.3c AI Agent Node Checks

For `@n8n/n8n-nodes-langchain.agent`:

1. **Language model wired?** — Check `connections` for an entry connecting to this agent via `ai_languageModel`. **Error** if none.
2. **System prompt present?** — Check `parameters.options.systemMessage`. **Warning** if absent.

For `@n8n/n8n-nodes-langchain.memoryBufferWindow`:
- **Warning** (NEVER Error) if `sessionKey` is a hardcoded static string — all executions share the same memory context. Fix: `"sessionKey": "={{ $json.sessionId }}"`. **Even if the workflow is a multi-user bot, this is still only a Warning — do not promote it to Error.**

---

### 2.4 typeVersion Checks

See CLAUDE.md → `## typeVersion Reference` for the complete version table. **Warning** (not error) if a version is older — workflow may still work but miss features/fixes.

---

### 2.5 Credential Key Names

**Warning** (NOT Error) for misspellings (e.g., `slackAPI`, `gmailOauth2`, `openaiApi`). See CLAUDE.md → `## Credential Handling` for the complete credential key table.

**HTTP Request with `predefinedCredentialType`:** Must have both `nodeCredentialType` set AND a matching `credentials` block. **Error** if either is missing.

---

### 2.6 Expression Syntax

Scan all string values:

- **Error** if `={{` has no closing `}}` — unbalanced braces
- **Error** if `$node[` references a node name not in the workflow — misspelled node reference
- **Warning** if bare `$json.field` appears outside `={{ ... }}` — will not be evaluated
- **Warning** for paths with 4+ levels of nesting like `={{ $json.a.b.c.d }}` — silent `undefined` if any intermediate key is absent. Suggest null-safe access or upstream IF check. **Do NOT warn on 2–3 level paths** like `$json.message.chat.id` or `$json.body.data.id` — these are normal structured-data access patterns common in Telegram, webhook, and API payloads.
- **Error** if `$fromAI(` appears with fewer than 1 argument or more than 3 — signature is `$fromAI('paramName', 'description', 'type')`. Type must be `'string'`, `'number'`, `'boolean'`, or `'json'`. **Warning** if `$fromAI(` appears outside an AI tool node — it has no effect in regular nodes.

---

### 2.7 Duplicate Node Names

n8n requires unique node names. **Error** if two or more nodes share the same `name` value — causes silent connection failures since connections reference nodes by name.

---

### 2.8 Connection Structure

**Orphaned nodes:** Any non-trigger node that does not appear as a target in any connection AND is not a LangChain sub-node → **Warning**: "Node '[name]' is not connected — it will never execute."

LangChain sub-nodes (lmOpenAi, memoryBufferWindow, calculatorTool, toolHttpRequest, outputParserStructured, etc.) are exempt — they connect via typed channels, not `main`.

**Missing trigger:** No node with type ending in `Trigger`/`trigger`, AND no `webhook` node → **Warning**.

**Merge node inputs:** Needs connections to both `index: 0` AND `index: 1`. **Error** if only one input is wired.

**AI Agent sub-nodes:** LangChain sub-nodes must connect via typed channels — NOT `main`. **Error** if a sub-node is connected via `main`.

| Connection type | Used by |
|-----------------|---------|
| `ai_languageModel` | `lmOpenAi`, `lmAnthropic`, `lmOllama`, `lmGroq`, etc. |
| `ai_tool` | `calculatorTool`, `toolHttpRequest`, `toolCode`, `toolWorkflow`, etc. |
| `ai_memory` | `memoryBufferWindow`, `memoryRedis`, `memoryChatDynamo`, etc. |
| `ai_outputParser` | `outputParserStructured`, `outputParserAutoFix`, etc. |
| `ai_vectorStore` | `vectorStoreInMemory`, `vectorStorePinecone`, `vectorStoreSupabase`, etc. |
| `ai_document` | `documentDefaultDataLoader`, `documentBinaryInputLoader`, etc. |
| `ai_textSplitter` | `textSplitterCharacterTextSplitter`, `textSplitterTokenSplitter`, etc. |
| `ai_embedding` | `embeddingsOpenAi`, `embeddingsHuggingFace`, etc. |
| `ai_retriever` | `retrieverVectorStore`, `retrieverMultiQuery`, etc. |

**IF / Switch output count:**
- IF node: must have exactly 2 output arrays (true + false). **Error** if only 1.
- Switch node: output count must equal number of rules (+ 1 if fallback enabled). **Error** if mismatch.

**Broken references:** Any connection targeting a node name not in the workflow → **Error**.

---

### Checks 2.9–2.16 (Node-Specific Edge Cases)

If the workflow contains `splitInBatches`, community nodes, `httpRequest` with auth, `executeWorkflow`, `formTrigger`, hardcoded secrets, or 5+ nodes with no error handler — read [EDGE_CASE_CHECKS.md] for checks 2.9–2.16.

---

## Step 3: MCP Validation

After static analysis, call:

```
n8n_validate_workflow({
  workflow: <full workflow JSON object>,
  profile: "runtime"
})
```

De-duplicate against static findings. Merge into one report.

---

## Step 4: Report

```
## n8n Workflow Check

### Errors (must fix before activating)
1. [Node name] — [issue] — [exact corrected JSON snippet]

### Warnings (review, may be acceptable)
1. [Node name] — [issue] — [suggestion]

### Clean ✓
[category] — no issues found
```

**For every error, include the corrected JSON** — show exact before/after.

If zero errors AND zero warnings: `✓ No issues found. Workflow looks good to activate.`

---

## Step 5: Offer Fixes and Test Payload

**Always include this block** at the end of every report — do not skip it even if the workflow looks mostly clean:

> Would you like me to:
> - **Apply fixes** — output the corrected workflow JSON with all errors resolved?
> - **Generate a test payload** — produce sample input data to test the trigger?

After the user responds:
- **Apply fixes?** → If yes, output the complete corrected workflow JSON.
- **Generate test payload?** → If yes, produce based on trigger type:

**Webhook trigger:**
```json
// POST https://professionalaiassistants.com/n8n/webhook-test/{path}
{
  "body": { ...fields inferred from how $json.body.* is used downstream... },
  "headers": { "Content-Type": "application/json" }
}
```

**Telegram trigger:**
```json
{
  "message": {
    "message_id": 1,
    "from": { "id": 123456789, "first_name": "Test", "username": "testuser" },
    "chat": { "id": 123456789, "type": "private" },
    "date": 1700000000,
    "text": "Hello test message"
  }
}
```

**Manual trigger:** No payload — call `execute_workflow({ workflowId: "ID" })`.

**Schedule trigger:** Temporarily set to every 1 minute, activate, wait for one execution, then restore.

---

## Step 6: Capture New Patterns

After completing the check — if you found an `__rl` field, credential key, typeVersion, or error pattern not covered above, use `n8n-capture-learning` to add it. This is how the checker stays current.

---

## Severity Guide

| Severity | Meaning |
|----------|---------|
| Error | Will cause activation failure or silent runtime breakage |
| Warning | Workflow may activate but could behave unexpectedly |

Operator structure issues (missing `singleValue`, IF conditions metadata) are auto-fixed by n8n on save — don't report these as errors.
