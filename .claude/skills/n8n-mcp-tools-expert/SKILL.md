---
name: n8n-mcp-tools-expert
description: >
  Expert guide for HOW to call n8n-mcp MCP tools correctly. Use when you need
  to know the right tool to call, the correct parameter format, or which nodeType
  prefix to use (nodes-base.* vs n8n-nodes-base.*). Covers: search_nodes,
  get_node detail levels and modes, validate_node profiles, n8n_create_workflow,
  n8n_update_partial_workflow all 17 operation types, smart parameters
  (branch/case/sourceOutput), auto-sanitization behavior, template deployment,
  and execution management. Trigger on: "how do I call X tool", "what parameters
  does X take", "which tool should I use for Y", "what's the nodeType format",
  or any confusion about MCP tool usage.
---

# n8n MCP Tools Expert

## Critical: nodeType Formats

Two different formats — wrong format silently fails or returns "node not found":

| Tool group | Format | Example |
|------------|--------|---------|
| `search_nodes`, `get_node`, `validate_node` | `nodes-base.*` | `nodes-base.slack` |
| `n8n_create_workflow`, `n8n_update_partial_workflow` | `n8n-nodes-base.*` | `n8n-nodes-base.slack` |
| LangChain in search/validate | `nodes-langchain.*` | `nodes-langchain.agent` |
| LangChain in workflows | `@n8n/n8n-nodes-langchain.*` | `@n8n/n8n-nodes-langchain.agent` |

`search_nodes` returns **both** in each result — use the right one for the right tool:
```json
{
  "nodeType": "nodes-base.slack",
  "workflowNodeType": "n8n-nodes-base.slack"
}
```

---

## Tool Availability

**No n8n API needed:**
- `search_nodes`, `get_node`
- `validate_node`, `validate_workflow`
- `search_templates`, `get_template`
- `tools_documentation`, `ai_agents_guide`

**Requires N8N_API_URL + N8N_API_KEY:**
- `n8n_create_workflow`, `n8n_update_partial_workflow`
- `n8n_validate_workflow` (by ID), `n8n_autofix_workflow`
- `n8n_list_workflows`, `n8n_get_workflow`
- `n8n_test_workflow`, `n8n_executions`
- `n8n_deploy_template`, `n8n_workflow_versions`

---

## search_nodes

```javascript
search_nodes({
  query: "slack",
  mode: "OR",            // OR (default), AND, FUZZY (typo-tolerant — finds "slak" → Slack)
  limit: 20,
  source: "all",         // all (default), core, community, verified
  includeExamples: false // true → real template configs included in results
})
```

---

## get_node

**Detail levels** (default mode is `info`):

| Detail | Tokens | Use for |
|--------|--------|---------|
| `standard` | ~1-2K | Default — operations, key properties |
| `minimal` | ~200 | Just metadata (displayName, category, isTrigger) |
| `full` | ~3-8K | Complete property schema — debugging only |

**Non-obvious constraints:**
- `includeExamples: true` — only works with `mode: "info"` + `detail: "standard"`
- `includeTypeInfo: true` — adds validation rules and JS types (~80-120 tokens per property); use for complex nodes like `if`, `filter`, `resourceMapper`

**Modes:**

| Mode | Extra params | Returns |
|------|-------------|---------|
| `info` (default) | `detail`, `includeExamples`, `includeTypeInfo` | Schema at the specified detail level |
| `docs` | — | Readable markdown: usage, auth, patterns, examples |
| `search_properties` | `propertyQuery` (required), `maxPropertyResults` | Property paths matching query |
| `versions` | — | Version history with breaking change flags |
| `compare` | `fromVersion`, `toVersion` (defaults to latest) | Property-level diff between versions |
| `breaking` | `fromVersion` | Breaking changes only |
| `migrations` | `fromVersion` | Only auto-migratable changes |

```javascript
get_node({ nodeType: "nodes-base.httpRequest" })  // standard info, default
get_node({ nodeType: "nodes-base.slack", mode: "docs" })
get_node({ nodeType: "nodes-base.httpRequest", mode: "search_properties", propertyQuery: "authentication" })
get_node({ nodeType: "nodes-base.executeWorkflow", mode: "versions" })
get_node({ nodeType: "nodes-base.httpRequest", mode: "breaking", fromVersion: "3.0" })
```

