---
name: n8n-learn
description: Capture and persist learnings from this n8n session into CLAUDE.md and memory. Run after any build, fix, or audit where something new was discovered. Keeps the knowledge base growing.
---

Capture learnings from this n8n session. $ARGUMENTS

## Instructions

Invoke the `n8n-capture-learning` skill.

Use this command after any session where you encountered:
- A validation error that took more than one fix attempt
- A node not in the Tier 1 list (discovered via templates or schema lookup)
- A credential key not in the CLAUDE.md credential table
- A `__rl` field not in the known resource locator table
- A workflow pattern not covered by the existing Connections Reference
- A recurring error found during an audit

### What to pass

If the user provides specific findings in `$ARGUMENTS`, pass them directly to the skill.

If called with no arguments (just `/n8n-learn`), ask the user: "What did you discover this session that should be remembered?" Then pass their answer to the skill.

### Output

The skill will write the finding to:
1. The appropriate section of `CLAUDE.md` (Known Failures, typeVersion table, credential table, etc.)
2. A memory file in `~/.claude/projects/.../memory/` with the correct type (feedback, project, reference)
3. The `n8n-json-checker` SKILL.md if it's a pre-flight check that can be automated

Every session that updates the knowledge base makes future builds faster and more reliable.
