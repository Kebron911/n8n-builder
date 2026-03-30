## n8n Workflow Check

### Errors (must fix before activating)

1. **OpenAI Chat Model** — Wrong connection type used for LangChain sub-node — The node is connected via `"main"` instead of `"ai_languageModel"`. LangChain sub-nodes (LLMs, tools, memory) must use the sub-node connection type as the connection key. The AI Agent will have no language model attached and will fail at runtime.

   Fix: Change the connections entry from:
   ```json
   "OpenAI Chat Model": {
     "main": [[{ "node": "AI Agent", "type": "main", "index": 0 }]]
   }
   ```
   to:
   ```json
   "OpenAI Chat Model": {
     "ai_languageModel": [[{ "node": "AI Agent", "type": "ai_languageModel", "index": 0 }]]
   }
   ```

### Warnings (review, may be acceptable)

1. **Webhook** — Missing `respondToWebhook` node — The Webhook uses `"responseMode": "responseNode"` but no `respondToWebhook` node exists downstream. Without it, the webhook will never send a response to callers, leaving requests hanging until timeout.

2. **Webhook + AI Agent** — Potential cloud timeout risk — A `responseNode` webhook paired with an AI Agent is a long-running operation. n8n Cloud enforces a 100-second timeout; requests exceeding this get a Cloudflare 524 error. For long-running AI tasks, consider using two separate webhooks: one to kick off the job (return immediate acknowledgment) and one to poll for the result.

3. **Credential portability** — Credential IDs in this workflow are instance-specific. If you import this workflow to a different n8n instance, you'll need to re-link all credentials in the UI (affected node: OpenAI Chat Model).

### MCP Validation
MCP validation skipped (static analysis only).

### Clean ✓

- nodeType formats — all valid
- Resource locator fields (`__rl`) — no affected nodes present
- Required fields per node — all present
- typeVersion — Webhook (`2`), AI Agent (`1.7`) match expected versions
- Credential key names — `openAiApi` is correct
- Expression syntax — `={{ $json.body.message }}` is valid
- Duplicate webhook paths — only one webhook
- Community nodes — none present
- Error handling — fewer than 5 nodes, threshold not reached

---

Want me to apply these fixes directly to the workflow?
