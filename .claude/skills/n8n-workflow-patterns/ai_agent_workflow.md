# AI Agent Workflow — n8n-Specific Details

---

## ANY Node as a Tool

The `ai_tool` connection type works with any n8n node — not just dedicated tool nodes. The agent reads the node's `name` and `description` parameters to decide when to call it.

Required fields when using a generic node as a tool:
```json
{
  "name": "search_orders",
  "description": "Look up customer orders by email address. Returns order ID, status, and items.",
  ...rest of node config...
}
```

The description is what the LLM uses for tool selection — vague descriptions lead to wrong tool calls.

---

## Memory Types (n8n-specific implementations)

### Window Buffer Memory (recommended)
Stores last N message pairs. Best for most chat workflows.

```json
{
  "type": "@n8n/n8n-nodes-langchain.memoryBufferWindow",
  "typeVersion": 1.3,
  "parameters": {
    "sessionKey": "={{ $json.body.session_id }}",
    "contextWindowLength": 10
  }
}
```

### Buffer Memory
Stores all messages until cleared. Grows indefinitely — use only for short sessions.

```json
{
  "parameters": {
    "sessionKey": "={{ $json.body.user_id }}"
  }
}
```

### Summary Memory
Summarizes old messages when conversation grows long. Costs extra tokens for summarization.

```json
{
  "parameters": {
    "sessionKey": "={{ $json.body.session_id }}",
    "maxTokenLimit": 2000
  }
}
```

**Critical sessionKey rule**: Must be dynamic. Static key = all executions share one memory context:
```javascript
❌ "sessionKey": "chat"                          // everyone shares memory
✅ "sessionKey": "={{ $json.body.user_id }}"    // per-user
✅ "sessionKey": "={{ $json.message.chat.id }}" // Telegram per-chat
```

---

## AI Agent Node Config

```json
{
  "type": "@n8n/n8n-nodes-langchain.agent",
  "typeVersion": 1.7,
  "parameters": {
    "text": "={{ $json.message }}",
    "options": {}
  }
}
```

The `text` parameter is the user's input to the agent. System prompt goes in `options.systemMessage`:
```json
{
  "parameters": {
    "text": "={{ $json.body.message }}",
    "options": {
      "systemMessage": "You are a support agent. Answer questions about orders and shipping only."
    }
  }
}
```

---

## Tool Node Config Fields

When configuring any node as an AI tool, these fields control tool behavior:

```json
{
  "name": "get_weather",
  "description": "Get current weather for a city. Input should be the city name.",
  ...node-specific parameters...
}
```

For HTTP Request as tool:
```json
{
  "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
  "typeVersion": 1.1,
  "parameters": {
    "name": "search_api",
    "description": "Search for products by keyword. Returns name, price, and availability.",
    "method": "GET",
    "url": "https://api.example.com/search",
    "sendQuery": true,
    "parametersQuery": {
      "values": [{ "name": "q", "valueProvider": "fieldValue", "value": "" }]
    }
  }
}
```

---

## Structured Output Parser

Forces the LLM to return typed JSON instead of free text:

```json
{
  "type": "@n8n/n8n-nodes-langchain.outputParserStructured",
  "typeVersion": 1.2,
  "parameters": {
    "schema": {
      "type": "object",
      "properties": {
        "sentiment": { "type": "string", "enum": ["positive", "negative", "neutral"] },
        "confidence": { "type": "number" },
        "summary": { "type": "string" }
      },
      "required": ["sentiment", "confidence"]
    }
  }
}
```

Connect via `ai_outputParser` port. The AI Agent's output will be the parsed JSON object.

---

## Common Failure Patterns

**LLM connected via `main`** — agent runs with no model, either errors or produces nothing.

**Tool connected via `main`** — tool is treated as a regular upstream node, not a callable function. Agent never calls it.

**Static sessionKey** — all conversations share memory. User A sees User B's history.

**Vague tool description** — LLM skips the tool or calls it incorrectly. Be specific about inputs and outputs.

**Tool returns large dataset** — exceeds context window. Always add LIMIT to DB queries used as tools, or slice arrays in Code nodes before returning.
