# n8n Agent Builder

## Project Purpose

This project uses Claude Code to build n8n workflows and agents by prompt. Given a description of what a workflow should do, Claude will design, configure, validate, and deploy it directly to the connected n8n instance.

Two tools work in combination to make this possible:
- **n8n-mcp** (`czlonkowski/n8n-mcp`) — MCP server providing direct access to node documentation, workflow templates, validation, and the n8n REST API
- **n8n-skills** (`czlonkowski/n8n-skills`) — 7 Claude Code skills that encode n8n best practices; they activate automatically based on task context

---

## Available Tools

### n8n-mcp (MCP Server)

Connects Claude to the n8n instance and its full node library.

**Capabilities:**
- Search and read documentation for 1,084+ nodes (537 core + 547 community)
- Access 2,700+ pre-extracted workflow templates as reference
- Create, update, activate, and execute workflows via the n8n REST API
- Validate workflow configurations before deployment
- Search community integrations

**Required environment variables (configure in MCP settings):**
```
N8N_API_URL=https://your-n8n-instance.com
N8N_API_KEY=your-api-key
```

**Setup:**
- Hosted (free tier): `dashboard.n8n-mcp.com`
- Self-hosted via npx: `npx n8n-mcp` (requires `MCP_MODE=stdio`)
- Docker or Railway also supported — see `czlonkowski/n8n-mcp`

### n8n-skills (Claude Code Skills)

Seven skills that activate automatically when building workflows. No slash commands required.

| Skill | Activates when… |
|-------|-----------------|
| n8n Expression Syntax | Writing `{{ }}` expressions, referencing `$json`, `$node`, `$now`, etc. |
| n8n MCP Tools Expert | Using n8n-mcp tools — guides tool selection and validation profiles |
| n8n Workflow Patterns | Designing webhook, HTTP API, database, AI, or scheduled workflows |
| n8n Validation Expert | Interpreting and fixing validation errors from n8n-mcp |
| n8n Node Configuration | Configuring specific nodes, operation dependencies, AI connections |
| n8n Code JavaScript | Writing JavaScript in Code nodes — data access, return format, `$helpers` |
| n8n Code Python | Writing Python in Code nodes — standard library only, no external packages |

**Installation:**
```bash
# Option A — Claude Code plugin
/plugin install czlonkowski/n8n-skills

# Option B — Manual
git clone https://github.com/czlonkowski/n8n-skills ~/.claude/skills/n8n-skills
```

---

## How to Build a Workflow

When given a workflow prompt, follow this process:

1. **Plan** — Identify the trigger (webhook, schedule, manual), required nodes, and data flow
2. **Look up nodes** — Use n8n-mcp to fetch documentation for each node before configuring it
3. **Find templates** — Search n8n-mcp's template library for similar workflows to reference
4. **Configure** — Build the workflow JSON, applying skills for expressions, patterns, and node-specific settings
5. **Validate** — Run n8n-mcp validation before deploying; fix any errors flagged
6. **Deploy** — Use n8n-mcp to create or update the workflow in the n8n instance
7. **Confirm** — Report the workflow URL and a summary of what was built

---

## n8n Conventions (Always Apply)

### Expressions
- Use `{{ }}` for all dynamic values
- Webhook body data is at `$json.body`, not `$json` directly
- Use `$node["NodeName"].json` to reference a specific node's output
- Use `$now` for current timestamp (ISO 8601 by default)

### Code Nodes (JavaScript)
- Always return an array: `return [{ json: { ... } }]`
- Multiple items: `return items.map(item => ({ json: { ... } }))`
- Access input data via `$input.all()` or `$input.first().json`
- Use `$helpers` for built-in utilities

### Code Nodes (Python)
- Standard library only — no `pandas`, `requests`, or other external packages
- Return format mirrors JavaScript: list of dicts with a `json` key

### Node Selection
- Prefer native nodes (Slack, Gmail, Postgres, etc.) over HTTP Request when available
- Use HTTP Request only when no dedicated node exists
- Check the n8n-mcp node library first before defaulting to generic nodes

### Validation
- Always validate with n8n-mcp before pushing to the instance
- Treat validation warnings as informational; treat errors as blockers
- Some false positives exist for optional fields — use judgment on profile selection

---

## n8n Instance

**Type:** Self-hosted (cloud/VPS)
**API URL:** Set via `N8N_API_URL` environment variable
**API Key:** Set via `N8N_API_KEY` environment variable

To generate an API key: n8n Settings → API → Create API Key
