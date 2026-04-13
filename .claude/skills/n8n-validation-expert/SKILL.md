---
name: n8n-validation-expert
description: >
  Interpret MCP validator errors and guide fixing them DURING active workflow
  building or fixing. Use when n8n_validate_workflow returns errors and you
  need to understand what they mean and how to fix them — covering error types
  (missing_required, invalid_value, type_mismatch, invalid_expression,
  invalid_reference), validation profiles (runtime vs strict vs ai-friendly),
  auto-sanitization behavior, and n8n-specific recovery tools.
  Use AFTER n8n-json-checker (pre-flight) — this skill handles errors that
  come back from the live MCP validator, not static JSON review.
---

# n8n Validation Expert

## When to Use This Skill vs n8n-json-checker

| Situation | Use |
|-----------|-----|
| MCP validator returned errors after `n8n_create_workflow` | **This skill** |
| MCP validator returned errors after `n8n_update_partial_workflow` | **This skill** |
| User pastes raw workflow JSON for pre-flight review | **n8n-json-checker** |

---

## Validation Profiles

Use `"runtime"` by default. The other profiles exist for specific situations.

| Profile | When to use | What it validates |
|---------|-------------|-------------------|
| `runtime` | Pre-deployment — **default** | Required fields, value types, allowed values, basic dependencies |
| `minimal` | Quick mid-edit checks | Required fields and basic structure only |
| `ai-friendly` | AI-generated configs with noisy false positives | Same as runtime but more tolerant of minor issues |
| `strict` | Final review of production/critical workflows | Everything including best practices, performance, security |

Always call: `n8n_validate_workflow({ workflowId: "ID", profile: "runtime" })`

---

## n8n Error Types

The MCP validator uses these specific error type names:

| Type | Meaning | n8n-specific fix |
|------|---------|-----------------|
| `missing_required` | Required field absent | Run `get_node("nodes-base.<type>", detail: "standard")` to see required fields |
| `invalid_value` | Value not in allowed options | Error message lists allowed values; check `get_node` output for `options` |
| `type_mismatch` | Wrong data type | n8n expects number literals for numeric fields — `100` not `"100"` |
| `invalid_expression` | Expression syntax error | Must use `={{ }}` wrapper — bare `$json.field` is invalid |
| `invalid_reference` | Referenced node name doesn't exist | Check exact node name spelling in `connections` object |

**Errors must be fixed.** Warnings are informational — skip unless they indicate a real misconfiguration.

---

## Auto-Sanitization

Auto-sanitization runs automatically on every `n8n_create_workflow` and `n8n_update_partial_workflow`. Do not manually patch what it fixes.

### What it fixes automatically

**Binary operators** (equals, notEquals, contains, notContains, greaterThan, lessThan, startsWith, endsWith, etc.)
→ Removes `singleValue` property (binary operators compare two values, `singleValue` is invalid)

**Unary operators** (isEmpty, isNotEmpty, true, false)
→ Adds `singleValue: true` (unary operators check a single value, this property is required)

**IF v2.2+ and Switch v3.2+ condition metadata**
→ Adds missing `conditions.options` object (`{ caseSensitive: true, leftValue: "" }`)

### What it CANNOT fix

| Problem | Fix |
|---------|-----|
| Connections referencing non-existent nodes | Use `cleanStaleConnections` operation |
| Switch rule count mismatches output count | Add missing connections or remove extra rules |
| Corrupt workflow state rejected by API | May require manual intervention in n8n UI |

---

## n8n Recovery Tools

### Clean stale connections
Use when validation reports "node not found" connection errors:

```json
{
  "type": "cleanStaleConnections"
}
```
Pass as an operation in `n8n_update_partial_workflow`.

### Auto-fix operator structures
Use when there are operator/condition structure errors that auto-sanitization didn't catch:

```javascript
// Preview fixes first
n8n_autofix_workflow({ id: "workflow-id", applyFixes: false })

// Apply after reviewing
n8n_autofix_workflow({ id: "workflow-id", applyFixes: true })
```

---

## Validation Result Structure

```json
{
  "valid": false,
  "errors": [
    {
      "type": "missing_required",
      "property": "channel",
      "message": "Channel name is required",
      "fix": "Provide a channel name"
    }
  ],
  "warnings": [...],
  "suggestions": [...]
}
```

Fix everything in `errors`. Review `warnings` only if they indicate a real misconfiguration — most are best-practice hints that don't affect execution.

---

## Related Skills

- **n8n MCP Tools Expert** — correct tool names and parameter formats
- **n8n Expression Syntax** — fix `invalid_expression` errors
- **n8n Node Configuration** — find required fields for `missing_required` errors

---

## Additional Notes

### Understanding Validation as an Iterative Process

Validation is not a one-shot affair — it's iterative:

**Key Metrics from Real Workflows:**
- 79% of validation runs lead to feedback loops (errors requiring fixes)
- Average 2-3 iterations to achieve valid configuration
- 7,841 validate → fix cycles observed in practice
- Average timing: 23 seconds thinking + 58 seconds fixing per cycle

### Error Severity Levels

**Errors (must fix)** - Block execution
- missing_required
- invalid_value
- type_mismatch
- invalid_expression
- invalid_reference

**Warnings (should fix)** - Don't block but indicate issues
- Performance concerns
- Best practice violations
- Configuration inefficiencies
- 40% of warnings are acceptable in context

**Suggestions (optional)** - Nice-to-have improvements
- Code optimization hints
- Documentation suggestions
- Refactoring recommendations

### The Validation Loop Pattern

```
Configure → Validate → Read errors → Fix → Validate again
```

**Average per iteration:**
1. Configure node(s): 30 seconds
2. Validate: 5 seconds
3. Read error message: 10 seconds
4. Identify fix: 8 seconds
5. Apply fix: 15 seconds
6. Subtotal per iteration: ~68 seconds

**Total for typical 5-node workflow:** 2-3 iterations = 2-3 minutes

### False Positives and ai-friendly Profile

**When to use ai-friendly profile:**
- AI-generated configurations (often contain minor non-critical issues)
- Reduces false positives by 60%
- Still validates all critical errors
- Useful when testing untested configurations

**Acceptable warnings (don't require fixing):**
- Missing optional fields (nice-to-have)
- Performance suggestions on small workflows
- Documentation recommendations
- Style/consistency hints

### Recovery Strategies

When stuck in validation loop (3+ iterations):

1. **Check node connections** — Use `cleanStaleConnections` operation
2. **Validate simpler version first** — Remove optional features temporarily
3. **Use minimal profile** — Narrow down to just required fields
4. **Preview autofix** — Use `n8n_autofix_workflow` with `applyFixes: false` first
5. **Escalate to strict profile** — Find edge cases missed by runtime profile