---

## validate_node

```javascript
validate_node({
  nodeType: "nodes-base.slack",
  config: { resource: "message", operation: "post", channel: "#general" },
  mode: "full",      // full (default), minimal (required fields check only)
  profile: "runtime"
})
```

**Profiles** (only apply with `mode: "full"`):

| Profile | Strictness | Use when |
|---------|-----------|---------|
| `runtime` | Balanced | Pre-deployment — recommended default |
| `minimal` | Very lenient | Quick checks, incomplete configs |
| `ai-friendly` | Reduced false positives | AI-generated configs |
| `strict` | Maximum | Final production check |

**Error types in response:**
- `missing_required`, `invalid_value`, `type_mismatch` → must fix before activating
- `best_practice` → warning; skip unless it indicates a real misconfiguration
- `suggestion` → optional

---

## Auto-Sanitization

Runs on **every** `n8n_create_workflow` or `n8n_update_partial_workflow` call — on **all nodes**, not just the ones you modified. Fixes binary/unary operator structures and adds missing `conditions.options` metadata.

For full details on what it fixes, what it cannot fix, and recovery tools (`cleanStaleConnections`, `n8n_autofix_workflow`) → see the **n8n-validation-expert** skill.

---

## n8n_update_partial_workflow — All 17 Operations

```javascript
n8n_update_partial_workflow({
  id: "workflow-id",
  intent: "Describe what you're doing",  // Shapes the tool's response
  operations: [...],
  continueOnError: true,  // Apply successful ops, skip failures (best-effort mode)
  validateOnly: true      // Preview what would happen without applying
})
```

### Node Operations

```javascript
{ type: "addNode", node: { name, type, typeVersion, position: [x, y], parameters, credentials } }
{ type: "removeNode", nodeName: "Name" }     // also accepts nodeId: "uuid"
{ type: "updateNode", nodeName: "Name", updates: { "parameters.text": "value" } }  // dot notation for nested
{ type: "moveNode", nodeName: "Name", position: [x, y] }
{ type: "enableNode", nodeName: "Name" }
{ type: "disableNode", nodeName: "Name" }
```

**Remove a property** — set value to `undefined`:
```javascript
{ type: "updateNode", nodeName: "HTTP Request", updates: { "onError": undefined } }

// Migrate deprecated property:
{ type: "updateNode", nodeName: "HTTP Request", updates: { continueOnFail: undefined, onError: "continueErrorOutput" } }
```

### Connection Operations

```javascript
// Standard linear connection
{ type: "addConnection", source: "NodeA", target: "NodeB" }

// IF node — use branch instead of sourceIndex (0/1)
{ type: "addConnection", source: "IF", target: "True Handler", branch: "true" }
{ type: "addConnection", source: "IF", target: "False Handler", branch: "false" }

// Switch node — use case instead of sourceIndex
{ type: "addConnection", source: "Switch", target: "Handler A", case: 0 }
{ type: "addConnection", source: "Switch", target: "Handler B", case: 1 }

// AI sub-node connections — requires sourceOutput (not "main")
{ type: "addConnection", source: "OpenAI Chat Model", target: "AI Agent", sourceOutput: "ai_languageModel" }
{ type: "addConnection", source: "Calculator", target: "AI Agent", sourceOutput: "ai_tool" }
{ type: "addConnection", source: "Window Buffer Memory", target: "AI Agent", sourceOutput: "ai_memory" }
{ type: "addConnection", source: "Output Parser", target: "AI Agent", sourceOutput: "ai_outputParser" }
// All 8 AI types: ai_languageModel, ai_tool, ai_memory, ai_outputParser,
//                 ai_embedding, ai_vectorStore, ai_document, ai_textSplitter

{ type: "removeConnection", source: "NodeA", target: "NodeB", ignoreErrors: true }
{ type: "rewireConnection", source: "Webhook", from: "Old Handler", to: "New Handler" }
{ type: "cleanStaleConnections" }     // removes all broken connection references
{ type: "replaceConnections", connections: { ...fullConnectionsObject } }
```

### Metadata & Activation Operations

