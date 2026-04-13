---
name: n8n-runtime-diagnostics
description: >
  Diagnose and fix n8n workflows that fail at runtime — execution errors,
  wrong output, null data, timeout, or unexpected behavior. Covers: reading
  execution logs, tracing data flow between nodes, identifying common runtime
  failures (auth expired, rate limits, empty input, expression evaluation
  errors), and systematic debugging strategies. Use when a workflow passes
  validation but fails or misbehaves during execution. Trigger on: "workflow
  fails at runtime", "execution error", "node returns null", "wrong output",
  "workflow timeout", "why did my workflow fail", "data not flowing",
  "expression error at runtime", "HTTP 429", "rate limit", "empty response",
  "workflow runs but nothing happens", even if the user doesn't say
  "runtime" explicitly — any post-deployment execution issue.
---

# n8n Runtime Diagnostics

Diagnose and fix n8n workflows that fail at runtime — execution errors, wrong output, null data, timeout, or unexpected behavior.

## Diagnostic Decision Tree

Start here for any runtime failure:

1. **Is there an error in the execution log?** → Go to Section 2: Reading Execution Logs
2. **Does the workflow run but produce wrong/empty output?** → Go to Section 3: Common Runtime Error Patterns
3. **Does the workflow hang or timeout?** → Go to Section 4: Timeout and Hang Debugging
4. **Is it intermittent (works sometimes, fails sometimes)?** → Go to Section 5: Intermittent Failures

---

## Section 1: Reading Execution Logs

The n8n UI and API expose detailed execution data. Use these tools to diagnose failures:

### Via n8n API

Fetch execution data for a workflow:
```
GET {instance_url}/api/v1/executions?workflowId={id}&status=error
```

Key response fields:
- `executionData.resultData.runData[nodeName]` — array of all executions of that node
- `runData[nodeName][0].data.main[0]` — input data that caused the failure
- `runData[nodeName][0].error` — error object with `message`, `description`, `stack`

Example error object:
```json
{
  "message": "401 Unauthorized",
  "description": "Credential is invalid or expired",
  "stack": "Error: 401 Unauthorized at HTTP Request node"
}
```

### Via n8n Editor

1. Open the workflow in the editor
2. Click **Executions** tab (right sidebar)
3. Click on a failed execution to open the execution viewer
4. Inspect each node: click a node name to see its input and output data
5. Look for the first node with an error (red X) — that's where the failure occurred
6. Check the node's **error** tab for the full error message and stack trace

### What to Look For

1. **Error in which node?** — Most failures are in a specific action node (HTTP Request, Gmail, Telegram, etc.), not the trigger
2. **What was the input?** — Check `runData[failedNodeName][0].data.main[0]` to see what data triggered the failure
3. **Error message** — Is it auth-related? Network-related? Data validation?
4. **Timing** — Check `executedTime` and `executionTime` fields — did the node take longer than expected?

---

## Section 2: Common Runtime Error Patterns

Reference table of typical runtime errors and fixes:

| Error Pattern | Cause | Fix |
|---|---|---|
| `401 Unauthorized` | Credential expired, revoked, or invalid | Reconfigure credential in n8n UI, test credential before using in workflow |
| `403 Forbidden` | Insufficient permissions on the credential | Check API key scopes, service account permissions |
| `429 Too Many Requests` | Rate limit hit on target API | Add Wait node between API calls, use Split In Batches with delay |
| `ECONNREFUSED` | Target API server is down or unreachable | Check API status page, test URL in browser, add retry logic or fallback |
| `ENOTFOUND` | DNS resolution failed (hostname not found) | Verify URL spelling, check if domain is still active, use IP address if available |
| `socket hang up` | Connection dropped mid-request | Add retry logic, check for large payloads, increase timeout |
| `Cannot read property 'X' of undefined` | Upstream node returned empty/null, code tries to access missing field | Add IF node before using data, check `$json` field names, verify upstream output |
| `Expression evaluation error` | Expression references missing field or has syntax error | Check `$json` field names match actual upstream output (case-sensitive!), fix syntax in expression |
| `Unexpected token < in JSON` | API returned HTML (error page) instead of JSON | Verify API endpoint URL, check authentication, confirm response format |
| `Code node error: return format wrong` | Code node returns plain object instead of array format | Change `return { result: value }` to `return [{ json: { result: value } }]` |
| `Execution timeout` | Workflow took longer than configured timeout | Increase `settings.executionTimeout` in workflow settings, optimize slow nodes, add parallel processing |
| `Memory allocation exceeded` | Workflow processes too much data at once | Reduce batch size, use Split In Batches with smaller chunks, filter data upstream |
| `No data in output` | Upstream node returned `[]` (empty array) | Check upstream node for filters that may eliminate all records, add IF node to handle empty case |

---

## Section 3: Data Flow Debugging

When output is wrong but there's no error, use these steps:

### Step 1: Trace Backwards from Output Node

1. Open the execution viewer
2. Click the final output node (e.g., Google Sheets, Slack, database)
3. Check what data it **received** from the upstream node
4. If the input is wrong, trace back one more node
5. Repeat until you find where the data went wrong

### Step 2: Check Expressions

Expressions use `$json` to reference fields. Common issues:

