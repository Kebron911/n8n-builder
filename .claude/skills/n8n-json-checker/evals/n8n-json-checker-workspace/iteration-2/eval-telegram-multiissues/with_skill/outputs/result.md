## n8n Workflow Check

> Workflow: **Telegram Echo Bot**
> Analysis: Static only (MCP validation skipped)

---

### Errors (must fix before activating)

1. **Telegram Trigger** — Wrong `type` prefix — `nodes-base.telegramTrigger` is missing the `n8n-` prefix. Change to `n8n-nodes-base.telegramTrigger`.

2. **Send Reply** — Wrong `type` prefix — `nodes-base.telegram` is missing the `n8n-` prefix. Change to `n8n-nodes-base.telegram`.

3. **Send Reply** — `chatId` must use `__rl` object format, not a plain string. Replace:
   ```json
   "chatId": "={{ $json.message.chat.id }}"
   ```
   with:
   ```json
   "chatId": { "__rl": true, "value": "={{ $json.message.chat.id }}", "mode": "expression" }
   ```

---

### Warnings (review, may be acceptable)

1. **Telegram Trigger** — `typeVersion` is `1.1`, expected `1.2` — Upgrade to stay on the current recommended version.

2. **Telegram Trigger** — Credential key is `telegramAPI` (capital "API") — The correct key is `telegramApi` (camelCase). This mismatch may prevent the credential from resolving at runtime.

3. **Both nodes** — Credential IDs in this workflow are instance-specific. If you import this workflow to a different n8n instance, you'll need to re-link all credentials in the UI — the IDs won't transfer.

---

### Clean ✓

- Expression syntax — no unbalanced braces or broken `$node[]` references
- Required fields — `chatId` and `text` both present on Send Reply (though chatId format needs fixing)
- Send Reply typeVersion — `1.2` is correct
- Send Reply credential key — `telegramApi` is correct
- Connection structure — linear chain wired correctly

---

Want me to apply these fixes directly to the workflow JSON?
