# Property Dependencies — n8n-Specific Behaviors

Details on how n8n's displayOptions mechanism affects configuration, and what auto-sanitization handles automatically.

---

## Auto-Sanitization

n8n automatically fixes these on save — don't manually set them:

### IF/Switch Unary Operators

When `operation` is `isEmpty`, `isNotEmpty`, `true`, or `false`:
- `singleValue: true` is added automatically
- `rightValue` / `value2` should be omitted

When `operation` is binary (`equals`, `contains`, etc.):
- `singleValue` should not be present
- `rightValue` / `value2` is required

### Condition IDs

n8n requires each condition object to have an `id` field. If missing, it's added on first save, but best to include it upfront: `"id": "condition_0"`.

---

## Hidden Field Chains

Fields that are invisible until a parent field is set — validation will error with "missing required field" even though the field isn't visible in standard detail:

### HTTP Request

```
sendBody: true
  └─ body (required)
       └─ body.contentType = "json"
            └─ body.content (object format)
       └─ body.contentType = "form-data"
            └─ body.content (array format)

sendQuery: true
  └─ queryParameters (required)

sendHeaders: true
  └─ headerParameters (required)
```

**How to find hidden fields:**
```
get_node(nodeType, mode: "search_properties", propertyQuery: "body")
→ Returns property with displayOptions showing it requires sendBody: true
```

### Google Sheets

```
operation: "read"
  └─ filtersUI required (even if empty: { "values": [] })

operation: "update"
  └─ matchingColumns required (which column is the key)
```

---

## When Changing Operations

Switching `operation` changes which fields are required and which are hidden. The most common trap:

1. Config works for `post` operation
2. Operation changed to `update`
3. Validation fails — different fields required, old fields possibly ignored

**Always re-validate after changing `resource` or `operation`.**

---

## Troubleshooting: "Field Required But Not Visible"

If validation reports a missing field that you can't find in `get_node` standard detail:

```
get_node(nodeType, mode: "search_properties", propertyQuery: "<missing field name>")
```

The result shows what controls that field's visibility (its `displayOptions`). Set the parent field first, then the hidden field becomes required and available.
