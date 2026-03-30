## n8n Workflow Check

### Errors (must fix before activating)

1. **Google Sheets** — `documentId` is a plain string `"1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"` — must use `__rl` object format. Change to:
   ```json
   "documentId": { "__rl": true, "value": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms", "mode": "id" }
   ```

2. **Google Sheets** — `sheetName` is a plain string `"Sheet1"` — must use `__rl` object format. Change to:
   ```json
   "sheetName": { "__rl": true, "value": "gid=0", "mode": "list", "cachedResultName": "Sheet1" }
   ```

### Clean ✓
- nodeType format — no issues found
- typeVersion — no issues found
- credential keys — `googleSheetsOAuth2Api` is correct
- expression syntax — no issues found
- connection structure — Webhook → Google Sheets wiring is correct
- webhook responseMode — `"onReceived"` does not require a respondToWebhook node

---

**Note:** MCP runtime validation was not available in this environment. The two errors above are blocking — the `documentId` and `sheetName` fields on `n8n-nodes-base.googleSheets` require the `__rl` resource locator format. Passing a plain string causes a validation error and the node will not function correctly at runtime.

Want me to apply these fixes directly to the workflow?
