---
name: n8n-code-python
description: Write Python code in n8n Code nodes. Use when writing Python in n8n, using _input/_json/_node syntax, working with standard library, or need to understand Python limitations in n8n Code nodes.
---

# Python Code Node (Beta)

Expert guidance for writing Python code in n8n Code nodes.

---

## JavaScript First

**Default to JavaScript for 95% of use cases.** Use Python only when:
- You need specific Python standard library functions (especially `statistics`)
- You're significantly more comfortable with Python syntax
- No HTTP requests needed inside the Code node

**Why JavaScript is preferred:**
- `$helpers.httpRequest()` — Python has no equivalent (no `requests`)
- Luxon DateTime library for advanced date/time
- Full n8n helper coverage
- Stable (Python is Beta — higher risk for production)

---

## Quick Start

```python
# Basic template for Python Code nodes
items = _input.all()

processed = []
for item in items:
    processed.append({
        "json": {
            **item["json"],
            "processed": True
        }
    })

return processed
```

### Essential Rules

1. **Access data**: `_input.all()`, `_input.first()`, or `_input.item`
2. **CRITICAL**: Must return `[{"json": {...}}]` format — a list of dicts with a `"json"` key
3. **CRITICAL**: Webhook data is under `_json["body"]` (not `_json` directly)
4. **CRITICAL LIMITATION**: No external libraries — only Python standard library
5. **No `$` prefix** — Python uses `_input`, `_json`, `_node` (not `$input`, `$json`)

---

## Python Modes: Beta vs Native

### Python (Beta) — Recommended
Use `_input`, `_json`, `_node` helper syntax. Built-ins: `_now`, `_today`, `_jmespath()`.

```python
items = _input.all()
now = _now  # Built-in datetime object

return [{"json": {"count": len(items), "timestamp": now.isoformat()}}]
```

### Python (Native) (Beta)
Use `_items` / `_item` variables only. No `_input`, no `_now`.

```python
processed = []
for item in _items:
    processed.append({"json": {"id": item["json"].get("id"), "processed": True}})
return processed
```

Use **Python (Beta)** for better n8n integration.

---

## Data Access

### `_input.all()` — most common
```python
all_items = _input.all()
# item["json"] accesses the data dict for each item
```

### `_input.first()` — single object / API response
```python
data = _input.first()["json"]
```

### `_input.item` — Each Item mode only
```python
current = _input.item  # only in "Run Once for Each Item" mode
```

### `_node` — reference other nodes
```python
webhook_data = _node["Webhook"]["json"]
```

### Mode selection
- **Run Once for All Items** (default) — code runs once, use `_input.all()`
- **Run Once for Each Item** — code runs per item, use `_input.item`

---

## Critical: Webhook Data Structure

**Most common mistake** — webhook POST body is nested under `["body"]`:

```python
# WRONG — KeyError at runtime
user_id = _json["user_id"]

# CORRECT — webhook data is under ["body"]
user_id = _json["body"]["user_id"]

# SAFER — use .get() for safe access
body = _json.get("body", {})
user_id = body.get("user_id")
action = body.get("action")

return [{"json": {"user_id": user_id, "action": action}}]
```

Why: the Webhook node wraps all POST data — body, query params, headers — into separate keys. Your payload fields land in `body`.

Full structure:
```json
{
  "json": {
    "headers": {...},
    "query": {},
    "body": { "user_id": "abc", "action": "login" }
  }
}
```

---

## Return Format

**Always return a list of dicts with a `"json"` key:**

```python
# Single result
return [{"json": {"field": value}}]

# Multiple results
return [{"json": {"id": item["json"]["id"]}} for item in _input.all()]

# Empty
return []
```

**Wrong formats that cause runtime failure:**
```python
return {"json": {"field": value}}   # missing list wrapper
return [{"field": value}]           # missing "json" key
return "processed"                  # plain string
```

---

## No External Libraries

Only Python standard library is available. These all raise `ModuleNotFoundError`:

```python
import requests   # NOT available
import pandas     # NOT available
import numpy      # NOT available
import boto3      # NOT available
```

