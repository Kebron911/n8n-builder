---
name: n8n-expression-syntax
description: Validate n8n expression syntax and fix common errors. Use when writing n8n expressions, using {{}} syntax, accessing $json/$node variables, troubleshooting expression errors, or working with webhook data in workflows.
---

# n8n Expression Syntax

Expert guide for writing correct n8n expressions in workflows.

---

## Expression Format

All dynamic content in n8n uses **double curly braces**:

```
{{expression}}
```

**Examples**:
```
{{$json.email}}
{{$json.body.name}}
{{$node["HTTP Request"].json.data}}
```

Wrong:
```
$json.email          — no braces, treated as literal text
{$json.email}        — single braces, invalid
{{{$json.field}}}    — triple-wrapped, invalid
```

---

## Core Variables

### $json — current node output
```javascript
{{$json.fieldName}}
{{$json['field with spaces']}}
{{$json.nested.property}}
{{$json.items[0].name}}
```

### $node — reference other nodes
```javascript
{{$node["Node Name"].json.fieldName}}
{{$node["HTTP Request"].json.data}}
{{$node["Webhook"].json.body.email}}
```

Node names must be in **quotes**, are **case-sensitive**, and must match exactly.

### $now — current timestamp (Luxon DateTime)
```javascript
{{$now}}
{{$now.toFormat('yyyy-MM-dd')}}
{{$now.toFormat('HH:mm:ss')}}
{{$now.plus({days: 7}).toFormat('yyyy-MM-dd')}}
{{$now.minus({hours: 24}).toISO()}}
{{DateTime.fromISO('2025-12-25').toFormat('MMMM dd, yyyy')}}
```

`$now` is Luxon — use `.toFormat()`, `.plus()`, `.minus()`, `.set()`, `.toISO()`. Do NOT use `new Date()` or `.toISOString()` in expression fields.

### $env — environment variables
```javascript
{{$env.API_KEY}}
```

---

## Critical: Webhook Data Structure

**Most common mistake** — webhook POST body is nested under `.body`, not at root:

```javascript
// WRONG
{{$json.name}}
{{$json.email}}

// CORRECT
{{$json.body.name}}
{{$json.body.email}}
```

Why: the Webhook node wraps all request data under `body` to preserve headers, params, and query params alongside the body.

Full structure:
```json
{
  "headers": {...},
  "params": {},
  "query": {},
  "body": { "name": "John", "email": "john@example.com" }
}
```

---

## Common Patterns

### Nested fields and arrays
```javascript
{{$json.user.email}}
{{$json.data[0].name}}
{{$json['field name']}}          // spaces in field name
{{$json['user data']['first name']}}
```

### Cross-node references
```javascript
{{$node["Set"].json.value}}
{{$node["HTTP Request"].json.data}}
{{$node["Webhook"].json.body.email}}
```

### Inline in text and URLs
```
Hello {{$json.body.name}}!
https://api.example.com/users/{{$json.body.user_id}}
```

### In object property values (note the `=` prefix)
```json
{
  "name": "={{$json.body.name}}",
  "email": "={{$json.body.email}}"
}
```

### Conditional and defaults
```javascript
{{$json.status === 'active' ? 'Active User' : 'Inactive User'}}
{{$json.email || 'no-email@example.com'}}
```

---

## When NOT to Use Expressions

### Code nodes — use direct JavaScript instead
```javascript
// WRONG in Code node
const email = '={{$json.email}}';

// CORRECT in Code node
const email = $json.email;
const email = $input.first().json.email;
const data = $node['HTTP Request'].json.data;
```

### Webhook paths — static only
```javascript
// WRONG
path: "{{$json.user_id}}/webhook"

// CORRECT
path: "user-webhook"
```

### Credential fields — use n8n credential system, not expressions

---

## Validation Rules

1. **Always use `{{}}`** — without braces, value is treated as literal text
2. **Bracket notation for spaces** — `{{$json['field name']}}`, `{{$node["HTTP Request"]}}`
3. **Case-sensitive node names** — `"HTTP Request"` not `"http request"`
4. **No nested braces** — `{{$json.field}}` not `{{{$json.field}}}`

---

## Quick Fix Table

| Mistake | Fix |
|---------|-----|
| `$json.field` | `{{$json.field}}` |
| `{{$json.field name}}` | `{{$json['field name']}}` |
| `{{$node.HTTP Request}}` | `{{$node["HTTP Request"]}}` |
| `{{{$json.field}}}` | `{{$json.field}}` |
| `{{$json.name}}` (from webhook) | `{{$json.body.name}}` |
| `'={{$json.email}}'` in Code node | `$json.email` |

---

## Working Examples

### Webhook → Slack
```
Name: {{$json.body.name}}
Email: {{$json.body.email}}
```

### HTTP Request → Email (cross-node)
```
Product: {{$node["HTTP Request"].json.data.items[0].name}}
Price: ${{$node["HTTP Request"].json.data.items[0].price}}
```

### Date formatting for Google Sheets
```javascript
{{$now.toFormat('yyyy-MM-dd')}}        // 2026-04-06
{{$now.toFormat('HH:mm:ss')}}          // 14:30:45
{{$now.plus({days: 7}).toFormat('yyyy-MM-dd')}}
```

---

## Debugging

1. Click the field → open expression editor ("fx" icon)
2. Live preview shows the resolved value
3. Red highlight = syntax error

**Expression shows as literal text** → missing `{{ }}`
**"undefined"** → wrong data path; check structure with a Set node to inspect `$json`

---

## Additional Resources

- [COMMON_MISTAKES.md](COMMON_MISTAKES.md) — complete error catalog
- [EXAMPLES.md](EXAMPLES.md) — real workflow examples
