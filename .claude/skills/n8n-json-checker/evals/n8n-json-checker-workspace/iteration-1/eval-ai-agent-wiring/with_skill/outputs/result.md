## n8n Workflow Check

### Errors (must fix before activating)

1. **OpenAI Chat Model** — Wrong connection type used for LangChain sub-node — The `connections` object wires `OpenAI Chat Model` via `"main"`, but LangChain sub-nodes must use `"ai_languageModel"` as both the connection key and the `"type"` value. Using `"main"` means the language model will never be attached to the AI Agent, causing the agent to have no LLM at runtime.

   Fix from:
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

1. **Webhook** — `responseMode` is `"responseNode"` but no `respondToWebhook` node exists in the workflow — The webhook will hang indefinitely waiting for a response node. Add a `n8n-nodes-base.respondToWebhook` node downstream of the AI Agent.

### Clean ✓

- nodeType format — all node `type` values use correct prefixes
- Resource locator fields (`__rl`) — no applicable nodes
- Required fields per node — all nodes have essential parameters
- typeVersion — Webhook (`2`), AI Agent (`1.7`) match expected versions
- Credential key names — `openAiApi` is correct
- Expression syntax — `={{ $json.body.message }}` is balanced and valid
