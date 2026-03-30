## n8n Workflow JSON Review: Telegram Echo Bot

The workflow has **4 issues** — 2 critical, 1 error, 1 warning.

---

### Issue 1: Wrong `type` prefix on both nodes (CRITICAL)

Both nodes use `nodes-base.*` instead of the required `n8n-nodes-base.*` format for workflow JSON.

- Wrong: `"type": "nodes-base.telegramTrigger"`
- Correct: `"type": "n8n-nodes-base.telegramTrigger"`

Same applies to `Send Reply`: `nodes-base.telegram` → `n8n-nodes-base.telegram`

---

### Issue 2: `chatId` missing `__rl` resource locator format (CRITICAL)

The `chatId` field in the Telegram node requires the `__rl` object format, not a plain string.

- Wrong: `"chatId": "={{ $json.message.chat.id }}"`
- Correct: `"chatId": { "__rl": true, "value": "={{ $json.message.chat.id }}", "mode": "expression" }`

---

### Issue 3: Credential key case mismatch in `Telegram Trigger` (ERROR)

The `Telegram Trigger` node uses `telegramAPI` (capital API) but the correct key is `telegramApi`.

---

### Issue 4: `typeVersion` outdated on `Telegram Trigger` (WARNING)

`Telegram Trigger` uses `typeVersion: 1.1` but the recommended version is `1.2`.

---

### What is correct

- The `connections` structure is valid (linear chain, `main[0]`)
- The `text` expression `={{ $json.message.text }}` is correct
- The `Send Reply` credential key is correct