- **Case sensitivity**: `{{ $json.email }}` won't match `{{ $json.Email }}` — JavaScript is case-sensitive
- **Missing field**: If upstream returns `{ name: "Alice", id: 1 }`, then `{{ $json.userName }}` will be undefined
- **Nested access**: Use dot notation: `{{ $json.address.city }}` for nested objects
- **Array access**: Use bracket notation: `{{ $json.items[0].value }}` for array elements

**Debug**: In the n8n editor, hover over an expression field and click the **Expression** button to open the expression editor. You can see a preview of what the expression evaluates to.

### Step 3: Check Node Execution Order

- If your workflow has multiple parallel branches, merge nodes combine them
- Merge nodes (especially Merge by Key) require **both inputs to be present**
- If one branch finishes before the other starts, data won't merge — add explicit waits if needed
- Check `runData` for which nodes executed and in what order

### Step 4: Check for Empty Arrays

If an upstream node returns `[]` (empty array):
- Nodes that process items may silently skip (no error, no output)
- The downstream node still executes but receives no input
- Check node settings for filters: e.g., HTTP Request with "Split Into Items" but no items

**Fix**: Add an IF node to check if input is empty before processing:
```
{{ $json.length > 0 }}
```

### Step 5: Use Code Node as Probe

Insert a Code node anywhere in the workflow to inspect data:

```javascript
return [{ json: { debug: JSON.stringify($input.all(), null, 2) } }]
```

This outputs the raw data structure so you can see exactly what fields exist and their values.

---

## Section 4: Timeout and Hang Debugging

A workflow "hangs" when it never finishes executing.

### Check Execution Timeout

1. Open the workflow in the editor
2. Click **Settings** (top-right, gear icon)
3. Look for `executionTimeout` — this is in seconds
4. If not set, the workflow has no timeout and can run forever
5. Default n8n behavior: no timeout (runs until all nodes complete)

### Common Hang Causes

1. **Infinite loop in Split In Batches**: Split In Batches with 0 delay creates immediate next iteration — if the batch never shrinks, it loops forever
2. **HTTP Request to unresponsive server**: No timeout set on the HTTP node, server is slow to respond
3. **Wait node with no timeout**: `{{ 1 / 0 }}` evaluates to Infinity, Wait node never fires
4. **Recursive workflow trigger**: Workflow calls itself via webhook/API, creates infinite recursion
5. **Database lock**: Workflow waits for a lock that never releases

### Debug a Hang

1. Check the execution viewer — which node is listed as the last one that executed?
2. The **next** node after that is where it hung
3. Check that node's configuration:
   - Does it have a timeout?
   - Is it waiting for input that never comes?
   - Is there a circular dependency?
4. Add a Wait node with explicit timeout before the suspect node to see if it helps

---

## Section 5: Intermittent Failures

Workflows that work sometimes but fail other times are often due to timing, external state, or data-dependent issues.

### Rate Limiting (Most Common)

If 429 errors appear after N requests:
- You're hitting the target API's rate limit
- **Fix**: Add explicit delays between calls
  - Insert Wait node (e.g., 500ms) between API calls
  - Use Split In Batches with `Batch Size = 1` and add a Wait node in the loop
  - Or check if the API offers a batch endpoint to reduce call count

### Token Expiration

OAuth tokens have expiration times (usually hours to days):
- n8n should auto-refresh but check credential settings
- If you see `401 Unauthorized` appear after workflow has been running for days/weeks, the token likely expired
- **Fix**: Reconfigure the credential in n8n UI to re-authorize, or enable auto-refresh if available

### Data-Dependent Failures

Some input records cause errors while others don't:
- Examine the specific input that caused the failure
- Look for edge cases: special characters, very long strings, null values, unexpected data types
- Add validation: IF node to filter or clean data before processing

### Webhook Race Conditions

If your workflow processes webhooks:
- Multiple webhooks may arrive at the same time, creating multiple concurrent executions
- This can cause duplicate processing or missed data
- **Fix**: Add a Wait node to serialize processing, or add idempotency logic (e.g., check if record was already processed)

---

## Section 6: Tools for Debugging

### n8n Editor

- **Executions tab**: View all past executions (success, error, running)
- **Click a failed execution**: See per-node input and output data
- **Click a node in execution viewer**: See that node's error message and stack trace
- **Test node**: Click the blue play button on a node to test just that node with sample data
- **Debug output**: Some nodes have a "Debug" mode that logs extra information

### API Calls

Fetch workflow executions programmatically:
```bash
curl -X GET "https://instance.com/api/v1/executions?workflowId=<id>&status=error" \
  -H "X-N8N-API-KEY: <key>"
```

### Code Node Probe

Insert a Code node to inspect data at any point:
```javascript
console.log($input.all());
return [{ json: { data: $input.all() } }]
```

### Common n8n CLI Commands

(If you have CLI access):
```bash
n8n workflows:execute <id>
n8n workflows:get <id>
```

---

## Decision Quick Reference

**401 Unauthorized** → Reconfigure credential  
**429 Too Many Requests** → Add Wait node with delay  
**No output but no error** → Check expressions for field name mismatches, trace data flow  
**Node returns null** → Check upstream node output, add IF node to validate  
**Workflow hangs** → Check execution timeout, identify which node is last to execute  
**Works sometimes, fails sometimes** → Check for rate limits, token expiration, data-dependent edge cases  
**LangChain tools not available** → Verify tools connected via `ai_tool`, not `main`  
**Code node error** → Check return format is `[{ json: {...} }]` array, not plain object
