---
name: n8n-credentials-expert
description: >
  Guide for configuring credentials in n8n workflow JSON. Covers credential key
  names per node type, placeholder ID conventions, OAuth vs API key patterns,
  and how to look up credential keys for unfamiliar integrations. Use when
  building or fixing workflows that reference credentials, when credential
  validation errors appear, or when the user asks "what credential key does
  node X use". Trigger on: credential errors, "which credential", "credential
  key for", "auth setup", "configure credentials", "OAuth", "API key in n8n",
  or any workflow build/fix involving credential blocks.
---

# n8n Credentials Expert

Reference guide for credential configuration in n8n workflow JSON. Pinned to n8n **v1.76**.

---

## 1. How Credentials Work in n8n Workflow JSON

Every node that calls an external API must include a `credentials` block. The format is:

```json
"credentials": {
  "credentialKeyName": {
    "id": "1",
    "name": "Display Name Here"
  }
}
```

Key points:
- **`credentialKeyName`** (the object key): Must exactly match what the node expects. Wrong names cause silent failures.
- **`"id": "1"`**: Always use `"1"` as a placeholder. This is NOT the real credential ID. The user maps real credentials in the n8n UI after deployment.
- **`"name"`**: Display-only. Use a descriptive name like `"Telegram Bot Token"` or `"Gmail Account"`. This helps the user identify which credential to configure.

Example from a Telegram workflow:
```json
{
  "name": "Send Reply",
  "type": "n8n-nodes-base.telegram",
  "credentials": {
    "telegramApi": { "id": "1", "name": "Telegram Bot Token" }
  }
}
```

---

## 2. Common Credential Keys (Quick Reference)

| Node Type | Credential Key | Auth Type | Notes |
|-----------|----------------|-----------|-------|
| Telegram Trigger | `telegramApi` | API Key | Bot token |
| Telegram | `telegramApi` | API Key | Bot token |
| Slack (bot token) | `slackApi` | API Key | Bot or app token |
| Slack (OAuth) | `slackOAuth2Api` | OAuth2 | Requires OAuth flow |
| Gmail | `gmailOAuth2` | OAuth2 | OAuth required |
| Google Sheets | `googleSheetsOAuth2Api` | OAuth2 | OAuth required |
| Google Drive | `googleDriveOAuth2Api` | OAuth2 | OAuth required |
| Google Calendar | `googleCalendarOAuth2Api` | OAuth2 | OAuth required |
| Google Docs | `googleDocsOAuth2Api` | OAuth2 | OAuth required |
| Notion | `notionApi` | API Key | Internal integration token |
| Airtable (token) | `airtableTokenApi` | API Key | Personal/app token |
| Airtable (OAuth) | `airtableOAuth2Api` | OAuth2 | OAuth flow |
| OpenAI (LangChain) | `openAiApi` | API Key | ChatGPT/GPT-4 key |
| PostgreSQL | `postgres` | Connection | Host, user, password |
| Supabase | `supabaseApi` | API Key | Supabase project key |
| SerpAPI (LangChain) | `serpApi` | API Key | Web search key |
| HTTP Header Auth | `httpHeaderAuth` | Custom | For HTTP Request node |
| HTTP Basic Auth | `httpBasicAuth` | Basic | For HTTP Request node |
| HTTP Digest Auth | `httpDigestAuth` | Digest | For HTTP Request node |
| HTTP Query Auth | `httpQueryAuth` | Query Param | For HTTP Request node |

---

## 3. How to Look Up Unknown Credential Keys

If a node is not in the table above, follow this decision tree:

### Step 1: Check This Skill
Review the table in section 2 first.

### Step 2: Use MCP Tools (if table lookup fails)
Call `get_node("nodes-base.nodeName", detail: "standard")` — this returns the full node config including a `credentials` field that lists what keys it expects:

```bash
get_node("nodes-base.hubspot", detail: "standard")
```

Response will include something like:
```json
"credentials": [
  { "name": "hubspotApi", "required": true }
]
```

### Step 3: Search Real Templates
If `get_node` doesn't show it clearly, use `search_templates("nodeName")` and extract the credential block from a real, working workflow:

