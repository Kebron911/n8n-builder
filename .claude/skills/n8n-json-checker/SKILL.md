---
name: n8n-json-checker
description: >
  Pre-flight validation of n8n workflow JSON BEFORE it reaches the instance.
  Use this skill when the user pastes or shares raw workflow JSON for review,
  says "check this n8n json", "validate this workflow", "any issues with this
  workflow", "review n8n workflow", "n8n json issues", or shares a workflow
  JSON file path. Also trigger when the user asks "does this workflow look
  right?" or "will this work?" and there is workflow JSON in context.
  USE THIS FIRST — static analysis catches structural errors (wrong node types,
  missing __rl fields, bad wiring) faster than running the MCP validator.
  After reporting issues, ask if the user wants to apply fixes.
  Do NOT use for errors on workflows already live on the instance — use
  n8n-validation-expert to interpret those MCP errors instead.
---

# n8n JSON Checker

Validate n8n workflow JSON through two passes: static analysis (fast, no tools
needed) then MCP runtime validation. Combine both into a single clear report.

---

## Step 1: Get the JSON

- If workflow JSON is pasted in the user's message, use it directly.
- If a file path is given, read that file.
- If neither, ask: "Please paste the workflow JSON or provide a file path."

---

## Step 2: Static Analysis

Read through the JSON and check each category below. Record every finding
before moving to the next step — you'll need them for the final report.

### 2.1 nodeType Format

Every node has a `type` field. Three valid formats exist:

| Node category | Type format | Example |
|---------------|-------------|---------|
| Built-in | `n8n-nodes-base.<name>` | `n8n-nodes-base.telegram` |
| LangChain | `@n8n/n8n-nodes-langchain.<name>` | `@n8n/n8n-nodes-langchain.agent` |
| Community | `<npm-package-name>.<NodeName>` | `n8n-nodes-evolution-api.EvolutionApi` |

**Error if you see:** `nodes-base.telegram` — missing the `n8n-` prefix.

**Grouping rule:** If multiple nodes share the same prefix error, report them as a single finding listing all affected nodes (e.g., "Nodes 'Telegram Trigger', 'Send Reply' — wrong prefix `nodes-base.` should be `n8n-nodes-base.`"). One error entry, multiple nodes named.

**Do NOT validate node names:** Only check that the prefix is correct. Do not flag `@n8n/n8n-nodes-langchain.lmChatOpenAi`, `@n8n/n8n-nodes-langchain.lmOpenAi`, or any other node name as invalid based on whether you recognize the specific suffix. The name after the dot is outside the scope of this check — many valid node variants exist and your knowledge of specific node names may be incomplete or outdated.

**Community node identification:** If a `type` field doesn't start with
`n8n-nodes-base.` or `@n8n/n8n-nodes-langchain.`, it's a community node
(installed from npm). Flag these with a **warning** noting:
- The node must be installed on the n8n instance before the workflow runs
- If running Docker, the `~/.n8n/nodes` directory must be persisted or
  `N8N_REINSTALL_MISSING_PACKAGES=true` must be set, or the node won't load
  after container recreation
- Community node developers can introduce breaking changes between versions —
  note the `typeVersion` for reference

### 2.2 Resource Locator Fields (`__rl`)

These fields **must** use the `__rl` object format, not a plain string.

Three valid modes:
```json
{ "__rl": true, "value": "STATIC_ID", "mode": "id" }
{ "__rl": true, "value": "={{ $json.id }}", "mode": "expression" }
{ "__rl": true, "value": "gid=0", "mode": "list", "cachedResultName": "Sheet1", "cachedResultUrl": "..." }
```

The `"list"` mode is common in Google nodes — it stores a cached display name and URL alongside the value. All three modes are valid; do not flag `"list"` mode as an error.

| Node | Fields that need `__rl` |
|------|------------------------|
| `n8n-nodes-base.telegram` | `chatId` |
| `n8n-nodes-base.slack` | `channel`, `user` |
| `n8n-nodes-base.gmail` | `sendTo`, `messageId`, `labelIds` |
| `n8n-nodes-base.googleSheets` | `documentId`, `sheetName` |
| `n8n-nodes-base.googleDrive` | `driveId`, `folderId`, `fileId` |
| `n8n-nodes-base.notion` | `pageId`, `databaseId` |
| `n8n-nodes-base.airtable` | `baseId`, `tableId` |

**Error if:** the field is a plain string like `"chatId": "12345"` instead of an `__rl` object.

### 2.3 Required Fields Per Node

Check that nodes have their essential fields:

| Node type | Required fields |
|-----------|----------------|
| `n8n-nodes-base.telegram` | `chatId`, `text` (for sendMessage) |
| `n8n-nodes-base.httpRequest` | `url` |
| `n8n-nodes-base.code` | `jsCode` (JS mode) or `pythonCode` (Python mode) |
| `n8n-nodes-base.set` | `fields.values` array |
| `n8n-nodes-base.if` | `conditions.conditions` array (non-empty) |
| `n8n-nodes-base.switch` | `rules.values` array (non-empty) |