**Available standard library modules:**
`json`, `datetime`, `re`, `base64`, `hashlib`, `urllib.parse`, `math`, `random`, `statistics`

**Need HTTP requests?** Use an HTTP Request node before the Code node, or switch to JavaScript (`$helpers.httpRequest()`).

**Need pandas-style stats?** Use the `statistics` module:

```python
from statistics import mean, median, stdev

items = _input.all()
values = [item["json"].get("amount", 0) for item in items]

return [{
    "json": {
        "mean": mean(values),
        "median": median(values),
        "stdev": stdev(values) if len(values) > 1 else 0,
        "min": min(values),
        "max": max(values),
        "count": len(values)
    }
}]
```

---

## Top Errors

### #1: External library import
```python
import requests  # ModuleNotFoundError
# Fix: use HTTP Request node, or switch to JavaScript
```

### #2: Wrong return format
```python
return {"json": {"result": "ok"}}   # missing list wrapper
# Fix:
return [{"json": {"result": "ok"}}]
```

### #3: Webhook body not nested
```python
email = _json["email"]              # KeyError
# Fix:
email = _json.get("body", {}).get("email")
```

---

## Additional Resources

- [DATA_ACCESS.md](DATA_ACCESS.md) — comprehensive data access patterns
- [COMMON_PATTERNS.md](COMMON_PATTERNS.md) — Python patterns for n8n
- [ERROR_PATTERNS.md](ERROR_PATTERNS.md) — error guide
- [STANDARD_LIBRARY.md](STANDARD_LIBRARY.md) — standard library reference

---

## Additional Notes

### Common Use Cases

**Use Case 1: Process Webhook Data**
```python
webhook = _input.first()["json"]
body = webhook.get("body", {})

return [{
    "json": {
        "name": body.get("name"),
        "email": body.get("email"),
        "processed": True
    }
}]
```

**Use Case 2: Filter and Transform**
```python
all_items = _input.all()

active = [
    {"json": {**item["json"], "filtered": True}}
    for item in all_items
    if item["json"].get("status") == "active"
]

return active
```

**Use Case 3: Aggregate Statistics**
```python
import statistics

all_items = _input.all()
amounts = [item["json"].get("amount", 0) for item in all_items]

return [{
    "json": {
        "total": sum(amounts),
        "average": statistics.mean(amounts) if amounts else 0,
        "count": len(amounts)
    }
}]
```

**Use Case 4: Parse JSON String**
```python
import json

data = _input.first()["json"]["body"]
json_string = data.get("payload", "{}")

try:
    parsed = json.loads(json_string)
    return [{"json": parsed}]
except json.JSONDecodeError:
    return [{"json": {"error": "Invalid JSON"}}]
```

### Limitations and Workarounds

**No HTTP Requests Library**
- Problem: No `requests` library
- Workaround: Use HTTP Request node or switch to JavaScript

**No Data Analysis Library**
- Problem: No `pandas` or `numpy`
- Workaround: Use list comprehensions and standard library (especially `statistics` module)

**No Database Drivers**
- Problem: No `psycopg2`, `pymongo`, etc.
- Workaround: Use n8n database nodes (Postgres, MySQL, MongoDB)

**No Web Scraping**
- Problem: No `beautifulsoup4` or `selenium`
- Workaround: Use HTML Extract node

### Best Practices

1. **Use JavaScript for most cases** (95% recommendation)
2. **Use .get() for dictionaries** (avoid KeyError)
3. **Check lengths before indexing** (avoid IndexError)
4. **Always return proper format**: `[{"json": {...}}]`
5. **Access webhook data via ["body"]**
6. **Use standard library only** (no external imports)
7. **Handle empty input** (check `if items:`)
8. **Test both modes** (All Items and Each Item)

### When Python is the Right Choice

**Use Python when:**
- Complex text processing (re module)
- Mathematical calculations (math, statistics)
- Date/time manipulation (datetime)
- Cryptographic operations (hashlib)
- You have existing Python logic to reuse
- Team is more comfortable with Python

**Use JavaScript instead when:**
- Making HTTP requests
- Working with dates (Luxon included)
- Most data transformations
- When in doubt
