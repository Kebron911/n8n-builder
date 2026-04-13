# n8n-builder Commands + Agents: Analysis Report

**Date:** 2026-04-13
**Scope:** All 8 commands + 6 agents, dry-run analysis

---

## Critical Issues (must fix)

### 1. n8n-build agent references 6 non-existent skills
**Location:** n8n-workflow-builder.md Skill Usage Guide table
**Problem:** References `n8n-workflow-patterns`, `n8n-node-configuration`, `n8n-expression-syntax`, `n8n-code-python`, `n8n-mcp-tools-expert`, `n8n-validation-expert` — these all exist as skills in the plugin but the agent references them by bare name without prefix. Need to verify the agent can actually resolve these skill names at runtime.
**Fix:** Confirm skill resolution works, or add full skill paths.

### 2. Conflicting node sourcing decision trees
**Location:** n8n-workflow-builder.md (3 tiers) vs CLAUDE.md (4 steps including unique_node_configs.jsonl)
**Problem:** Agent skips `unique_node_configs.jsonl` (195 node types from live workflows). CLAUDE.md includes it between Tier 1 and templates.
**Fix:** Align agent Step 2 with CLAUDE.md. Add Grep on `unique_node_configs.jsonl` as Tier 1.5.

### 3. Schedule triggers not handled in n8n-test
**Location:** n8n-workflow-tester.md Test Mode
**Problem:** Only handles manual + webhook triggers. Schedule triggers silently ignored — no message, no fallback.
**Fix:** Add explicit schedule trigger branch: "This workflow runs on a schedule. Last execution: [date]. To test manually, temporarily change trigger to Manual Trigger."

### 4. WebFetch auth fragility in n8n-logs
**Location:** n8n-workflow-tester.md Logs Mode
**Problem:** Uses WebFetch with X-N8N-API-KEY header to hit REST API directly. No error handling for auth failures, no fallback to MCP tools.
**Fix:** Add error handling wrapper. Check if MCP exposes executions endpoint first. Document fallback path.

---

## High Issues (should fix)

### 5. Fix priority order is wrong in n8n-fix
**Location:** n8n-workflow-fixer.md Step 3
**Current:** `__rl` → typeVersion → connections → credentials → code
**Better:** `typeVersion` → nodeType format → `__rl` → missing fields → credentials → connections → code
**Why:** Wrong typeVersion causes cascading parameter errors. Fix the foundation first.

### 6. Error handler rule buried in n8n-build
**Location:** n8n-workflow-builder.md line 220 (Rules section)
**Problem:** `settings.errorWorkflow` for 5+ node workflows is in Rules at the END, not in Step 3's "Critical checks before submitting."
**Fix:** Move to Step 3 checklist.

### 7. Credential placeholder detection is brittle
**Location:** n8n-workflow-monitor.md + n8n-workflow-auditor.md
**Problem:** `"id": "1"` = placeholder. Real credentials can have low numeric IDs.
**Fix:** Pair ID check with credential name pattern or query credentials API.

### 8. No error recovery in any agent
**Location:** All 6 agents
**Problem:** If an MCP call fails mid-workflow (timeout, auth error), no retry, no graceful degradation.
**Fix:** Add standard error recovery: retry 2x on timeout, mark failed items as "UNKNOWN" in reports.

### 9. No guidance for high-error workflows in n8n-fix
**Location:** n8n-workflow-fixer.md
**Problem:** "Collect ALL errors before fixing anything" — but what if there are 50+? Context overflow risk.
**Fix:** Add triage: 15-50 errors → batch fix by category. 50+ → recommend partial redesign.

### 10. No autofix safeguard in n8n-fix
**Location:** n8n-workflow-fixer.md Step 4
**Problem:** `n8n_autofix_workflow` preview → apply with no diff inspection or rollback path.
**Fix:** Add: inspect diff, reject if modifying unrelated nodes, re-validate after apply.

---

## Medium Issues (nice to fix)

### 11. Parallel logic duplicated between commands and agents
**Location:** n8n-build (command + agent), n8n-fix (command + agent), n8n-monitor, n8n-audit
**Problem:** Both command and agent describe parallel spawning. Maintenance burden.
**Fix:** Keep parallel orchestration in commands only. Agents reference command docs.

### 12. Monitor/Auditor routing tables are mirrored duplicates
**Location:** Both agents have inverted routing decision tables
**Fix:** Centralize routing in command descriptions or shared reference.

### 13. n8n-learn is a command that just calls a skill
**Location:** n8n-learn.md
**Problem:** Only command that delegates to a skill instead of an agent. Could be removed.
**Fix:** Either remove command or upgrade to agent that validates learnings before writing.

### 14. --last flag (n8n-test) overlaps with --exec (n8n-logs)
**Location:** Both commands share one agent
**Problem:** Both fetch single execution output. Users confused about which to use.
**Fix:** Clarify in descriptions. Or consolidate into one flag.

