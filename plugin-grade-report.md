# n8n-builder Plugin: Performance & Token Analysis

**Date:** 2026-04-13
**Plugin:** n8n-builder (10 skills, 6 agents, 8 commands)
**Instance:** 63 files, 584 KB distributed

---

## Overall Grade: B+

Strong architecture, clean separation of concerns, smart progressive disclosure. Loses points on context bloat from one oversized skill and some redundancy that burns tokens unnecessarily.

---

## Token Footprint

| Layer | Files | Tokens | When Loaded |
|-------|-------|--------|-------------|
| Always in context (descriptions) | 18 | ~72 | Every conversation |
| On-invoke (SKILL.md bodies) | 10 | ~3,877 | When skill triggers |
| On-demand references | 30 | ~17,288 | When skill says "read this" |
| Agent files | 6 | ~1,366 | When command spawns agent |
| Scripts/data (not in context) | 15 | ~5,711 | Executed, never loaded |
| **Total** | **63** | **~28,314** | — |

**Typical build session:** ~5,500 tokens (1 command + 1 agent + 2-3 skills)
**Worst case (full audit + all refs):** ~24,000 tokens
**Headroom:** Excellent. Well under any model's context limit.

---

## Dimension Grades

### Architecture & Separation: A
Clean command → agent → skill DAG. No circular deps. Commands route, agents execute, skills provide knowledge. One-way dependency chain. This is textbook.

### Progressive Disclosure: B
Most skills properly split SKILL.md (loaded on trigger) from reference docs (loaded on demand). One critical exception: `n8n-node-configs` SKILL.md is **1,030 lines** — 2x the recommended limit. Gets loaded on every single build. That's ~1,339 tokens of node templates burned on every workflow creation, most of which won't be used.

### Cross-Referencing: B-
CLAUDE.md is the source of truth for instance config and build process. Good. But `__rl` format is documented in 3 places (CLAUDE.md, json-checker, node-configuration). Webhook data structure duplicated across 3 skills. Each duplicate is a maintenance liability and a token tax.

### Coverage: B+
Excellent for build/fix/test/audit lifecycle. Gaps:
- No credentials management skill (common pain point)
- No runtime debugging skill (validation errors covered, runtime failures aren't)
- No performance/optimization guidance (batching, timeouts, large datasets)

### Bloat: C+
Three specific problems:
1. **unique_node_configs.jsonl (91 KB, 195 nodes)** — Stale cache of scraped configs. `search_templates()` covers 34,000+ templates and stays current. This file requires manual maintenance on every n8n upgrade and adds marginal value.
2. **Workspace/eval artifacts in plugin dir** — Skill-creator iteration folders (820 files, 3.5 MB in dev repo) are development artifacts, not runtime resources.
3. **Dual README + SKILL.md per skill** — 10 skills each have both. READMEs are 90-400 line narratives that mostly restate SKILL.md content. Agents only use SKILL.md.

---

## Token Efficiency: Per-Operation Cost

| Operation | Tokens Loaded | Assessment |
|-----------|--------------|------------|
| `/n8n-build` (simple workflow) | ~3,200 | Agent + node-configs skill. Acceptable but node-configs is heavy. |
| `/n8n-build` (complex, 10+ nodes) | ~6,500 | Agent + node-configs + 2-3 reference lookups. Reasonable. |
| `/n8n-fix` (single workflow) | ~2,800 | Agent + validation-expert. Efficient. |
| `/n8n-audit` (20 workflows) | ~3,500 | Agent + parallel batches. Good — subagents isolate context. |
| `/n8n-monitor` | ~2,200 | Lightest agent. Fast path works well. |
| `/n8n-test` | ~2,400 | Tester agent is lean. Good. |
| `/n8n-check` | ~1,500 | Smallest agent. Appropriate for diagnostics. |
| `/n8n-learn` | ~1,800 | Skill invocation, minimal overhead. |

---

## ROI Assessment

### High Value
- **n8n-workflow-builder agent** — Core value prop. Turns natural language into deployed workflows. Worth every token.
- **n8n-validation-expert skill** — Prevents broken deployments. ERROR_CATALOG.md is comprehensive.
- **n8n-workflow-fixer agent** — Systematic fix process saves significant manual debugging time.
- **n8n-json-checker skill** — Pre-flight validation catches issues before they hit the instance.

### Good Value
- **n8n-workflow-patterns skill** — 5 canonical patterns prevent architectural mistakes.
- **n8n-code-javascript skill** — Code node is a common pain point; this covers it well.
- **n8n-mcp-tools-expert skill** — Meta-skill that prevents MCP tool misuse.

### Questionable Value
- **n8n-code-python skill** — Python support in n8n is limited. 5,715 bytes + 4 reference files for a niche feature. Keep but deprioritize.
- **unique_node_configs.jsonl** — 91 KB data file that duplicates what `search_templates()` provides. Stale on upgrade. Recommend removal.
- **README.md files** — 10 files totaling ~3,000 lines that agents never read. Pure documentation overhead.

### Low Value
- **n8n-learn command** — Thin wrapper around n8n-capture-learning skill. Could be removed; users can invoke the skill directly.
- **Workspace/eval artifacts** — Development leftovers. 3.5 MB of iteration files that serve no runtime purpose.

---

## Recommended Actions

### Quick Wins (save ~5,000 tokens per build)
1. **Split n8n-node-configs** — Extract 20 Tier 1 templates to sub-file, keep SKILL.md under 150 lines
2. **Consolidate __rl docs** — Single source in n8n-json-checker, reference from everywhere else
3. **Clean workspace dirs** — Remove iteration/eval artifacts from plugin directory

### Medium-Term (structural improvement)
4. **Remove unique_node_configs.jsonl** — Replace with `search_templates()` instruction
5. **Add n8n-credentials-expert skill** — Cover the credential management gap
6. **Consolidate README/SKILL** — Merge useful README content into SKILL.md, delete standalone READMEs

### Low Priority
7. **Add runtime diagnostics skill** — "Why did my workflow fail at runtime?"
8. **Remove n8n-learn command** — Let users invoke capture-learning skill directly
9. **Add performance patterns skill** — Batching, timeouts, large data handling