### 2.3a Code Node Content Checks

For any `n8n-nodes-base.code` node, scan the `jsCode` value for these issues:

**Errors:**
- **ES6 imports** — `import ` or `export ` keywords are not supported in the Code node sandbox. Use `require()` instead. Flag as error.
- **Credentials access** — `this.getCredentials(` silently fails in Code nodes. Use the HTTP Request node with credentials instead. Flag as error.
- **Unavailable variables** — `$itemIndex`, `$secrets`, `$version` are not available in the Code node context (only in expressions). Flag as error if found in `jsCode`.

**Warnings:**
- **Return format** — The Code node must return an array of `{ json: {...} }` objects. If the code contains a `return` statement that returns a plain object (e.g., `return { result: value }`) rather than an array, flag as warning — it will cause a runtime error.
- **`json` value is array** — `return [{ json: [1, 2, 3] }]` is wrong. The `json` key must be an object, not an array. Correct: `return [{ json: { items: [1, 2, 3] } }]`. Flag as warning if `json:` is followed by `[`.
- **Missing return** — If `jsCode` has no `return` statement at all, flag as warning.
- **Data transformation functions** — Methods like `.toDate()`, `.isEmail()`, `.toTitleCase()` are expression-only and won't work inside `jsCode`. Flag as warning if found.

### 2.4 typeVersion Checks

Compare `typeVersion` against the known-good versions:

| Node type | Expected typeVersion |
|-----------|---------------------|
| `n8n-nodes-base.telegram` / `telegramTrigger` | `1.2` |
| `n8n-nodes-base.webhook` | `2` |
| `n8n-nodes-base.scheduleTrigger` | `1.2` |
| `n8n-nodes-base.manualTrigger` | `1` |
| `n8n-nodes-base.httpRequest` | `4.2` |
| `n8n-nodes-base.code` | `2` |
| `n8n-nodes-base.set` | `3.4` |
| `n8n-nodes-base.if` | `2.2` |
| `n8n-nodes-base.switch` | `3.2` |
| `n8n-nodes-base.merge` | `3` |
| `n8n-nodes-base.splitInBatches` | `3` |
| `n8n-nodes-base.respondToWebhook` | `1.1` |
| `n8n-nodes-base.googleSheets` | `4.5` |
| `n8n-nodes-base.googleDrive` | `3` |
| `n8n-nodes-base.wait` | `1.1` |
| `n8n-nodes-base.executeCommand` | `1` |
| `n8n-nodes-base.stickyNote` | `1` |
| `@n8n/n8n-nodes-langchain.agent` | `1.7` |

**Warning** (not error) if a version is older than expected — the workflow may
still work but could be missing newer features or fixes.

### 2.5 Credential Key Names

Check that credential keys match what the node actually expects:

| Node | Correct credential key |
|------|----------------------|
| Telegram / TelegramTrigger | `telegramApi` |
| Slack | `slackApi` or `slackOAuth2Api` |
| Gmail | `gmailOAuth2` |
| Google Sheets | `googleSheetsOAuth2Api` |
| Google Drive | `googleDriveOAuth2Api` |
| YouTube | `youTubeOAuth2Api` |
| Notion | `notionApi` |
| OpenAI (LangChain) | `openAiApi` |
| HTTP Request (header) | `httpHeaderAuth` |
| HTTP Request (bearer) | `httpBearerAuth` |

**Warning** if a key looks misspelled (e.g., `slackAPI`, `gmailOauth2`).

**HTTP Request with `predefinedCredentialType`:** When an HTTP Request node uses
`"authentication": "predefinedCredentialType"`, it must also have both
`nodeCredentialType` (e.g., `"youTubeOAuth2Api"`) and a matching `credentials`
block. Flag as **error** if either is missing.

### 2.6 Expression Syntax

Scan all string values for expression patterns:

- **Error** if `={{` has no closing `}}` — unbalanced braces
- **Error** if `$node[` references a node name that doesn't appear in the
  `nodes` array (misspelled node reference)
- **Warning** if a bare `$json.field` appears outside of `={{ ... }}` — it
  won't be evaluated
- **Warning** for deeply nested paths like `={{ $json.a.b.c }}` — if any
  intermediate key is absent at runtime, the expression silently returns
  `undefined`. Suggest null-safe access or an IF check upstream.

### 2.7 Connection Structure

Inspect the `connections` object:

**Merge node inputs:**
A Merge node needs two inputs wired to indices 0 and 1. Error if both
connections point to `"index": 0`, or if only one input is wired.

**AI Agent sub-nodes:**
LangChain sub-nodes (OpenAI Chat Model, memory, tools) must use the
sub-node connection type as the key, not `main`. Error if a sub-node connects
via `main` instead of `ai_languageModel`, `ai_tool`, `ai_memory`, etc.

