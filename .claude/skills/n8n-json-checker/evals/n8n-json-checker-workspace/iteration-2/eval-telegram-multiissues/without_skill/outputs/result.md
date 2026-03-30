# n8n Workflow JSON Analysis — Telegram Echo Bot

## Summary

The workflow contains **4 definite issues** that will cause silent failures or runtime errors, plus 1 minor omission.

---

## Issues Found

### Issue 1 — Wrong `type` prefix on both nodes (CRITICAL)

**Affected nodes:** Telegram Trigger, Send Reply

Both nodes use `nodes-base.` as the type prefix:
- `"type": "nodes-base.telegramTrigger"`
- `"type": "nodes-base.telegram"`

**Correct format** for workflow JSON (`n8n_create_workflow`, `n8n_update_partial_workflow`) requires:
- `"type": "n8n-nodes-base.telegramTrigger"`
- `"type": "n8n-nodes-base.telegram"`

The `nodes-base.` prefix (without `n8n-`) is only valid when calling MCP tools like `search_nodes`, `get_node`, or `validate_node`. Using it in workflow JSON causes the nodes to be unrecognized, resulting in silent failures or errors on activation.

---

### Issue 2 — Wrong `typeVersion` on Telegram Trigger (ERROR)

**Affected node:** Telegram Trigger

The node uses `"typeVersion": 1.1`, but the correct recommended version is `1.2`.

```json
// Wrong
"typeVersion": 1.1

// Correct
"typeVersion": 1.2
```

Older typeVersions may lack features or contain unfixed bugs. The canonical version is `1.2`.

---

### Issue 3 — Wrong credential key on Telegram Trigger (ERROR)

**Affected node:** Telegram Trigger

The credentials block uses `"telegramAPI"` (uppercase `API`):

```json
"credentials": {
  "telegramAPI": { "id": "1", "name": "Telegram account" }
}
```

The correct credential key is `"telegramApi"` (lowercase `pi`):

```json
"credentials": {
  "telegramApi": { "id": "1", "name": "Telegram account" }
}
```

Note: The Send Reply node correctly uses `"telegramApi"`. The Trigger node has a typo. A mismatched credential key means the node will not find the credential and will fail to authenticate.

---

### Issue 4 — `chatId` missing required `__rl` resource locator format (CRITICAL)

**Affected node:** Send Reply

The `chatId` field uses a plain string expression:

```json
"chatId": "={{ $json.message.chat.id }}"
```

The `chatId` field on `n8n-nodes-base.telegram` requires the resource locator (`__rl`) object format:

```json
"chatId": {
  "__rl": true,
  "value": "={{ $json.message.chat.id }}",
  "mode": "expression"
}
```

Using a plain string instead of the `__rl` object will cause a validation warning and may result in a runtime failure where the message is not sent or is sent to the wrong chat.

---

### Issue 5 — Nodes missing `id` field (MINOR)

**Affected nodes:** Both nodes

n8n nodes are expected to have a unique `id` field (typically a UUID string). While n8n may auto-assign IDs on import, omitting them can cause issues with partial updates, referencing, and deduplication.

```json
// Recommended addition to each node
"id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

---

## Corrected Workflow JSON

```json
{
  "name": "Telegram Echo Bot",
  "nodes": [
    {
      "id": "node-001",
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
    },
    {
      "id": "node-002",
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
  ],
  "connections": {
    "Telegram Trigger": {
      "main": [[{ "node": "Send Reply", "type": "main", "index": 0 }]]
    }
  }
}
```

---

## Issue Count Summary

| # | Severity | Description |
|---|----------|-------------|
| 1 | CRITICAL | Wrong node type prefix (`nodes-base.` instead of `n8n-nodes-base.`) on both nodes |
| 2 | ERROR | Wrong `typeVersion` on Telegram Trigger (`1.1` instead of `1.2`) |
| 3 | ERROR | Wrong credential key on Telegram Trigger (`telegramAPI` instead of `telegramApi`) |
| 4 | CRITICAL | `chatId` missing `__rl` resource locator format |
| 5 | MINOR | Both nodes missing `id` field |

**Total issues: 5** (2 critical, 2 errors, 1 minor)
