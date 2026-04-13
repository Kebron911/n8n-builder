---
name: n8n-learn
description: Capture new patterns, failure modes, credential types, or node configs discovered this session. Updates CLAUDE.md and project memory so future builds benefit. Use after sessions that revealed something non-obvious.
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

If called with no arguments, review the current session for learnings worth capturing (validation errors, new node configs, credential patterns). If nothing is obvious, ask the user: "What did you discover this session?" Then pass to the skill.

### Output

The skill will write the finding to:
1. The appropriate section of `CLAUDE.md` (Known Failures, typeVersion table, credential table, etc.)
2. A memory file in `~/.claude/projects/.../memory/` with the correct type (feedback, project, reference)
3. The `n8n-json-checker` SKILL.md if it's a pre-flight check that can be automated

Every session that updates the knowledge base makes future builds faster and more reliable.
