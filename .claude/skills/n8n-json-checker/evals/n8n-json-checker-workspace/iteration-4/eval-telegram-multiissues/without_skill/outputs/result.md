# n8n Workflow JSON Check — Telegram Echo Bot

## Issues Found: 4

---

### Issue 1: Wrong `type` prefix — Telegram Trigger node
**Severity:** Error (will cause silent failure or node not found)

- **Found:** `"type": "nodes-base.telegramTrigger"`
- **Expected:** `"type": "n8n-nodes-base.telegramTrigger"`

In workflow JSON (used with `n8n_create_workflow` / `n8n_update_partial_workflow`), all core node types must use the `n8n-nodes-base.` prefix. The `nodes-base.` prefix (without `n8n-`) is only valid when calling `search_nodes`, `get_node`, or `validate_node`.

---

### Issue 2: Wrong `type` prefix — Send Reply node
**Severity:** Error (will cause silent failure or node not found)

- **Found:** `"type": "nodes-base.telegram"`
- **Expected:** `"type": "n8n-nodes-base.telegram"`

Same issue as above — the `n8n-` prefix is missing.

---

### Issue 3: Wrong `typeVersion` for Telegram Trigger
**Severity:** Warning/Bug (misses fixes and features in newer version)

- **Found:** `"typeVersion": 1.1`
- **Expected:** `"typeVersion": 1.2`

The current recommended version for `n8n-nodes-base.telegramTrigger` is `1.2`. Using `1.1` may work but misses fixes and features available in the latest version.

---

### Issue 4: Wrong credential key for Telegram Trigger
**Severity:** Error (credential will not resolve)

- **Found:** `"telegramAPI": { "id": "1", "name": "Telegram account" }`
- **Expected:** `"telegramApi": { "id": "1", "name": "Telegram account" }`

The credential type key is case-sensitive. `telegramAPI` (uppercase "API") does not match the required key `telegramApi` (camelCase). The Send Reply node has this correct; the Telegram Trigger node does not.

---

### Issue 5: `chatId` missing `__rl` resource locator format
**Severity:** Error (validation warning / runtime failure)

- **Found:** `"chatId": "={{ $json.message.chat.id }}"`
- **Expected:**
```json
"chatId": { "__rl": true, "value": "={{ $json.message.chat.id }}", "mode": "expression" }
```

The `chatId` field in `n8n-nodes-base.telegram` is a resource locator field and requires the `__rl` object format. Passing a plain string expression bypasses the resource locator mechanism and will cause a validation warning or runtime failure.

---

## Corrected Workflow JSON

```json
{
  "name": "Telegram Echo Bot",
  "nodes": [
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
    },
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
  ],
  "connections": {
    "Telegram Trigger": {
      "main": [[{ "node": "Send Reply", "type": "main", "index": 0 }]]
    }
  }
}
```

---

## Summary

| # | Location | Issue | Severity |
|---|----------|-------|----------|
| 1 | Telegram Trigger — `type` | Missing `n8n-` prefix (`nodes-base.` → `n8n-nodes-base.`) | Error |
| 2 | Send Reply — `type` | Missing `n8n-` prefix (`nodes-base.` → `n8n-nodes-base.`) | Error |
| 3 | Telegram Trigger — `typeVersion` | Should be `1.2`, not `1.1` | Warning |
| 4 | Telegram Trigger — `credentials` key | `telegramAPI` → `telegramApi` (case mismatch) | Error |
| 5 | Send Reply — `chatId` | Plain string instead of `__rl` resource locator object | Error |
