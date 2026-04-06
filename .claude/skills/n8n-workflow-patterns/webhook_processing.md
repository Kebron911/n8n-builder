# Webhook Processing — n8n-Specific Details

---

## Data Structure (n8n-specific)

n8n wraps all webhook data — the payload is never at `$json` root:

```json
{
  "headers": { "content-type": "application/json", "x-signature": "sha256=abc" },
  "params": { "id": "123" },
  "query": { "token": "abc" },
  "body": { "email": "user@example.com", "items": [{ "id": 1 }] }
}
```

```javascript
{{$json.body.email}}              // POST body field
{{$json.body.items[0].id}}        // nested body
{{$json.headers['x-signature']}}  // header (lowercase, bracket notation)
{{$json.query.token}}             // ?token=abc
{{$json.params.id}}               // /webhook/path/:id
```

---

## Response Modes (n8n-specific)

Two modes with different behavior:

### `responseMode: "onReceived"` (default)
- n8n responds 200 immediately
- Workflow continues running in background
- Webhook Response node is **ignored** — do not add it
- Use for: Slack events, GitHub webhooks, payment webhooks (all fire-and-forget)

### `responseMode: "lastNode"`
- n8n waits for workflow to complete
- Last node in the chain sends the response via Webhook Response node
- **Webhook Response node is required** — without it, n8n returns empty 200

Webhook node config for `lastNode`:
```json
{
  "type": "n8n-nodes-base.webhook",
  "typeVersion": 2,
  "parameters": {
    "httpMethod": "POST",
    "path": "my-endpoint",
    "responseMode": "lastNode"
  }
}
```

Webhook Response node (always place at the end of the chain):
```json
{
  "type": "n8n-nodes-base.respondToWebhook",
  "typeVersion": 1.1,
  "parameters": {
    "respondWith": "json",
    "responseBody": "={{ { \"status\": \"ok\", \"id\": $json.record_id } }}",
    "options": {
      "responseCode": 200
    }
  }
}
```

`respondWith` options: `"json"`, `"text"`, `"noData"`, `"redirect"`.

For error responses (from IF false branch):
```json
{
  "parameters": {
    "respondWith": "json",
    "responseBody": "={{ { \"status\": \"error\", \"message\": \"Missing required field\" } }}",
    "options": { "responseCode": 400 }
  }
}
```

---

## Signature Verification (n8n Code node pattern)

For Stripe/GitHub-style webhooks that sign the payload:

```javascript
// Code node — verify before processing
const crypto = require('crypto');
const signature = $input.first().json.headers['x-hub-signature-256'];
const secret = 'your-webhook-secret';  // store in n8n credentials, not hardcoded
const body = JSON.stringify($input.first().json.body);

const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');

if (signature !== expected) {
  throw new Error('Invalid webhook signature');
}

return $input.all();
```

Note: `throw new Error()` in a Code node stops execution for that item. With `onError: "continueErrorOutput"`, it routes to the error branch instead of stopping the workflow.

---

## Common Wiring Patterns

### Fire-and-forget (onReceived)
```
Webhook (onReceived) → Process → Action
```
No Webhook Response node.

### Synchronous response (lastNode)
```
Webhook (lastNode) → Validate (IF) → Process → Webhook Response (200)
                                   └→ Webhook Response (400, error branch)
```

### Validation gate
```json
"IF": {
  "main": [
    [{ "node": "Process", "type": "main", "index": 0 }],
    [{ "node": "Error Response", "type": "main", "index": 0 }]
  ]
}
```

IF condition checking for required field:
```json
{
  "conditions": {
    "conditions": [{
      "leftValue": "={{ $json.body.email }}",
      "rightValue": "",
      "operator": { "type": "string", "operation": "notEmpty" }
    }],
    "combinator": "and"
  }
}
```
