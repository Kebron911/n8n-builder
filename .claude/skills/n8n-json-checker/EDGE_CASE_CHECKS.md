# n8n JSON Checker — Edge Case Checks (2.9–2.16)

Load this file when the workflow contains: `splitInBatches`, `webhook` with responseNode, community nodes, `httpRequest`, `executeWorkflow`, `formTrigger`, hardcoded secrets, or 5+ nodes with no error handler.

---

### 2.9 SplitInBatches Loop Wiring

If a `splitInBatches` node exists, `main[0]` (batch output) must eventually loop back to the same `splitInBatches` node. **Warning** if `main[0]` leads only to terminal nodes — the batch will only run once.

---

### 2.10 Webhook Checks

**Respond pairing:** Webhook with `"responseMode": "responseNode"` must have a `respondToWebhook` node downstream. **Warning** if none.

**Duplicate paths:** Multiple webhook nodes with the same `path` + `httpMethod` → **Error**: only one will register.

**Timeout risk:** If `responseMode: "responseNode"` and the workflow has AI agent nodes, HTTP Request nodes, or 5+ sequential nodes → **Warning**: "Long-running webhook workflows risk timeout. Consider async pattern: webhook fires job, second webhook polls result."

---

### 2.11 Community Node Warning

For community nodes (identified in 2.1): **Warning** — must be installed on the n8n instance and may introduce breaking changes. Recommend pinning the package version.

---

### 2.12 HTTP Request Node Checks

- **Error** if `authentication` is not `"none"` but no `credentials` block exists — auth will silently fail.
- **Warning** if `url` contains a hardcoded API key as a query parameter — use credentials instead.
- **Warning** if `url` is a plain domain with no path (e.g., `https://api.example.com`) — likely incomplete.

---

### 2.13 executeWorkflow Node Checks

- **Error** if `workflowId` is a plain string — must use `__rl` format: `{ "__rl": true, "value": "WORKFLOW_ID", "mode": "id" }`
- **Warning** if `waitForSubWorkflow` is `false`/absent and the caller uses the sub-workflow's output downstream — fire-and-forget returns no data.

---

### 2.14 formTrigger Node Checks

- **Error** if `formTitle` is absent or empty — the form won't render.
- **Error** if `formFields` is absent or empty — the form has no fields.
- **Warning** if `responseMode` is `"responseNode"` but no `respondToWebhook` node exists downstream.
- **Warning** if `formFields` entries are missing `fieldLabel`.

---

### 2.15 Hardcoded Secrets

Scan parameter values for secrets hardcoded in plain text — **Warning ONLY, never Error** for each:

- Any parameter named `apiKey`, `api_key`, `token`, `secret`, `password`, `Authorization` with a non-expression string value longer than 10 chars.
- Strings matching `Bearer [long-value]` in header parameters (not in credential fields).

> "Possible hardcoded secret in [node].[field]. Move to n8n credential or use an expression."

**Severity rule:** A hardcoded secret is a security concern but does NOT prevent activation — it belongs in Warnings, not Errors. Never list it under "Errors (must fix before activating)".

---

### 2.16 Error Handling Coverage

For workflows with 5+ nodes that have **no** `errorTrigger` node AND `settings.errorWorkflow` is absent:

> **Warning:** No error handling configured. For production workflows, set `settings.errorWorkflow: "vQKuXqX6mzCEGmaE"` to use the standing error handler.
