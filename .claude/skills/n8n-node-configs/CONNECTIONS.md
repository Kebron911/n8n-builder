# Connections Reference

This document shows how to connect nodes together in n8n workflows.

---

## Linear Chain (A → B → C)

Sequential flow where one node's output goes to the next node's input.

```json
{
  "NodeA": { "main": [[{ "node": "NodeB", "type": "main", "index": 0 }]] },
  "NodeB": { "main": [[{ "node": "NodeC", "type": "main", "index": 0 }]] }
}
```

---

## IF Branch (true / false)

The IF node has two outputs: Output 0 for true, Output 1 for false.

```json
{
  "IF": {
    "main": [
      [{ "node": "True Branch", "type": "main", "index": 0 }],
      [{ "node": "False Branch", "type": "main", "index": 0 }]
    ]
  }
}
```

---

## Switch (multiple outputs)

The Switch node routes to different branches based on multiple conditions. Each rule gets its own output index.

```json
{
  "Switch": {
    "main": [
      [{ "node": "Route A", "type": "main", "index": 0 }],
      [{ "node": "Route B", "type": "main", "index": 0 }],
      [{ "node": "Fallback", "type": "main", "index": 0 }]
    ]
  }
}
```

---

## Merge (two inputs — critical: index 0 and 1)

The Merge node combines two branches. The inputs MUST use different indices (0 for first input, 1 for second input).

```json
{
  "Branch A": { "main": [[{ "node": "Merge", "type": "main", "index": 0 }]] },
  "Branch B": { "main": [[{ "node": "Merge", "type": "main", "index": 1 }]] }
}
```

---

## AI Agent with Sub-Nodes

AI Agents (LangChain) connect to sub-nodes using specialized connection types: `ai_languageModel`, `ai_tool`, `ai_memory`, `ai_outputParser`.

```json
{
  "Trigger":              { "main":              [[{ "node": "AI Agent", "type": "main",              "index": 0 }]] },
  "OpenAI Chat Model":   { "ai_languageModel":  [[{ "node": "AI Agent", "type": "ai_languageModel", "index": 0 }]] },
  "Calculator":          { "ai_tool":           [[{ "node": "AI Agent", "type": "ai_tool",          "index": 0 }]] },
  "SerpAPI":             { "ai_tool":           [[{ "node": "AI Agent", "type": "ai_tool",          "index": 0 }]] },
  "Call Sub-Workflow":   { "ai_tool":           [[{ "node": "AI Agent", "type": "ai_tool",          "index": 0 }]] },
  "Window Buffer Memory":{ "ai_memory":         [[{ "node": "AI Agent", "type": "ai_memory",        "index": 0 }]] },
  "Structured Output Parser": { "ai_outputParser": [[{ "node": "AI Agent", "type": "ai_outputParser", "index": 0 }]] }
}
```

**Key rules:**
- Multiple tools connect to the same `ai_tool` port — each uses `"index": 0`
- LangChain sub-nodes MUST NOT connect via `main`; use the specialized types above
- Connecting via `main` instead causes the sub-node to be silently ignored at runtime

---

## Loop (Split In Batches)

The Split In Batches node has two outputs: Output 0 is the loop body (one batch), Output 1 is done (loop finished).

```json
{
  "Split In Batches": {
    "main": [
      [{ "node": "Process Item", "type": "main", "index": 0 }],
      [{ "node": "Done Handler", "type": "main", "index": 0 }]
    ]
  },
  "Process Item": { "main": [[{ "node": "Split In Batches", "type": "main", "index": 0 }]] }
}
```

---

## Error Output (continueErrorOutput)

Enable error handling on a node by adding `"onError": "continueErrorOutput"` to its config. The node will then have two outputs: Output 0 = success, Output 1 = error.

```json
{
  "HTTP Request": {
    "main": [
      [{ "node": "Success Handler", "type": "main", "index": 0 }],
      [{ "node": "Error Handler",   "type": "main", "index": 0 }]
    ]
  }
}
```

Node config snippet:
```json
{
  "name": "HTTP Request",
  "type": "n8n-nodes-base.httpRequest",
  "onError": "continueErrorOutput",
  ...
}
```
