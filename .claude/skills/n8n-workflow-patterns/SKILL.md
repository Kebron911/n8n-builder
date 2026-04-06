---
name: n8n-workflow-patterns
description: >
  Proven workflow architectural patterns for planning WHAT to build before
  touching any tools. Use FIRST when building or planning a new workflow —
  before sourcing nodes or calling MCP tools. Covers the 5 core patterns:
  webhook processing, HTTP API integration, database operations, AI agent
  workflows, and scheduled tasks. Each pattern has a canonical node sequence,
  data flow diagram, error handling strategy, and real template examples.
  Trigger on: "build a workflow", "design a workflow", "what pattern should I
  use", "how should I structure this", or any new workflow request before
  implementation starts. Use this BEFORE n8n-node-configuration (specific
  node fields) and BEFORE n8n-mcp-tools-expert (how to call tools).
---

# n8n Workflow Patterns

n8n-specific behaviors that Claude gets wrong without this skill. Generic flow concepts (linear/branching/parallel/loops, when to use webhooks vs. schedules, etc.) are excluded — those Claude knows. This skill covers only what n8n does differently.

---

## Critical n8n-Specific Gotchas

### 1. Webhook data lives under `$json.body`

The Webhook trigger wraps the request — the payload is NOT at `$json` root:

```
❌ {{$json.email}}          // always empty — most common mistake
✅ {{$json.body.email}}     // correct

{{$json.body.fieldName}}     // POST body
{{$json.headers['x-api-key']}} // request header
{{$json.query.token}}        // ?token=abc
```

### 2. Webhook response modes — two incompatible behaviors

| `responseMode` | Behavior | Use when |
|----------------|----------|----------|
| `"onReceived"` (default) | Sends 200 immediately, workflow runs in background | Long processing, fire-and-forget |
| `"lastNode"` | Waits for full workflow, returns Respond to Webhook output | Caller needs data back |

**Critical**: Respond to Webhook node is **silently ignored** when `responseMode` is `"onReceived"`. Must set `"responseMode": "lastNode"` to use it.

### 3. ANY n8n node can be an AI tool

Not just dedicated tool nodes — any node (HTTP Request, Postgres, Code, Slack, etc.) becomes a tool when connected via `ai_tool` port. The agent uses the node's `name` and `description` fields to decide when to call it.

### 4. Memory `sessionKey` must be dynamic

Static session keys cause all users/conversations to share memory:

```javascript
❌ "sessionKey": "conversation"              // ALL executions share memory
✅ "sessionKey": "={{ $json.body.user_id }}" // per-user isolation
✅ "sessionKey": "={{ $json.message.chat.id }}" // Telegram: per-chat
```

### 5. Error output branch requires node-level flag

```json
{ "onError": "continueErrorOutput" }
```

Wire like an IF branch — `main[0]` = success, `main[1]` = error. Without this flag, the second output never fires.

### 6. Error Trigger belongs in a SEPARATE workflow

The Error Trigger is NOT wired inside the main workflow. It lives in a dedicated standalone workflow:

- **Main workflow**: set `settings.errorWorkflow` to the error handler's workflow ID
- **Error handler workflow**: starts with Error Trigger, then notifies via Slack/Telegram/email

```json
{ "settings": { "errorWorkflow": "vQKuXqX6mzCEGmaE" } }
```

Wiring an Error Trigger inside the same workflow as the Schedule Trigger does nothing.

---

## The 5 Patterns — Canonical Node Sequences

### Pattern 1: Webhook Processing

```
Webhook → [IF: validate/filter] → Set/Code: format → Action → [Respond to Webhook?]
```

**Always include a dedicated Set or Code node to format the message/payload**, even if the formatting seems simple enough to do inline. This makes the pipeline explicit and keeps action nodes clean.

**n8n-specific decisions:**
- `responseMode: "onReceived"` → no Respond to Webhook node needed (fire-and-forget)
- `responseMode: "lastNode"` → must end with Respond to Webhook node

When the caller doesn't need a response body back (e.g., GitHub webhooks, notification triggers), use `"onReceived"` and skip the Respond to Webhook node entirely.

### Pattern 2: HTTP API Integration

```
Trigger → HTTP Request → Code/Set: transform → Action
```

Per-node error routing (add to the HTTP Request node):
```json
{ "onError": "continueErrorOutput" }
```
Wire `main[0]` to success path, `main[1]` to error handler.

### Pattern 3: Database Operations

```
Trigger → DB Read → [IF: records exist?] → Set: map schema → DB Write → [Log/Notify]
```

For large datasets (1,000+ rows), add Split In Batches between DB Read and DB Write.

### Pattern 4: AI Agent Workflow

```
Trigger → AI Agent
           ← OpenAI Chat Model     (ai_languageModel — required)
           ← Tool nodes            (ai_tool — any node, multiple allowed)
           ← Memory node           (ai_memory — optional)
         → [Format] → Output
```

The most important things to get right:
1. Sub-nodes connect via `ai_languageModel` / `ai_tool` / `ai_memory` — **not** `main`. Wiring via `main` silently ignores the sub-node.
2. Write tool descriptions clearly enough for the LLM to pick the right tool.
3. Use a dynamic `sessionKey` on the memory node for per-user isolation.

See [ai_agent_workflow.md](ai_agent_workflow.md) for memory types and tool description guidance.

### Pattern 5: Scheduled Tasks

```
Schedule Trigger → [HTTP Request / DB Read] → Code/Set: process → Email/Slack: deliver
```

Schedule Trigger config:
```json
{
  "rule": {
    "interval": [{ "field": "hours", "hoursInterval": 1 }]
  }
}
```
`field` options: `"minutes"`, `"hours"`, `"days"`, `"weeks"`, `"months"`, `"cronExpression"`.

**Production-required settings** — always include for scheduled workflows:
```json
{
  "settings": {
    "timezone": "America/New_York",
    "errorWorkflow": "vQKuXqX6mzCEGmaE",
    "saveExecutionProgress": true,
    "executionTimeout": 300
  }
}
```

Timezone is set on the workflow `settings` object, not on the Schedule Trigger node itself. `errorWorkflow` points to a SEPARATE dedicated workflow starting with Error Trigger — do NOT add an Error Trigger inside this workflow.

---

## Detailed Pattern Files

For n8n-specific node configs and edge cases in each pattern:

- [webhook_processing.md](webhook_processing.md) — response modes, data structure access, signature verification
- [http_api_integration.md](http_api_integration.md) — n8n pagination wiring, retry patterns
- [database_operations.md](database_operations.md) — n8n DB node operations, batch sync wiring
- [ai_agent_workflow.md](ai_agent_workflow.md) — AI connection types, memory types, tool config fields
- [scheduled_tasks.md](scheduled_tasks.md) — cron config, timezone, error workflow linkage
