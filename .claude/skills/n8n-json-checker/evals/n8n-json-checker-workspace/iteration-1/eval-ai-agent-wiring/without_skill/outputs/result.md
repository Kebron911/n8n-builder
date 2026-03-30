## Workflow Review: AI Support Agent

The workflow has **2 critical issues** and 1 informational note.

---

### Issue 1 (Critical): OpenAI Chat Model wired with the wrong connection type

`OpenAI Chat Model` is a LangChain sub-node. It must connect to the AI Agent via the `ai_languageModel` connection type, not `main`. With `main`, the LLM is never attached to the agent — the agent has no language model and will fail at runtime.

**Fix:**
```json
"OpenAI Chat Model": {
  "ai_languageModel": [[{ "node": "AI Agent", "type": "ai_languageModel", "index": 0 }]]
}
```

---

### Issue 2 (Critical): No "Respond to Webhook" node

The Webhook is configured with `"responseMode": "responseNode"`, which requires a downstream `Respond to Webhook` node. Without it, every incoming webhook call will hang.

---

### Issue 3 (Informational): Agent is stateless — no memory node

No memory sub-node is connected to the AI Agent. For a support agent this is usually undesirable.
