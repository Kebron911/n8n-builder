## n8n Workflow Check

### Errors (must fix before activating)

1. **Telegram Trigger, Send Reply** — Wrong `type` prefix: both nodes use `nodes-base.` instead of `n8n-nodes-base.` — Change `"nodes-base.telegramTrigger"` → `"n8n-nodes-base.telegramTrigger"` and `"nodes-base.telegram"` → `"n8n-nodes-base.telegram"`.

2. **Send Reply** — `chatId` must use `__rl` object format, not a plain string — Change:
   ```json
   "chatId": "={{ $json.message.chat.id }}"
   ```
   to:
   ```json
   "chatId": { "__rl": true, "value": "={{ $json.message.chat.id }}", "mode": "expression" }
   ```

### Warnings (review, may be acceptable)

1. **Telegram Trigger** — `typeVersion` is `1.1`, expected `1.2` — Update to `1.2` to get the latest features and fixes.

2. **Telegram Trigger** — Credential key `"telegramAPI"` is incorrectly capitalized — should be `"telegramApi"` (lowercase `pi`). This may prevent credential resolution at runtime.

### Clean ✓
- Required fields — all present
- Expression syntax — no unbalanced braces or broken references
- Connection structure — linear chain wired correctly
- Webhook checks — not applicable
- Community nodes — none present
- Error handling — not applicable (workflow has fewer than 5 nodes)

---

> **MCP validation note:** The `n8n_validate_workflow` tool was not available in this environment. The above findings are from static analysis only. Runtime validation could not be performed.

---

Want me to apply these fixes directly to the workflow?
