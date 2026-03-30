## n8n Workflow Check

### Errors (must fix before activating)

1. **Telegram Trigger, Send Reply** — Wrong `type` prefix: both nodes use `nodes-base.` instead of `n8n-nodes-base.` — Change `"nodes-base.telegramTrigger"` to `"n8n-nodes-base.telegramTrigger"` and `"nodes-base.telegram"` to `"n8n-nodes-base.telegram"`.

2. **Send Reply** — `chatId` is a plain string instead of a resource locator object — Change:
   ```json
   "chatId": "={{ $json.message.chat.id }}"
   ```
   to:
   ```json
   "chatId": { "__rl": true, "value": "={{ $json.message.chat.id }}", "mode": "expression" }
   ```

3. **Telegram Trigger** — Wrong credential key `"telegramAPI"` (capital API) — should be `"telegramApi"` (lowercase `a`). The node expects `telegramApi`; the wrong key means no credential will be resolved at runtime.

### Warnings (review, may be acceptable)

1. **Telegram Trigger** — `typeVersion` is `1.1`, expected `1.2` — Update to `1.2` to get the latest fixes and features.

### Clean ✓
- Expression syntax — no unbalanced braces or invalid node references
- Connection structure — linear chain is correctly wired
- Required fields — `text` is present on the Send Reply node
- No community nodes

---

Want me to apply these fixes directly to the workflow?