### 15. Batch size (5) and threshold (11+) unjustified
**Location:** Monitor + Auditor
**Problem:** No explanation for why these numbers.
**Fix:** Document the constraint (context limit, MCP rate limit, etc.)

### 16. n8n-check tests 0 and 4 could run in parallel
**Location:** n8n-instance-checker.md
**Problem:** MCP connectivity (Test 0) and HTTP reachability (Test 4) are independent.
**Fix:** Run in parallel for faster diagnosis.

### 17. "Mandatory" capture learning in n8n-fix is unrealistic
**Location:** n8n-workflow-fixer.md Step 8
**Problem:** Triggers on every multi-attempt fix. Creates friction on simple fixes.
**Fix:** Downgrade to conditional: only capture non-obvious, reusable learnings.

### 18. Auditor missing instance-level credential summary
**Location:** n8n-workflow-auditor.md
**Problem:** Monitor has credential summary table; auditor doesn't.
**Fix:** Add credential summary to auditor report.

---

## Minor Issues

### 19. Sensitive data redaction incomplete in tester
Pattern only checks password/secret/token/key/auth. Missing: apiKey, accessToken, Bearer, base64 tokens.

### 20. Webhook test instructions vague in builder
Missing: "editor must be open" explanation and example curl.

### 21. Command descriptions need accuracy updates
All 8 descriptions have minor mismatches with actual behavior. See rewrites below.

---

## Description Rewrites

### n8n-build
**Current:** Build a new n8n workflow from a natural language description. Handles the full lifecycle — plan, create, validate, fix, activate, test. For multiple workflows, spawns parallel builder subagents.
**Rewrite:** Build one or more n8n workflows from natural language. Routes to n8n-workflow-builder for the full lifecycle (source nodes → create → validate → fix → activate → test). Spawns parallel builders for batch requests.

### n8n-fix
**Current:** Fix errors in one or more existing n8n workflows. Pass a workflow ID, name, or list of IDs. Parallelizes when multiple workflows need fixing.
**Rewrite:** Fix validation and runtime errors in existing n8n workflows. Pass workflow IDs, names, or a comma-separated list. Fixes in priority order: typeVersion → nodeType → __rl → missing fields → credentials → connections → code. Parallelizes for multiple workflows.

### n8n-test
**Current:** Execute an existing n8n workflow on-demand and inspect the output. Pass a workflow ID or name. Handles both manual-trigger and webhook workflows, pretty-prints node output, and surfaces runtime errors.
**Rewrite:** Execute a manual-trigger workflow on-demand and inspect node output, or show test URL for webhook workflows. Does NOT execute schedule/timer triggers. Pass a workflow ID or name. Flags: --last (show last execution instead of re-running).

### n8n-logs
**Current:** View execution history and runtime logs for an n8n workflow. Shows last N executions with status, duration, error messages, and node-level output. Essential for debugging failed or misbehaving workflows.
**Rewrite:** View execution history for any n8n workflow. Shows last N runs with status, duration, and error details. Drill into specific executions for node-by-node output. Flags: --limit N, --failed, --exec <id>.

### n8n-monitor
**Current:** Display a fast status dashboard of all n8n workflows — active/inactive, trigger types, credential gaps. Use for a quick overview or to drill into a specific workflow. For deep structural validation across all workflows, use /n8n-audit instead.
**Rewrite:** Fast read-only dashboard of all n8n workflows. Shows active/inactive status, trigger types, credential gaps, and error handler configuration. Supports drill-down on a single workflow by name or ID. Does NOT run deep validation — use /n8n-audit for that.

### n8n-audit
**Current:** Audit all workflows on the n8n instance. Produces a structured health report with errors, warnings, credential gaps, and action items. Automatically parallelizes across large workflow sets.
**Rewrite:** Deep structural audit of all workflows. Validates every workflow for errors, wiring issues, missing triggers, and credential gaps. Produces prioritized report with action items. Parallelizes in batches of 5 for 11+ workflows.

### n8n-check
**Current:** Test n8n instance connectivity and MCP tool health. Diagnoses connection issues, API key problems, and verifies the instance is ready to build workflows.
**Rewrite:** Test n8n instance connectivity (HTTP + MCP) and API configuration. Runs 6 diagnostic tests covering MCP health, tool access, workflow API, and instance reachability. Run this first when builds fail or MCP tools error.

### n8n-learn
**Current:** Capture and persist learnings from this n8n session into CLAUDE.md and memory. Run after any build, fix, or audit where something new was discovered. Keeps the knowledge base growing.
**Rewrite:** Capture new patterns, failure modes, credential types, or node configs discovered this session. Updates CLAUDE.md and project memory so future builds benefit. Use after sessions that revealed something non-obvious.