**IF / Switch output count:**
Count the number of rule conditions in an IF/Switch node and compare to the
number of output arrays in `connections["<node-name>"].main`.

- IF node: should have exactly 2 outputs (true + false)
- Switch node: output count should equal number of rules (+ 1 if fallback is
  enabled)

**Error** if the counts don't match.

### 2.8 SplitInBatches Loop Wiring

If the workflow contains a `splitInBatches` node, check that its `main[0]`
(batch output) eventually connects back to the same `splitInBatches` node —
forming a loop. If `main[0]` leads only to terminal nodes with no path back,
flag it as a **warning** (the batch will only run once).

### 2.9 Webhook Checks

**Respond pairing:** If a `webhook` node has `"responseMode": "responseNode"`,
there should be a `respondToWebhook` node somewhere downstream. **Warning** if
none exists.

**Duplicate paths:** If the workflow has multiple `webhook` or `webhookTrigger`
nodes with the same `path` + `httpMethod` combination, only one will work —
flag as **error**. (n8n only allows one webhook per path/method pair.)

**Cloud timeout note:** If `responseMode` is `"responseNode"` and the workflow
appears designed for long-running operations (AI agents, multi-step chains),
add a **warning** that n8n Cloud enforces a 100-second timeout — requests
exceeding this get a Cloudflare 524 error. For long processes, use two separate
webhooks: one to kick off the job and one to poll for results.

### 2.10 Community Node Deployment Risks

For any node identified as a community node (see 2.1):

1. **Missing package warning** — Add a note that if the workflow fails to load
   with an error like *"Missing packages"*, the fix is either:
   - Persist `~/.n8n/nodes` in Docker (recommended)
   - Set env var `N8N_REINSTALL_MISSING_PACKAGES=true` (slower startup, may
     fail health checks)
   - On n8n Cloud: if the instance crashes on startup due to a bad community
     node, disable all community nodes via Cloud Admin Panel → Manage →
     "Disable all community nodes"

2. **Breaking changes warning** — Community nodes can introduce breaking
   changes between versions. If the workflow breaks after a node upgrade,
   downgrade by uninstalling and reinstalling the previous version
   (`n8n-nodes-<package>@<version>`).

3. **Security note** — Community nodes have unrestricted machine access.
   Only install from trusted sources or n8n-verified packages.

Skip this section entirely if the workflow contains only built-in and
LangChain nodes.

### 2.11 Credential Portability

**Error check only:** If any HTTP Request node has authentication set to something other than `"none"` but has no `credentials` block, flag as **error** — the node will fail silently on auth.

Skip the generic "credential IDs are instance-specific" advisory — it applies to every workflow with credentials and doesn't describe a real defect in the JSON being reviewed. Omit it unless the user explicitly asks about portability.

### 2.12 Error Handling

For workflows with 5 or more nodes that have no `errorTrigger` node, add a
**warning**:

> No error trigger node found. Failed executions will be lost silently. For
> production workflows, add an "Error Trigger" node connected to a
> notification (email, Slack, etc.) to catch failures.

---

## Step 3: MCP Validation

After completing static analysis, call the MCP validator with the full workflow
JSON. Pass the JSON exactly as-is — do not modify it before validation.

```
n8n_validate_workflow({
  workflow: <the full workflow JSON object>,
  profile: "runtime"
})
```

Collect any errors and warnings returned. These are the runtime-level issues
that static analysis can't always catch (missing required params deep in node
schemas, expression evaluation errors, etc.).

**Community nodes:** The MCP validator may not have schemas for community
nodes and will likely skip or warn about them. If MCP returns a "node type
unknown" or "schema not found" error for a community node, that's expected —
note it as informational, not a blocking error.

**De-duplicate:** If an MCP error describes the same issue already found in
static analysis, don't list it twice. Merge them into one finding.

---

## Step 4: Report

Present findings in this structure:

```
## n8n Workflow Check

### Errors (must fix before activating)
1. [Node name] — [issue description] — [what to change]
2. ...

### Warnings (review, may be acceptable)
1. [Node name] — [issue description] — [suggestion]
2. ...

### Clean ✓
[category] — no issues found
```

If there are zero errors AND zero warnings, output:

```
## n8n Workflow Check
✓ No issues found. Workflow looks good to activate.
```

**After the report**, if there are errors, ask the user: "Want me to apply
these fixes directly to the workflow?"

---

## Severity Guide

| Severity | Meaning |
|----------|---------|
| Error | Will cause activation failure or silent runtime breakage |
| Warning | Workflow may activate but could behave unexpectedly |

Operator structure issues (missing `singleValue`, IF conditions metadata) are
auto-fixed by n8n on save — don't report these as errors unless the MCP
validator explicitly flags them after a save operation.
