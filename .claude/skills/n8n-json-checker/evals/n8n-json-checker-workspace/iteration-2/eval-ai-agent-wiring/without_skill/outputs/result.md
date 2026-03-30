# Workflow Analysis: AI Support Agent

## Summary

5 issues found: 3 errors, 1 structural problem, 1 minor omission.

---

## Issue 1 — Wrong node type for OpenAI Chat Model (ERROR)

**Node:** `OpenAI Chat Model`

The `type` field is set to `@n8n/n8n-nodes-langchain.lmChatOpenAi`, which is not the correct node type identifier.

**Correct type:**
```
@n8n/n8n-nodes-langchain.lmOpenAi
```

Using the wrong type will cause the node to fail to load or be unrecognized by n8n.

---

## Issue 2 — Wrong typeVersion for OpenAI Chat Model (ERROR)

**Node:** `OpenAI Chat Model`

The node uses `"typeVersion": 1`, but the current recommended version is `1.2`.

**Fix:**
```json
"typeVersion": 1.2
```

Older versions may lack features and fixes available in the current version.

---

## Issue 3 — OpenAI Chat Model wired with wrong connection type (ERROR — Critical)

**Location:** `connections` object

The `OpenAI Chat Model` is connected to `AI Agent` using the `"main"` connection type:

```json
"OpenAI Chat Model": {
  "main": [[{ "node": "AI Agent", "type": "main", "index": 0 }]]
}
```

LangChain sub-nodes **must** use their designated connection type, not `"main"`. For a language model sub-node, the correct connection type is `ai_languageModel`:

```json
"OpenAI Chat Model": {
  "ai_languageModel": [[{ "node": "AI Agent", "type": "ai_languageModel", "index": 0 }]]
}
```

With the wrong connection type, the AI Agent node will never receive a language model and will fail at runtime with a "no language model connected" error.

---

## Issue 4 — Missing "Respond to Webhook" node (Structural Problem)

**Location:** Webhook trigger + overall workflow structure

The Webhook trigger is configured with:
```json
"responseMode": "responseNode"
```

This mode requires a `Respond to Webhook` node (`n8n-nodes-base.respondToWebhook`, typeVersion `1.1`) to be present downstream and wired to send the HTTP response back to the caller.

Without this node, the webhook will hang indefinitely and never return an HTTP response.

**Fix:** Add a Respond to Webhook node after the AI Agent and wire it:

```json
{
  "name": "Respond to Webhook",
  "type": "n8n-nodes-base.respondToWebhook",
  "typeVersion": 1.1,
  "position": [750, 300],
  "parameters": {
    "respondWith": "json",
    "responseBody": "={{ $json }}",
    "options": {}
  }
}
```

Add connection:
```json
"AI Agent": {
  "main": [[{ "node": "Respond to Webhook", "type": "main", "index": 0 }]]
}
```

---

## Issue 5 — Missing `options` field on OpenAI Chat Model (Minor)

**Node:** `OpenAI Chat Model`

The node is missing the `"options": {}` field expected by the node schema. While not always fatal, it should be included for completeness:

```json
"parameters": {
  "model": "gpt-4o",
  "options": {}
}
```

---

## Corrected Workflow JSON

```json
{
  "name": "AI Support Agent",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [250, 300],
      "parameters": {
        "httpMethod": "POST",
        "path": "support",
        "responseMode": "responseNode"
      }
    },
    {
      "name": "AI Agent",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "typeVersion": 1.7,
      "position": [500, 300],
      "parameters": {
        "text": "={{ $json.body.message }}",
        "options": {}
      }
    },
    {
      "name": "OpenAI Chat Model",
      "type": "@n8n/n8n-nodes-langchain.lmOpenAi",
      "typeVersion": 1.2,
      "position": [500, 500],
      "parameters": {
        "model": "gpt-4o",
        "options": {}
      },
      "credentials": {
        "openAiApi": { "id": "2", "name": "OpenAI" }
      }
    },
    {
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.1,
      "position": [750, 300],
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ $json }}",
        "options": {}
      }
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{ "node": "AI Agent", "type": "main", "index": 0 }]]
    },
    "OpenAI Chat Model": {
      "ai_languageModel": [[{ "node": "AI Agent", "type": "ai_languageModel", "index": 0 }]]
    },
    "AI Agent": {
      "main": [[{ "node": "Respond to Webhook", "type": "main", "index": 0 }]]
    }
  }
}
```

---

## Issue Summary Table

| # | Severity | Node | Problem |
|---|----------|------|---------|
| 1 | Error | OpenAI Chat Model | Wrong `type`: `lmChatOpenAi` → `lmOpenAi` |
| 2 | Error | OpenAI Chat Model | Wrong `typeVersion`: `1` → `1.2` |
| 3 | Error (Critical) | connections | `"main"` connection used instead of `"ai_languageModel"` |
| 4 | Structural | Workflow | Missing `Respond to Webhook` node required by `responseMode: responseNode` |
| 5 | Minor | OpenAI Chat Model | Missing `"options": {}` in parameters |
