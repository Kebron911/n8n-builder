---
name: n8n-node-configuration
description: Operation-aware node configuration guidance. Use when configuring nodes, understanding property dependencies, determining required fields, or choosing between get_node detail levels.
---

# n8n Node Configuration

n8n-specific configuration behaviors that require MCP discovery or aren't obvious from the node type alone.

---

## get_node Detail Levels

Quick rule: start with `standard`, use `search_properties` for specific fields, `full` only for debugging.

**nodeType format for get_node/validate_node:** `nodes-base.slack` (not `n8n-nodes-base.slack`)

For the full `get_node` parameter reference (detail levels, modes, token counts, `includeExamples`, `includeTypeInfo` flags) → see the **n8n-mcp-tools-expert** skill.

---

## Property Dependencies: Fields That Enable Other Fields

n8n hides/shows fields based on other field values. These are the non-obvious chains:

### HTTP Request
```
sendBody: true  →  body field becomes visible + required
body.contentType: "json"  →  content expects { key: value } object
body.contentType: "form-data"  →  content expects [{ name, value }] array
sendQuery: true  →  queryParameters becomes visible
```
`sendBody: true` is required before the `body` field is accepted — omitting it causes a missing field error even if you include `body`.

### IF Node Conditions Structure

The exact structure for typeVersion 2.2+:

```json
{
  "conditions": {
    "options": { "caseSensitive": true, "leftValue": "" },
    "conditions": [
      {
        "id": "condition_0",
        "leftValue": "={{ $json.status }}",
        "rightValue": "active",
        "operator": { "type": "string", "operation": "equals" }
      }
    ],
    "combinator": "and"
  }
}
```

- `id` is required on each condition object (use `"condition_0"`, `"condition_1"`, etc.)
- `combinator` goes at the wrapper level — not inside individual condition objects
- Output index 0 = true branch, index 1 = false branch

### Unary vs Binary Operators (Auto-Sanitization)

| Operator | Needs `rightValue`? | `singleValue` |
|----------|---------------------|---------------|
| `equals`, `notEquals`, `contains`, `startsWith` | Yes | — |
| `isEmpty`, `isNotEmpty` | No | `true` (auto-added by n8n on save) |

Do not manually set `singleValue: true` — n8n auto-sanitizes this.

---

## Operation-Specific Field Differences

Fields required differ by `resource` + `operation` pair — not just by node type.

### Slack (typeVersion 2.3)

| Field | `post` | `update` | `delete` |
|-------|--------|----------|----------|
| `channel` | Required (`__rl`) | Optional | Required (`__rl`) |
| `text` | Required | Required | — |
| `messageId` | — | Required | Required |

Switching from `post` to `update` requires adding `messageId` — `channel` is no longer required.

### Webhook

Incoming request data lands at **`$json.body`**, not `$json`:

```
// ❌  $json.email
// ✅  $json.body.email
```

---

## Discovery Workflow

When a required field is unclear after `get_node` standard:

```
validate_node(nodeType, config, profile: "runtime")
  → error names the missing field
    → get_node(nodeType, mode: "search_properties", propertyQuery: "<field>")
      → find what parent field controls visibility
        → add parent field, then child field
          → validate again (max 3 attempts total)
```

After configuring all nodes, run `n8n_validate_workflow({ workflowId: "ID", profile: "runtime" })` to confirm zero errors before activating.

---

## What CLAUDE.md Already Covers

Don't look these up — they're already available:
- Ready-to-use node configs (Telegram, Slack, Gmail, Sheets, AI Agent, IF, Switch, etc.)
- `typeVersion` for all common nodes
- `__rl` resource locator format
- Credential type keys per node
- Validation → fix loop process
- nodeType format rules (`nodes-base.*` for tools, `n8n-nodes-base.*` for workflow JSON)
- Expression conventions (`$json`, `$node`, `$now`)

---

## Additional Notes

### Configuration Context

Node configuration in n8n involves understanding how operation-aware patterns work. The configuration process is fundamentally iterative:

**Key Metrics from Real Workflows:**
- Average workflow build uses 2-3 validation cycles
- `get_node_essentials` has 91.7% success rate for configuration
- Discovery to essentials averages 18 seconds
- 56 seconds average between configuration edits
- Most configurations only need essentials, not full schema

### Progressive Discovery Pattern

1. **Identify** → Determine resource + operation
2. **Discover** → Use `get_node_essentials` (91.7% success)
3. **Configure** → Add required fields
4. **Validate** → Run `validate_node` with "runtime" profile
5. **Iterate** → Read errors for dependency hints
   - Escalate to `get_property_dependencies` if needed
   - Use `get_node_info` only when necessary
   - Max 3 validation attempts total

### Configuration Philosophy

**Operation-Aware Configuration**
- Resource + operation determine required fields
- Different operations = different requirements
- Always check requirements when changing operation

**Property Dependencies**
- Fields appear/disappear based on other field values
- displayOptions control visibility
- Conditional required fields
- Understanding dependency chains is critical

### Common Node Patterns (4 Categories)

1. **Resource/Operation Nodes** (Slack, Sheets, Airtable, etc.)
   - Select resource, then operation
   - Operation determines required fields
   - Each operation has different dependencies

2. **HTTP-Based Nodes** (HTTP Request, Webhook)
   - sendBody: true enables body field
   - contentType determines body format
   - sendQuery: true enables query parameters

3. **Database Nodes** (Postgres, MySQL, MongoDB)
   - Query/operation determines parameters
   - Connection settings separate from operation
   - Often need parameterized queries

4. **Conditional Logic Nodes** (IF, Switch)
   - Requires exact structure for conditions
   - ID required on each condition
   - Combinator at wrapper level

### Configuration Workflow (8 Steps)

1. Identify node type and operation
2. Use `get_node_essentials` for discovery
3. Map required fields
4. Add conditional fields based on dependencies
5. Validate configuration
6. Fix errors (read error messages for hints)
7. Test with sample data
8. Iterate if validation reveals new requirements