```bash
search_templates("airtable")
```

Look at one of the returned templates and inspect the `credentials` block.

### Step 4: Check n8n Documentation
If all else fails, visit [docs.n8n.io](https://docs.n8n.io) and search for the node — the credential section documents what key names are expected.

---

## 4. OAuth vs API Key Patterns

### API Key Nodes
- Single token or key stored in plaintext (securely, in n8n's vault)
- Key names end in `Api` or `Api` (e.g., `telegramApi`, `openAiApi`, `notionApi`)
- User provides the key directly in the n8n UI
- Example:
  ```json
  "credentials": {
    "telegramApi": { "id": "1", "name": "Telegram Bot Token" }
  }
  ```

### OAuth2 Nodes
- Require user to authorize via OAuth flow (redirect to provider's login)
- Key names end in `OAuth2Api` or similar (e.g., `gmailOAuth2`, `googleSheetsOAuth2Api`, `slackOAuth2Api`)
- User cannot paste a token — they must click "Authenticate" in n8n UI
- Example:
  ```json
  "credentials": {
    "gmailOAuth2": { "id": "1", "name": "Gmail Account" }
  }
  ```

### Hybrid Nodes (Support Both)
Some integrations offer BOTH authentication methods:
- **Slack**: `slackApi` (bot token) OR `slackOAuth2Api` (OAuth)
- **Airtable**: `airtableTokenApi` (API token) OR `airtableOAuth2Api` (OAuth)
- Use whichever fits the user's security model

### HTTP Request Node (Special Case)
The HTTP Request node is generic and supports four auth methods via the `authentication` parameter:
- `"authentication": "none"` — no auth
- `"authentication": "headerAuth"` + `"credentials": { "httpHeaderAuth": {...} }` — custom header (e.g., `Authorization: Bearer <token>`)
- `"authentication": "basicAuth"` + `"credentials": { "httpBasicAuth": {...} }` — username:password (Base64)
- `"authentication": "digestAuth"` + `"credentials": { "httpDigestAuth": {...} }` — HTTP Digest (rarely used)
- `"authentication": "queryAuth"` + `"credentials": { "httpQueryAuth": {...} }` — API key in query string (e.g., `?api_key=<token>`)

---

## 5. Credential Validation Errors and Fixes

### Error: "Unknown credential type"
**Cause:** Credential key name is wrong (e.g., `telegram` instead of `telegramApi`).
**Fix:**
1. Check the table in section 2
2. If not listed, use `get_node` (section 3, step 2)
3. Correct the key name and re-validate

### Error: "Credentials not found"
**Cause:** Placeholder ID `"id": "1"` was not mapped in the n8n UI.
**Fix:**
1. Verify you used `"id": "1"` in the workflow JSON
2. User must click the credential field in the node UI and select/create a real credential
3. The n8n platform maps the real credential ID internally after user selection

### Error: "Authentication failed" or "Invalid credentials"
**Cause:** Real credential exists but is expired or has wrong secret.
**Fix:**
1. Check that the user's API key/token is still valid (check provider's settings)
2. Regenerate the token if needed
3. Update the credential in n8n UI
4. Test workflow again

### Error: "Cannot read property 'X' of undefined" (at runtime)
**Cause:** Credential was not properly loaded — user skipped configuring it, or the key name is still wrong.
**Fix:**
1. Re-run validation: `n8n_validate_workflow` with profile `"runtime"`
2. If validation passes but execution fails, credential mapping failed in UI — user should re-select the credential
3. Double-check key name matches exactly (case-sensitive)

---

## 6. Placeholder Convention (Workflow Generation)

When generating workflow JSON:

### Rule 1: Always Use `"id": "1"`
```json
"credentials": {
  "telegramApi": { "id": "1", "name": "Telegram Bot Token" }
}
```
This is a standard placeholder. n8n ignores the placeholder ID and uses the real credential the user selects in the UI.

### Rule 2: Use Descriptive `name` Field
The `name` is what the user sees in the UI. Make it clear which credential is which:
- Good: `"name": "Telegram Bot Token"`, `"name": "Gmail Account"`, `"name": "Airtable API Key"`
- Bad: `"name": "credential1"`, `"name": "cred"`, `"name": "auth"`

### Rule 3: Report All Credentials in Build Report
After creating a workflow, always list all credentials that need configuration:

```
Credentials to configure:
1. Telegram Bot Token (node: Telegram Trigger, key: telegramApi)
2. Gmail Account (node: Send Email, key: gmailOAuth2)
3. Google Sheets Account (node: Append Row, key: googleSheetsOAuth2Api)
```

User knows exactly what to set up in the n8n UI.

---

## 7. Practical Examples

### Example 1: Telegram → Process → Slack Workflow

```json
{
  "nodes": [
    {
      "name": "Telegram Trigger",
      "type": "n8n-nodes-base.telegramTrigger",
      "credentials": {
        "telegramApi": { "id": "1", "name": "Telegram Bot Token" }
      }
    },
    {
      "name": "Send to Slack",
      "type": "n8n-nodes-base.slack",
      "credentials": {
        "slackApi": { "id": "1", "name": "Slack Bot Token" }
      }
    }
  ]
}
```

Build report:
```
Credentials to configure:
1. Telegram Bot Token (key: telegramApi, type: API Key)
2. Slack Bot Token (key: slackApi, type: API Key)
```

### Example 2: Gmail with OAuth2

```json
{
  "name": "Send Email",
  "type": "n8n-nodes-base.gmail",
  "credentials": {
    "gmailOAuth2": { "id": "1", "name": "Gmail Account" }
  }
}
```

Note: `gmailOAuth2` (not `gmailApi`). User must click "Authenticate" in the n8n UI and grant permission to send emails.

### Example 3: HTTP Request with Custom Header

```json
{
  "name": "Call External API",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://api.example.com/data",
    "method": "GET",
    "authentication": "headerAuth"
  },
  "credentials": {
    "httpHeaderAuth": { "id": "1", "name": "API Key Header" }
  }
}
```

User provides the header key/value in the credential form (e.g., header name `Authorization`, value `Bearer <token>`).

---

## 8. Testing Credentials After Configuration

After the user configures credentials in the n8n UI:

1. **Manual trigger test**: Use `execute_workflow` to test with the manual trigger.
2. **Check for auth errors**: If execution fails with auth errors, the credential is misconfigured.
3. **Validate first**: Run `n8n_validate_workflow` with profile `"runtime"` — it will catch missing/invalid credentials before execution.

If a credential fails validation or execution:
- Ask user to verify the API key/token is valid (check provider account settings)
- Ask user to re-enter the credential in the n8n UI (sometimes re-authenticating fixes OAuth issues)
- If still failing, report the exact error message and guide troubleshooting

---

## 9. Reference: Credential Keys by Auth Type

### Single-Key API Integrations
- `telegramApi` — Telegram Bot token
- `notionApi` — Notion internal integration secret
- `openAiApi` — OpenAI API key
- `serpApi` — SerpAPI key

### Multi-Field Connection Strings
- `postgres` — Host, port, user, password, database
- `supabaseApi` — Project URL, API key

### Resource Locator (RL) Fields
Some credential nodes use `__rl` objects for fields. See the n8n-json-checker skill for full details. Example:
```json
"documentId": { "__rl": true, "value": "SPREADSHEET_ID", "mode": "id" }
```

---

## 10. When to Use This Skill

Trigger this skill when:
- Building a workflow and uncertain about credential key names
- Credential validation errors appear during `n8n_validate_workflow`
- User asks: "What credential does [node] use?" or "How do I set up auth for [service]?"
- A workflow build fails with "Unknown credential type" or similar
- You need to patch a workflow with wrong credential keys

---

## Additional Resources

- n8n Node Docs: [docs.n8n.io](https://docs.n8n.io)
- Credential lookup tool: Use `get_node("nodes-base.nodeName", detail: "standard")` in MCP
- Real workflow examples: Use `search_templates("keyword")` to see production credentials
- n8n-node-configs skill: Contains verbatim configs for 20+ common nodes including credential blocks
