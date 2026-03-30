## n8n Workflow Check

> Workflow: **Telegram Echo Bot**
> Analysis: Static only (MCP validation skipped per task instructions)

---

### Errors (must fix before activating)

1. **Telegram Trigger** — Wrong `type` prefix — `nodes-base.telegramTrigger` is missing the `n8n-` prefix. Change to `n8n-nodes-base.telegramTrigger`.

2. **Send Reply** — Wrong `type` prefix — `nodes-base.telegram` is missing the `n8n-` prefix. Change to `n8n-nodes-base.telegram`.

3. **Send Reply** — `chatId` must use `__rl` object format, not a plain string — Replace `"chatId": "={{ $json.message.chat.id }}"` with:
   ```json
   "chatId": { "__rl": true, "value": "={{ $json.message.chat.id }}", "mode": "expression" }
   ```

---

### Warnings (review, may be acceptable)

1. **Telegram Trigger** — `typeVersion` is `1.1`, expected `1.2` — Upgrade to `1.2` to match the current recommended version.

2. **Telegram Trigger** — Credential key is `telegramAPI` (capital "API") — The correct key is `telegramApi` (camelCase). This mismatch may prevent the credential from being resolved at runtime.

---

### Clean ✓

- Expression syntax — no unbalanced braces or broken `$node[]` references found
- Required fields — `chatId` and `text` both present on Send Reply node
- Send Reply typeVersion — `1.2` matches expected
- Send Reply credential key — `telegramApi` is correct
- Connection structure — linear chain wired correctly
