## n8n Workflow Check

### Errors (must fix before activating)

1. **OpenAI Chat Model** — Wrong connection type used. The node connects via `"main"` to the AI Agent, but LangChain sub-nodes must connect via `ai_languageModel`. A `main` connection will be silently ignored and the AI Agent will have no language model attached, causing it to fail at runtime.

   **Fix:** Change the connection entry from:
   ```json
   "OpenAI Chat Model": {
     "main": [[{ "node": "AI Agent", "type": "main", "index": 0 }]]
   }
   ```
   To:
   ```json
   "OpenAI Chat Model": {
     "ai_languageModel": [[{ "node": "AI Agent", "type": "ai_languageModel", "index": 0 }]]
   }
   ```

### Warnings (review, may be acceptable)

1. **Webhook** — `responseMode` is `"responseNode"` but no `respondToWebhook` node exists in the workflow. The webhook will never send a response back to the caller, leaving the HTTP connection hanging until it times out.

   **Fix:** Add a `respondToWebhook` node downstream of the AI Agent and wire it as the final step.

2. **Webhook + AI Agent** — This workflow uses `responseMode: "responseNode"` with an AI Agent, which is a long-running operation. n8n Cloud enforces a 100-second timeout on webhook responses — requests exceeding this will receive a Cloudflare 524 error. For long-running AI workflows, consider a two-webhook pattern: one webhook to accept the job and return immediately, and a second webhook or polling mechanism to return results when ready.

### Clean ✓
- nodeType format — no issues found
- Resource locator fields (`__rl`) — no issues found
- Required fields per node — no issues found
- typeVersion — no issues found
- Credential key names — no issues found
- Expression syntax — no issues found

---

Want me to apply these fixes directly to the workflow?
