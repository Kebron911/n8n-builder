---
name: n8n-node-configs
description: >
  Ready-to-use node JSON templates, typeVersion table, connections patterns,
  credential keys, expression conventions, workflow settings, and testing
  patterns for building n8n workflows. Invoke at the START of any workflow
  build session — before calling n8n_create_workflow. Contains verbatim configs
  for all common nodes so no MCP lookup is needed. Trigger on: "build a
  workflow", "create a workflow", any request that will result in calling
  n8n_create_workflow or n8n_update_partial_workflow.
---

# n8n Node Configs Reference

Ready-to-use configs for workflow building. All pinned to n8n **v1.76**.

**For node templates, see `COMMON_NODES.md`. For connection patterns, see `CONNECTIONS.md`.**

---

## typeVersion Reference

| Node type | typeVersion |
|-----------|-------------|
| `n8n-nodes-base.telegramTrigger` | `1.2` |
| `n8n-nodes-base.telegram` | `1.2` |
| `n8n-nodes-base.webhook` | `2` |
| `n8n-nodes-base.scheduleTrigger` | `1.2` |
| `n8n-nodes-base.manualTrigger` | `1` |
| `n8n-nodes-base.httpRequest` | `4.2` |
| `n8n-nodes-base.code` | `2` |
| `n8n-nodes-base.set` | `3.4` |
| `n8n-nodes-base.if` | `2.2` |
| `n8n-nodes-base.switch` | `3.2` |
| `n8n-nodes-base.merge` | `3` |
| `n8n-nodes-base.splitInBatches` | `3` |
| `n8n-nodes-base.respondToWebhook` | `1.1` |
| `n8n-nodes-base.filter` | `2` |
| `n8n-nodes-base.aggregate` | `1` |
| `n8n-nodes-base.removeDuplicates` | `1.1` |
| `n8n-nodes-base.wait` | `1.1` |
| `n8n-nodes-base.errorTrigger` | `1` |
| `n8n-nodes-base.executeCommand` | `1` |
| `n8n-nodes-base.executeWorkflow` | `1.1` |
| `n8n-nodes-base.stickyNote` | `1` |
| `n8n-nodes-base.noOp` | `1` |
| `n8n-nodes-base.slack` | `2.3` |
| `n8n-nodes-base.gmail` | `2.1` |
| `n8n-nodes-base.googleSheets` | `4.5` |
| `n8n-nodes-base.googleDrive` | `3` |
| `n8n-nodes-base.googleCalendar` | `1.2` |
| `n8n-nodes-base.googleDocs` | `2` |
| `n8n-nodes-base.airtable` | `2.1` |
| `n8n-nodes-base.postgres` | `2.5` |
| `n8n-nodes-base.supabase` | `1` |
| `@n8n/n8n-nodes-langchain.agent` | `1.7` |
| `@n8n/n8n-nodes-langchain.chatTrigger` | `1.1` |
| `@n8n/n8n-nodes-langchain.lmChatOpenAi` | `1.2` |
| `@n8n/n8n-nodes-langchain.memoryBufferWindow` | `1.3` |
| `@n8n/n8n-nodes-langchain.calculatorTool` | `1` |
| `@n8n/n8n-nodes-langchain.toolHttpRequest` | `1.1` |
| `@n8n/n8n-nodes-langchain.toolSerpApi` | `1` |
| `@n8n/n8n-nodes-langchain.toolWorkflow` | `1.2` |
| `@n8n/n8n-nodes-langchain.outputParserStructured` | `1.2` |
| `@n8n/n8n-nodes-langchain.textClassifier` | `1` |

---

## Expression Conventions

```
$json.fieldName                        — current item field
$json.message.text                     — nested field
$node["NodeName"].json.fieldName       — reference another node
$json.body.fieldName                   — webhook body data
$now                                   — current timestamp (ISO 8601)
$items("NodeName")                     — all items from a node
```

---

## Credential Keys

Credential IDs (`"id": "1"`) are placeholders — user maps real credentials in the n8n UI.

| Node | Credential key |
|------|----------------|
| Telegram / Telegram Trigger | `telegramApi` |
| Slack (API token) | `slackApi` |
| Slack (OAuth2) | `slackOAuth2Api` |
| Gmail | `gmailOAuth2` |
| Google Sheets | `googleSheetsOAuth2Api` |
| Google Drive | `googleDriveOAuth2Api` |
| YouTube | `youTubeOAuth2Api` |
| Google Calendar | `googleCalendarOAuth2Api` |
| Google Docs | `googleDocsOAuth2Api` |
| Notion | `notionApi` |
| Airtable | `airtableTokenApi` |
| Supabase | `supabaseApi` |
| SerpAPI | `serpApi` |
| OpenAI (LangChain) | `openAiApi` |
| Anthropic / Claude | `anthropicApi` |
| GitHub | `githubApi` |
| GitLab | `gitlabApi` |
| Jira (Cloud) | `jiraSoftwareCloudApi` |
| HubSpot | `hubspotAppToken` |
| Salesforce | `salesforceOAuth2Api` |
| Stripe | `stripeApi` |
| Twilio | `twilioApi` |
| Discord (Bot) | `discordBotApi` |
| Discord (Webhook) | `discordWebhookApi` |
| WhatsApp Business | `whatsAppBusinessCloudApi` |
| MySQL | `mySql` |
| PostgreSQL | `postgres` |
| MongoDB | `mongoDb` |
| Redis | `redis` |
| Dropbox | `dropboxApi` |
| AWS | `aws` |
| Mailchimp | `mailchimpApi` |
| SendGrid | `sendGridApi` |
| HTTP Request (Header Auth) | `httpHeaderAuth` |
| HTTP Request (Bearer) | `httpBearerAuth` |
| HTTP Request (Basic Auth) | `httpBasicAuth` |

When in doubt: `get_node("nodes-base.<name>", detail: "standard")` → check `credentials` field.

---

## Workflow Settings

```json
{
  "settings": {
    "executionOrder": "v1",
    "saveManualExecutions": true,
    "saveExecutionProgress": true,
    "executionTimeout": 300,
    "timezone": "America/New_York",
    "errorWorkflow": "vQKuXqX6mzCEGmaE"
  }
}
```

| Setting | Default | When to set |
|---------|---------|-------------|
| `executionOrder` | `"v1"` | Always `"v1"` |
| `executionTimeout` | `-1` | Set for workflows hitting external APIs that may hang |
| `saveExecutionProgress` | `false` | Set `true` for long/complex workflows |
| `timezone` | Instance default | When Schedule Trigger needs a specific timezone |
| `errorWorkflow` | none | Set to error-handler workflow ID for production |

**Production error-handler:** ID `vQKuXqX6mzCEGmaE` — set `settings.errorWorkflow` on production workflows (5+ nodes).

---

## Testing After Activation

**Manual trigger:** `execute_workflow({ workflowId: "ID" })` — verify `finished: true`.

**Webhook:**
- Test URL (editor open): `https://professionalaiassistants.com/n8n/webhook-test/{path}`
- Prod URL (active): `https://professionalaiassistants.com/n8n/webhook/{path}`

**Schedule:** Temporarily set to every minute, activate, wait one execution, restore.

**Interpreting results:**
- `finished: true` + no error → success
- `finished: false` + `data.resultData.error` → check the failed node
- Empty node output → upstream IF/Filter condition didn't match
