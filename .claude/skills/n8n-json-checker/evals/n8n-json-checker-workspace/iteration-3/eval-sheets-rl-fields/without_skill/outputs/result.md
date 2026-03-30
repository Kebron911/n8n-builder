# Eval: eval-sheets-rl-fields — Without Skill (Baseline)

## Verdict: NO — This workflow will NOT work as written.

---

## Issues Found

### Issue 1 (CRITICAL): `documentId` missing `__rl` format

**Current:**
```json
"documentId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
```

**Required:**
```json
"documentId": { "__rl": true, "value": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms", "mode": "id" }
```

The `documentId` field on `n8n-nodes-base.googleSheets` is a Resource Locator field and **must** use the `__rl` object format. A plain string will cause a validation warning and runtime failure — the node will not be able to resolve the spreadsheet.

---

### Issue 2 (CRITICAL): `sheetName` missing `__rl` format

**Current:**
```json
"sheetName": "Sheet1"
```

**Required:**
```json
"sheetName": { "__rl": true, "value": "gid=0", "mode": "list", "cachedResultName": "Sheet1" }
```

The `sheetName` field is also a Resource Locator field. It must use `__rl` format. The `mode` should be `"list"` with `value` set to the sheet's gid (e.g., `"gid=0"` for the first sheet) and `cachedResultName` set to the display name.

---

### Issue 3 (POSSIBLE): `operation: "appendOrUpdate"` may not be valid

**Current:**
```json
"operation": "appendOrUpdate"
```

The standard operations for `n8n-nodes-base.googleSheets` at `typeVersion: 4.5` are:
- `append`
- `read`
- `update`
- `clear`
- `delete`

`appendOrUpdate` (upsert) may not exist as a named operation in this node version. For logging incoming webhook data as new rows, the correct operation is `append`. Verify this operation exists before using it; otherwise switch to `append`.

---

### No Issue: Webhook `responseMode`

`"responseMode": "onReceived"` is valid — the webhook will respond immediately with a default acknowledgment. This is fine for a fire-and-forget logger pattern.

---

## Corrected Google Sheets Node

```json
{
  "name": "Google Sheets",
  "type": "n8n-nodes-base.googleSheets",
  "typeVersion": 4.5,
  "position": [500, 300],
  "parameters": {
    "resource": "sheet",
    "operation": "append",
    "documentId": { "__rl": true, "value": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms", "mode": "id" },
    "sheetName": { "__rl": true, "value": "gid=0", "mode": "list", "cachedResultName": "Sheet1" },
    "columns": {
      "mappingMode": "autoMapInputData",
      "value": {},
      "matchingColumns": [],
      "schema": []
    },
    "options": {}
  },
  "credentials": {
    "googleSheetsOAuth2Api": { "id": "3", "name": "Google Sheets" }
  }
}
```

---

## Summary

| # | Field | Severity | Problem |
|---|-------|----------|---------|
| 1 | `documentId` | Critical | Plain string — must use `__rl` object format |
| 2 | `sheetName` | Critical | Plain string — must use `__rl` object format |
| 3 | `operation` | Possible | `appendOrUpdate` may not be a valid operation; use `append` for logging |
