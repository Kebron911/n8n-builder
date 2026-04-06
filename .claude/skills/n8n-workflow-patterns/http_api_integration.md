# HTTP API Integration — n8n-Specific Details

---

## HTTP Request Node Config (n8n-specific fields)

The n8n HTTP Request node has non-obvious parameter names:

```json
{
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "parameters": {
    "method": "GET",
    "url": "https://api.example.com/users",
    "authentication": "predefinedCredentialType",
    "nodeCredentialType": "httpHeaderAuth",
    "sendQuery": true,
    "queryParameters": {
      "parameters": [
        { "name": "page", "value": "={{ $json.page }}" },
        { "name": "limit", "value": "100" }
      ]
    },
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        { "name": "Accept", "value": "application/json" }
      ]
    }
  }
}
```

Key n8n-specific behavior:
- `sendQuery: true` must be set or `queryParameters` is ignored
- `sendHeaders: true` must be set or `headerParameters` is ignored
- `sendBody: true` must be set for POST/PUT body to be sent
- `authentication: "predefinedCredentialType"` uses n8n credential store; `"none"` for no auth

### Body for POST requests
```json
{
  "method": "POST",
  "sendBody": true,
  "contentType": "json",
  "bodyParameters": {
    "parameters": [
      { "name": "email", "value": "={{ $json.email }}" },
      { "name": "name", "value": "={{ $json.name }}" }
    ]
  }
}
```

`contentType` options: `"json"`, `"form-urlencoded"`, `"multipart-form-data"`, `"raw"`.

For raw JSON body:
```json
{
  "sendBody": true,
  "contentType": "raw",
  "rawContentType": "application/json",
  "body": "={{ JSON.stringify($json) }}"
}
```

---

## Error Handling (n8n-specific)

### Per-node error routing
Add `"onError": "continueErrorOutput"` to route HTTP failures to a second output instead of stopping:

```json
{
  "type": "n8n-nodes-base.httpRequest",
  "parameters": { ... },
  "onError": "continueErrorOutput"
}
```

Wire: `main[0]` = success, `main[1]` = HTTP error.

### `continueOnFail` (per-node)
Older pattern — lets the node pass items through even if it errors, with error info in `$json.error`:

```json
{ "continueOnFail": true }
```

Use `onError: "continueErrorOutput"` instead when you need to route errors to a different branch.

---

## Pagination in n8n (non-obvious wiring)

n8n has no built-in pagination loop for HTTP Request. The pattern uses Split In Batches or a manual page-counter loop.

### Page counter loop with Code node
```
Manual Trigger → Set (page=1) → HTTP Request → Code (check has_more) → IF (has_more)
                                     ↑                                      |
                                     └──────── Set (page++) ←───────────────┘
                                                                    └→ [No more: next step]
```

Code node to check pagination:
```javascript
const response = $input.first().json;
const hasMore = response.data.length === 100;  // full page = more exists
const currentPage = $node['Set Page'].json.page;

return [{
  json: {
    items: response.data,
    has_more: hasMore,
    next_page: currentPage + 1
  }
}];
```

### n8n built-in pagination (typeVersion 4.2+)
The HTTP Request node has a built-in pagination feature for cursor/offset APIs:

```json
{
  "parameters": {
    "url": "https://api.example.com/items",
    "options": {
      "pagination": {
        "paginationMode": "updateAParameterInEachRequest",
        "nextURL": "={{ $response.body.next_cursor }}",
        "limitPagesFetched": true,
        "maxRequests": 10
      }
    }
  }
}
```

`paginationMode` options:
- `"updateAParameterInEachRequest"` — increment a query param
- `"responseContainsNextURL"` — follow next URL from response
- `"off"` — no pagination (default)

---

## Rate Limiting in n8n

The Wait node provides delays between iterations in loops:

```json
{
  "type": "n8n-nodes-base.wait",
  "typeVersion": 1.1,
  "parameters": {
    "resume": "timeInterval",
    "amount": 1,
    "unit": "seconds"
  }
}
```

Wire it inside the loop: `HTTP Request → Wait → next iteration`.

---

## Response Data Structure

HTTP Request node output puts response data at `$json` directly (not nested):

```javascript
// Response body fields are directly at $json:
{{$json.users}}
{{$json.data[0].id}}
{{$json.pagination.next_cursor}}

// Status code and headers available via:
{{$response.statusCode}}
{{$response.headers['x-rate-limit-remaining']}}
```
