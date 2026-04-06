---
name: n8n-code-javascript
description: Write JavaScript code in n8n Code nodes. Use when writing JavaScript in n8n, using $input/$json/$node syntax, making HTTP requests with $helpers, working with dates using DateTime, troubleshooting Code node errors, or choosing between Code node modes. Trigger whenever the user is writing, debugging, or asking about code inside an n8n Code node — even if they don't say "Code node" explicitly (e.g. "my n8n script", "n8n JS code", "processing node").
---

# n8n Code Node — JavaScript

n8n Code nodes are a sandboxed JavaScript environment. Most JavaScript works normally, but there are n8n-specific variables, data structures, and constraints that differ from a standard Node.js environment. This skill covers exactly those differences — the things that trip people up.

---

## The One Rule That Catches Everyone

**Always return `[{json: {...}}]` — array of objects, each with a `json` key.**

```javascript
// ✅ Single result
return [{ json: { total: 42, count: 10 } }];

// ✅ Multiple results (one per output item)
return items.map(item => ({ json: { id: item.json.id, processed: true } }));

// ✅ No output
return [];

// ❌ Missing array wrapper — workflow fails silently
return { json: { total: 42 } };

// ❌ Missing json key — next node gets garbled data
return [{ total: 42 }];
```

---

## Data Access Variables

| Variable | What it gives you | Mode |
|----------|-------------------|------|
| `$input.all()` | Array of all input items `[{json:...}, ...]` | All Items |
| `$input.first()` | First input item `{json:...}` | All Items |
| `$input.item` | The current item being processed | **Each Item only** |
| `$json` | Shorthand for current item's `.json` | Both (careful — see below) |
| `$node["NodeName"].json` | Output of a specific named node | Both |

**`$json` gotcha:** In "Run Once for All Items" mode, `$json` refers to the first item's json. Use `$input.all()` to access multiple items.

---

## Webhook Data Is Nested Under `.body`

This is the #1 source of `undefined` errors in Webhook → Code workflows:

```javascript
// ❌ Returns undefined — the field is not at the top level
const email = $json.email;

// ✅ Webhook wraps all POST data under .body
const email = $json.body.email;

// Full webhook $json structure:
// {
//   body: { ...your POST payload... },
//   query: { ...URL params... },
//   headers: { ...request headers... },
//   params: { ...path params... }
// }
```

---

## Mode Selection

**Run Once for All Items** (default, recommended for 95% of cases)
- Code runs once; access everything via `$input.all()`
- Use for: aggregation, filtering, sorting, transformation, any cross-item logic

**Run Once for Each Item**
- Code runs separately for each input item; access current item via `$input.item`
- Use for: truly isolated per-item operations where you never need to compare items

```javascript
// All Items — aggregation example
const items = $input.all();
const total = items.reduce((sum, item) => sum + (item.json.amount || 0), 0);
return [{ json: { total, count: items.length, average: total / items.length } }];

// Each Item — per-item transform
const item = $input.item;
return [{ json: { ...item.json, slug: item.json.title.toLowerCase().replace(/ /g, '-') } }];
```

---

## HTTP Requests: Use `$helpers.httpRequest()`

`require('axios')`, `require('node-fetch')`, and `require('https')` are **not available** in the n8n sandbox.

```javascript
// ✅ The correct way
const response = await $helpers.httpRequest({
  method: 'GET',
  url: 'https://api.example.com/users',
  // Optional:
  headers: { 'Authorization': 'Bearer token' },
  qs: { page: 1, limit: 50 },      // query string params
  body: { name: 'value' },          // POST/PUT body
  json: true,                        // auto-parse JSON (default true)
  simple: false                      // don't throw on 4xx/5xx errors
});

return [{ json: { data: response } }];
```

Always `await` it — returns a Promise. Wrap in `try/catch` for error handling.

---

## DateTime (Luxon) — Not Standard JS Date

n8n injects Luxon as `DateTime`. Use it instead of `new Date()` when you need formatting or arithmetic.

```javascript
// Current time
const now = DateTime.now();
const iso = now.toISO();                          // "2024-01-15T10:30:00.000Z"
const formatted = now.toFormat('yyyy-MM-dd');      // "2024-01-15"

// Arithmetic
const tomorrow = now.plus({ days: 1 });
const lastWeek = now.minus({ weeks: 1 });

// Parse a date string
const parsed = DateTime.fromISO('2024-01-15T10:30:00Z');
const fromFormat = DateTime.fromFormat('15/01/2024', 'dd/MM/yyyy');

// Compare
const isAfter = now > parsed;
const diff = now.diff(parsed, 'days').days;
```

`new Date()` still works for basic cases, but Luxon is cleaner for formatting and arithmetic.

---

## Referencing Other Nodes

```javascript
// Get the output of a specific node by name
const webhookData = $node["Webhook"].json;
const httpResult = $node["HTTP Request"].json;

// Combine data from two nodes
const combined = {
  fromWebhook: $node["Webhook"].json.body,
  fromApi: $node["HTTP Request"].json.users
};
```

**Gotcha:** `$node["Name"]` gives you the first output item of that node. For all items from a named node, use `$input.all()` and position your Code node after the node you want.

---

## Available Globals & What's NOT Available

**Available:**
- `$helpers.httpRequest()` — HTTP requests
- `DateTime` — Luxon date library
- `$jmespath(data, expression)` — JMESPath queries on JSON
- `$getWorkflowStaticData('global')` — persistent key-value storage
- `Buffer`, `crypto` — Node.js built-ins
- `Math`, `JSON`, `console`, `Date` — standard globals

**NOT available (n8n sandbox restrictions):**
- `require()` — no npm packages
- `fetch` / `axios` / `node-fetch` — use `$helpers.httpRequest` instead
- `fs`, `path`, `os` — no filesystem access
- `process.env` — no environment variable access

---

## Quick Fixes for Common Errors

| Symptom | Cause | Fix |
|---------|-------|-----|
| Next node gets no data | Missing return or wrong format | `return [{json: {...}}]` |
| `undefined` from `$json.field` | Webhook data is under `.body` | Use `$json.body.field` |
| `{{ $json.x }}` outputs literal string | Using expression syntax in Code node | Use `$json.x` directly (no `{{ }}`) |
| `require is not defined` | No require in sandbox | Use `$helpers.httpRequest` for HTTP |
| `$input.item` is undefined | Used in "All Items" mode | Switch to "Each Item" or use `$input.first()` |
| Reduce returns `NaN` | Missing field on some items | Add `|| 0` fallback: `item.json.amount || 0` |
