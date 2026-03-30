## n8n Workflow Check

### Errors (must fix before activating)

1. **Google Sheets** — `documentId` is a plain string (`"1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"`) but requires the `__rl` object format — change to:
   ```json
   "documentId": { "__rl": true, "value": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms", "mode": "id" }
   ```

2. **Google Sheets** — `sheetName` is a plain string (`"Sheet1"`) but requires the `__rl` object format — change to:
   ```json
   "sheetName": { "__rl": true, "value": "gid=0", "mode": "list", "cachedResultName": "Sheet1" }
   ```

### Clean ✓

- nodeType format — no issues found
- typeVersions — `webhook` v2, `googleSheets` v4.5 both correct
- Credential key — `googleSheetsOAuth2Api` is correct
- Expression syntax — no expressions used
- Connection structure — linear chain wired correctly
- Webhook responseMode — `onReceived` (no respondToWebhook node required)

---

**Note:** MCP runtime validation was unavailable in this session; results are based on static analysis only.

---

Want me to apply these fixes directly to the workflow?