```javascript
{ type: "updateSettings", settings: { errorWorkflow: "id", timezone: "America/New_York", executionTimeout: 300 } }
{ type: "updateName", name: "New Workflow Name" }
{ type: "addTag", tag: "production" }
{ type: "removeTag", tag: "draft" }
{ type: "activateWorkflow" }
{ type: "deactivateWorkflow" }
```

---

## n8n_autofix_workflow

```javascript
// Preview mode (default — does not apply)
n8n_autofix_workflow({ id: "workflow-id", applyFixes: false, confidenceThreshold: "medium" })
// confidenceThreshold: "high", "medium", "low"

// Apply fixes
n8n_autofix_workflow({ id: "workflow-id", applyFixes: true })
```

**Fix types:** `expression-format`, `typeversion-correction`, `error-output-config`, `webhook-missing-path`, `typeversion-upgrade`, `version-migration`

---

## search_templates

```javascript
// Keyword search (default)
search_templates({ query: "webhook slack", limit: 20 })

// By node types the workflow must contain
search_templates({ searchMode: "by_nodes", nodeTypes: ["n8n-nodes-base.httpRequest", "n8n-nodes-base.slack"] })

// By task type
search_templates({ searchMode: "by_task", task: "webhook_processing" })

// By metadata
search_templates({ searchMode: "by_metadata", complexity: "simple", maxSetupMinutes: 15 })
```

**get_template modes:**
```javascript
get_template({ templateId: 2947, mode: "structure" })  // nodes + connections only
get_template({ templateId: 2947, mode: "full" })        // complete workflow JSON
```

---

## n8n_deploy_template

```javascript
n8n_deploy_template({
  templateId: 2947,
  name: "Custom Name",         // optional
  autoFix: true,               // default: auto-fix common issues
  autoUpgradeVersions: true,   // default: upgrade node typeVersions to current
  stripCredentials: true       // default: remove credential references
})
// Returns: { id, requiredCredentials, fixesApplied }
```

---

## n8n_get_workflow

```javascript
n8n_get_workflow({ id: "workflow-id" })                     // full (default)
n8n_get_workflow({ id: "workflow-id", mode: "structure" })  // nodes + connections only
n8n_get_workflow({ id: "workflow-id", mode: "details" })    // full + execution stats
n8n_get_workflow({ id: "workflow-id", mode: "minimal" })    // id, name, active, tags
```

---

## n8n_executions

```javascript
// Get single execution
n8n_executions({ action: "get", id: "exec-id", mode: "summary" })
// modes: preview, summary, filtered, full, error
// error mode: add includeStackTrace: true for full stack trace

// List by workflow
n8n_executions({ action: "list", workflowId: "workflow-id", status: "error", limit: 100 })
// status: success, error, waiting

// Delete
n8n_executions({ action: "delete", id: "exec-id" })
```

---

## n8n_test_workflow

```javascript
// Webhook workflow
n8n_test_workflow({ workflowId: "id", triggerType: "webhook", httpMethod: "POST", data: {}, waitForResponse: true, timeout: 120000 })

// Chat/AI agent workflow
n8n_test_workflow({ workflowId: "id", triggerType: "chat", message: "Hello!", sessionId: "session-123" })

// triggerType is auto-detected if omitted
```

---

## n8n_workflow_versions

```javascript
n8n_workflow_versions({ mode: "list", workflowId: "id", limit: 10 })
n8n_workflow_versions({ mode: "get", versionId: 123 })
n8n_workflow_versions({ mode: "rollback", workflowId: "id", versionId: 123, validateBefore: true })
n8n_workflow_versions({ mode: "delete", workflowId: "id", versionId: 123 })
n8n_workflow_versions({ mode: "delete", workflowId: "id", deleteAll: true })
n8n_workflow_versions({ mode: "prune", workflowId: "id", maxVersions: 10 })
```

---

## Self-Help Tools

```javascript
tools_documentation()                                                        // overview of all tools
tools_documentation({ topic: "search_nodes", depth: "full" })               // specific tool docs
tools_documentation({ topic: "javascript_code_node_guide", depth: "full" }) // JS Code node guide
tools_documentation({ topic: "python_code_node_guide", depth: "full" })     // Python Code node guide
ai_agents_guide()   // AI workflow architecture, connection types, validation
n8n_health_check()
n8n_health_check({ mode: "diagnostic" })  // env vars, API connectivity, tool status
```
