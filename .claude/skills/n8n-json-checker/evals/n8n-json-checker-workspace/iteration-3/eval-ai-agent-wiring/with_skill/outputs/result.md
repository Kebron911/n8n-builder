## n8n Workflow Check

### Errors (must fix before activating)

1. **OpenAI Chat Model** — Wrong node type: `@n8n/n8n-nodes-langchain.lmChatOpenAi` does not exist. The correct type is `@n8n/n8n-nodes-langchain.lmOpenAi`. Using the wrong type will cause the node to fail to load. — Change `"type"` to `"@n8n/n8n-nodes-langchain.lmOpenAi"`.

2. **OpenAI Chat Model** — Wrong connection type: the node connects to AI Agent via `"main"`, but LangChain sub-nodes must use `ai_languageModel` as the connection key and type. Using `main` means the language model is never actually wired to the agent — the agent will have no LLM and will fail at runtime. — Replace the connection entry:
   ```json
   "OpenAI Chat Model": {
     "ai_languageModel": [[{ "node": "AI Agent", "type": "ai_languageModel", "index": 0 }]]
   }
   ```

### Warnings (review, may be acceptable)

1. **OpenAI Chat Model** — `typeVersion` is `1`, but the recommended version is `1.2`. Older versions may be missing features or fixes. — Update to `"typeVersion": 1.2`.

2. **Webhook** — `responseMode` is set to `"responseNode"` but there is no `respondToWebhook` node in the workflow. The webhook will never send a response back to the caller. — Add a `respondToWebhook` node downstream (after the AI Agent) and wire it as the final step.

3. **Webhook + AI Agent** — The workflow uses `responseMode: "responseNode"` with an AI Agent. AI completions can exceed 100 seconds. On n8n Cloud, requests exceeding this limit receive a Cloudflare 524 timeout error. — For long-running AI operations, consider a two-webhook pattern: one webhook to receive and queue the request, and a second to poll for the result. On self-hosted n8n this is less critical but still worth noting.

### Clean ✓
- nodeType prefix format — no issues found (all built-in and LangChain types use correct prefixes)
- Resource locator fields (`__rl`) — no fields requiring `__rl` format present
- Required fields per node — webhook and agent nodes have required fields present
- Expression syntax — no unbalanced braces or invalid node references
- Credential key names — `openAiApi` is correct for the OpenAI LangChain node
- Duplicate webhook paths — only one webhook node present
- Error handling — workflow has fewer than 5 nodes, no error trigger required

---

**MCP validation note:** The `n8n_validate_workflow` MCP tool was not available in this environment. The above findings are from static analysis only. Runtime validation (which catches schema-level issues inside node parameters) was skipped.

---

Want me to apply these fixes directly to the workflow?
