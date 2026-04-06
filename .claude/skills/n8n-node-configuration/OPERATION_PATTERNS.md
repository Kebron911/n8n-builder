# Operation Patterns — n8n-Specific Gotchas

Non-obvious field requirements and gotchas by node type. Common node configs are in CLAUDE.md.

---

## HTTP Request

**sendBody dependency chain:**
- `sendBody: true` must be set before `body` is accepted
- `body.contentType` determines `body.content` structure:
  - `"json"` → content is an object: `{ "key": "value" }`
  - `"form-data"` → content is an array: `[{ "name": "field1", "value": "val" }]`

**Authentication config:**
```json
{
  "authentication": "predefinedCredentialType",
  "nodeCredentialType": "httpHeaderAuth"
}
```

---

## Webhook

Incoming data is at `$json.body`, not `$json`:
```
❌  $json.email
✅  $json.body.email
```

`responseMode` options:
- `"onReceived"` — respond immediately with default response
- `"lastNode"` — respond with output of last node
- `"responseNode"` — use a Respond to Webhook node (required when `responseMode: "responseNode"` is set on the trigger)

---

## Slack

Operation field matrix — fields differ significantly per operation:

| Field | `message/post` | `message/update` | `message/delete` | `channel/create` |
|-------|---------------|-----------------|-----------------|-----------------|
| `channel` (__rl) | Required | Optional | Required | — |
| `text` | Required | Required | — | — |
| `messageId` | — | Required | Required | — |
| `name` | — | — | — | Required |
| `isPrivate` | — | — | — | Optional |

Slack channel name format: lowercase, no spaces, 1–80 chars (for `channel/create`).

---

## IF Node

Condition structure gotchas (typeVersion 2.2):

1. `id` field required on every condition object: `"id": "condition_0"`
2. `combinator` is at the **wrapper** level — not inside individual condition objects
3. `operator` is an object: `{ "type": "string", "operation": "equals" }` — not a flat string

**Unary operator table:**

| Operator | rightValue | singleValue (auto-added) |
|----------|-----------|--------------------------|
| `equals`, `notEquals`, `contains`, `startsWith`, `endsWith` | Required | — |
| `isEmpty`, `isNotEmpty` | Omit | `true` |
| `true`, `false` (boolean) | Omit | `true` |

---

## Google Sheets

`operation: "update"` requires `matchingColumns` set to the key column name:
```json
{
  "operation": "update",
  "columns": {
    "matchingColumns": ["id"],
    "mappingMode": "autoMapInputData"
  }
}
```

`operation: "read"` requires `filtersUI`:
```json
{
  "operation": "read",
  "filtersUI": { "values": [] }
}
```

---

## Schedule Trigger

`timezone` in the rule object uses IANA timezone strings (`"America/New_York"`, not `"EST"`).

Cron mode:
```json
{
  "rule": {
    "interval": [{ "field": "cronExpression" }],
    "expression": "0 9 * * 1-5"
  }
}
```
