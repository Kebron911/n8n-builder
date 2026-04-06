---
name: n8n-capture-learning
description: >
  Capture and persist n8n workflow building lessons to memory and CLAUDE.md.
  Use after any build, fix, or audit session where something new was learned.
  Trigger on: "capture this", "remember this pattern", "add this to memory",
  "update the knowledge base", "log this error", "save this config",
  or at the end of any agent run that encountered unexpected errors,
  new credential keys, new node configs, or new workflow patterns.
  This is the feedback loop that makes the system smarter over time.
---

# n8n Capture Learning

Standardized process for writing lessons from n8n sessions back into the
knowledge base. Called by agents after builds/fixes, and by the Stop hook
at session end.

---

## Decision: What to Capture

Only capture what is **non-obvious** and **reusable**. Ask: "Would the next
build benefit from knowing this?" If yes, capture it.

| Discovery type | Template | Where to capture | Memory type |
|---------------|----------|-----------------|-------------|
| Build failure root cause + fix | A | Memory file + CLAUDE.md Known Failures | `feedback` |
| New `__rl` field not in the table | B | CLAUDE.md + n8n-json-checker SKILL.md | `feedback` |
| New credential key not in table | C | CLAUDE.md credential table | `feedback` |
| New node config that works well | D | CLAUDE.md Common Node Configs | `feedback` |
| New workflow built (ID + purpose) | E | Memory project file | `project` |
| Code node gotcha | F | n8n-code-javascript or n8n-code-python skill | `feedback` |
| New expression or variable pattern | G | n8n-expression-syntax skill | `feedback` |
| Recurring audit finding | H | Memory feedback file | `feedback` |

---

## Step 1: Identify What You Learned

Quickly review what happened this session:

1. Did any validation error require more than one fix attempt? → Template A
2. Did you look up a node via `get_node` or `search_templates` that should be in Common Node Configs? → Template D
3. Did you use a credential key that isn't in the CLAUDE.md table? → Template C
4. Did you find an `__rl` field that isn't in any reference? → Template B
5. Did a Code node behave unexpectedly or have a non-obvious gotcha? → Template F
6. Did you discover a new expression or variable syntax pattern? → Template G
7. Did a recurring audit finding emerge across multiple workflows? → Template H
8. Were new workflows created? What are their IDs and purpose? → Template E

Answer each with yes/no. For each "yes", proceed to the relevant template below.

---

## Step 2: Choose a Template and Write

### Template A — Build Failure / Error Pattern

**Write to:** memory file `feedback_build_patterns.md` (path shown in MEMORY.md index)

**Format:** Append a new section `---` block:

```markdown
---

## [Short title: e.g., "Airtable baseId requires __rl"]

[Node type and field that was wrong]
[What the wrong value looked like]
[What the correct value looks like — include exact JSON]
[Why it fails without this (if known)]

**Correct config:**
\`\`\`json
{ "__rl": true, "value": "YOUR_BASE_ID", "mode": "id" }
\`\`\`

**Caught by check:** [which n8n-json-checker section catches this, or "not yet — add to section 2.X"]
```

**Also update:** CLAUDE.md "Known Failure Patterns" section with a one-line entry.

---

### Template B — New `__rl` Field

**Write to:** CLAUDE.md `__rl` table AND n8n-json-checker SKILL.md section 2.2 table.

Find the `__rl` table in each file and add a row:
```
| `n8n-nodes-base.<nodeName>` | `<fieldName>`, `<fieldName2>` |
```

Then add to `feedback_build_patterns.md`:
```markdown
---
## New __rl field: [node].[field]
Discovered: [node type] requires __rl format on [field name].
Correct: { "__rl": true, "value": "...", "mode": "id|expression|list" }
```

---

### Template C — New Credential Key

**Write to:** CLAUDE.md credential table.

Find the `### Common credential type keys` table and add a row:
```
| [Node name] | `[credentialKey]` |
```

Also add to n8n-json-checker SKILL.md section 2.5 table if the node has credential checks there.

---

### Template D — New Common Node Config

**Write to:** CLAUDE.md `## Common Node Configs` section.

Add a new `###` subsection with the complete JSON config:
```markdown
### [Node Name] — [Operation]

\`\`\`json
{
  "name": "...",
  "type": "n8n-nodes-base.<name>",
  "typeVersion": X,
  "position": [500, 300],
  "parameters": { ...full working config... }
}
\`\`\`

[One sentence about what this config does and any gotchas.]
```

Only add configs that are **complete and verified to work** — not approximations.

---

### Template E — Workflow Inventory Entry

**Write to:** memory file `project_n8n_builder.md` (path shown in MEMORY.md index)

Append to the `## Standing Infrastructure` section:
```markdown
- **[Workflow Name]** — ID: `[workflowId]`
  - URL: [instance_url]/workflow/[id] — use the instance URL from CLAUDE.md → `## n8n Instance`
  - Purpose: [one sentence]
  - Trigger: [trigger type]
  - Credentials needed: [list]
```

---

### Template F — Code Node Gotcha

**Write to:** `.claude/skills/n8n-code-javascript/SKILL.md` or `n8n-code-python/SKILL.md`

First read the current file to find the right insertion point. For n8n-code-javascript, the structure is:
- Section headers matching the topic (e.g., "The One Rule", "Data Access Variables", "Webhook Data", "HTTP Requests", "DateTime", etc.)
- A "Quick Fixes for Common Errors" table at the bottom

For a new gotcha, either:
- **Add a row to the Quick Fixes table** if it's a symptom→cause→fix pattern:
  ```
  | [Symptom] | [Cause] | [Fix] |
  ```
- **Add a code block under the relevant section** if it needs more explanation:
  ```javascript
  // ❌ Wrong: [description]
  [bad code]

  // ✅ Correct: [description]
  [good code]
  ```

---

### Template G — Expression / Variable Pattern

**Write to:** `.claude/skills/n8n-expression-syntax/SKILL.md`

Read the file first to find the correct section, then append the pattern in the same style as existing examples.

---

### Template H — Recurring Audit Finding

**Write to:** memory file `feedback_build_patterns.md` (path shown in MEMORY.md index)

Append a new section:
```markdown
---

## Recurring: [Short title]

[What the finding is]
[Why it keeps appearing — root cause]
[How to detect it in future audits]
[Recommended fix or prevention]
```

---

## Step 3: Update MEMORY.md Index if New Files Created

If you created a new memory file, add it to the `MEMORY.md` index file in the project memory directory (shown in the `MEMORY.md` context loaded at the top of your conversation).

Format: `- [Title](filename.md) — one-line hook under 150 chars`

---

## Step 4: Confirm

After writing, output a brief confirmation:
```
Captured: [X] learning(s)
- [type]: [one-line summary]
- [type]: [one-line summary]
Files updated: [list of files touched]
```

---

## What NOT to Capture

- Things already documented in CLAUDE.md (don't duplicate)
- One-off values specific to a single workflow (workflow IDs, sheet IDs, chat IDs)
- Things derivable from reading the current code
- Resolved issues that won't recur (e.g., a typo in a specific workflow)

The goal is compound interest: each captured lesson prevents one future error across all future builds.
