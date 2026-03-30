## n8n Workflow Check

**Workflow:** Sheets Logger
**Nodes:** Webhook, Google Sheets

---

### Errors (must fix before activating)

1. **Google Sheets** — `documentId` is a plain string but must use the `__rl` object format — change to:
   ```json
   "documentId": { "__rl": true, "value": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms", "mode": "id" }
   ```

2. **Google Sheets** — `sheetName` is a plain string `"Sheet1"` but must use the `__rl` object format — change to:
   ```json
   "sheetName": { "__rl": true, "value": "Sheet1", "mode": "list", "cachedResultName": "Sheet1" }
   ```
   (Or use `"mode": "id"` with the actual sheet GID, e.g. `"gid=0"` for the first sheet.)

---

### Warnings (review, may be acceptable)

1. **Workflow** — Credential IDs are instance-specific. If this workflow is imported to a different n8n instance, you will need to re-link the Google Sheets credential in the UI — the ID `"3"` will not transfer.

---

### Clean ✓

- nodeType format — no issues found
- typeVersion — Webhook `2` and Google Sheets `4.5` both match expected versions
- Credential key name — `googleSheetsOAuth2Api` is correct
- Expression syntax — no expressions present
- Connection structure — linear chain is correctly wired
- Webhook response mode — `"onReceived"` does not require a respondToWebhook node
- Community nodes — none present
- Error handling — fewer than 5 nodes, no error trigger required

---

**Summary:** The workflow will fail at runtime due to 2 resource locator (`__rl`) errors on the Google Sheets node. Both `documentId` and `sheetName` must be wrapped in `__rl` objects — plain strings are not accepted by this node type.

Want me to apply these fixes directly to the workflow?
