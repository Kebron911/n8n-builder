# n8n-builder

A Claude Code plugin for building, fixing, auditing, and monitoring n8n workflows by natural language — powered by the n8n-mcp MCP server.

## What it does

Covers the full n8n workflow lifecycle from a single conversation:

- **Build** — describe a workflow in plain English, get a validated, active workflow on your instance
- **Fix** — repair validation errors, broken node configs, and credential gaps on existing workflows
- **Audit** — deep structural health check across all workflows with prioritized error reports
- **Monitor** — fast read-only status dashboard (active/inactive, trigger types, credential gaps)
- **Check** — verify instance connectivity and MCP tool health before building
- **Learn** — persist session discoveries (new error patterns, node configs, credential keys) into CLAUDE.md and memory

## Requirements

- Claude Code
- A self-hosted n8n instance with API access
- n8n-mcp configured in `.mcp.json`

## Setup

1. Configure your n8n instance URL and API key in `.mcp.json`
2. Run `/n8n-check` to verify connectivity

## Commands

| Command | Description |
|---------|-------------|
| `/n8n-build <description>` | Build a new workflow from a natural language description |
| `/n8n-fix <workflow-id>` | Fix errors on one or more existing workflows |
| `/n8n-test <workflow-id>` | Execute a workflow on-demand and inspect node output |
| `/n8n-logs <workflow-id>` | View execution history and debug failed runs |
| `/n8n-audit` | Full structural audit of all workflows on the instance |
| `/n8n-monitor` | Fast workflow status dashboard |
| `/n8n-check` | Test instance connectivity and MCP tool health |
| `/n8n-learn` | Capture and persist session learnings |

### Test examples

```
/n8n-test abc123
/n8n-test "My Slack Notification Workflow"
/n8n-test abc123 --last
```

### Log examples

```
/n8n-logs abc123
/n8n-logs abc123 --limit 20
/n8n-logs "My Workflow" --failed
/n8n-logs abc123 --exec exec_id_here
```

### Build examples

```
/n8n-build Send a Slack message when a new row is added to Google Sheets
/n8n-build Poll RSS feed every hour and email new items
/n8n-build Webhook → classify with OpenAI → route to Notion or Slack based on result
```

### Fix examples

```
/n8n-fix abc123
/n8n-fix abc123, def456, ghi789
```

### Monitor flags

```
/n8n-monitor --active
/n8n-monitor --inactive
/n8n-monitor --broken
/n8n-monitor "My Workflow Name"
```

## Agents

| Agent | Role |
|-------|------|
| `n8n-workflow-builder` | Full build lifecycle: plan → create → validate → fix → activate → test |
| `n8n-workflow-fixer` | Repair existing workflows: fetch → validate → patch → re-validate |
| `n8n-workflow-tester` | Execute workflows on-demand, inspect output, view execution logs |
| `n8n-workflow-auditor` | Deep audit of all workflows with prioritized issue report |
| `n8n-workflow-monitor` | Read-only status overview with selective validation |
| `n8n-instance-checker` | Connectivity and MCP tool health diagnostics |

## Skills

| Skill | Role |
|-------|------|
| `n8n-node-configs` | Node JSON templates, typeVersions, credential keys — load at build start |
| `n8n-workflow-patterns` | Architectural patterns for planning before touching tools |
| `n8n-json-checker` | Pre-flight validation of workflow JSON before deploying |
| `n8n-validation-expert` | Interpret MCP validator errors and guide fixes |
| `n8n-node-configuration` | Operation-aware node config guidance |
| `n8n-mcp-tools-expert` | Correct MCP tool call patterns and nodeType prefixes |
| `n8n-expression-syntax` | Validate and fix n8n `{{ }}` expression syntax |
| `n8n-code-javascript` | Write JavaScript for n8n Code nodes |
| `n8n-code-python` | Write Python for n8n Code nodes |
| `n8n-capture-learning` | Persist new patterns into CLAUDE.md and memory after each session |

## Node version

Pinned to n8n **v1.76**. After any instance upgrade:

```bash
N8N_API_KEY=<key> node scripts/test-node-configs.js

# Debug mode — prints raw HTTP request + response for every call
N8N_API_KEY=<key> node scripts/test-node-configs.js --debug

# Debug a single node type
N8N_API_KEY=<key> node scripts/test-node-configs.js --debug --node n8n-nodes-base.slack
```

Then update typeVersions in `n8n-node-configs` skill, `n8n-workflow-builder` agent, and `n8n-json-checker` skill.

## Author

[ProfessionalAIAssistants](https://professionalaiassistants.com)
