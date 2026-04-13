# Common Node Configs

Use verbatim — no MCP lookup needed.

## Table of Contents

**Triggers:** Manual Trigger, Telegram Trigger, Webhook Trigger, Schedule Trigger, Error Trigger, Chat Trigger

**Core Logic:** HTTP Request, Code Node, Filter, Aggregate, Remove Duplicates, Edit Fields (Set), IF, Switch, Merge, Wait, Respond to Webhook, Split In Batches, NoOp

**Integrations:** Slack, Gmail, Google Sheets, Google Calendar, Google Docs, Airtable, PostgreSQL, Supabase, Notion

**AI/LangChain:** AI Agent, OpenAI Chat Model, Window Buffer Memory, Calculator Tool, HTTP Request Tool, Structured Output Parser, Chat Trigger, SerpAPI Tool, Workflow Tool

**Workflow Tools:** Execute Workflow

---

## Manual Trigger
```json
{
  "name": "When clicking 'Test workflow'",
  "type": "n8n-nodes-base.manualTrigger",
  "typeVersion": 1,
  "position": [250, 300],
  "parameters": {}
}
```

## Telegram Trigger
```json
{
  "name": "Telegram Trigger",
  "type": "n8n-nodes-base.telegramTrigger",
  "typeVersion": 1.2,
  "position": [250, 300],
  "parameters": {
    "updates": ["message"],
    "additionalFields": {}
  },
  "credentials": {
    "telegramApi": { "id": "1", "name": "Telegram account" }
  }
}
```

## Telegram Send Message
```json
{
  "name": "Send Reply",
  "type": "n8n-nodes-base.telegram",
  "typeVersion": 1.2,
  "position": [500, 300],
  "parameters": {
    "resource": "message",
    "operation": "sendMessage",
    "chatId": { "__rl": true, "value": "={{ $json.message.chat.id }}", "mode": "expression" },
    "text": "={{ $json.message.text }}",
    "additionalFields": {}
  },
  "credentials": {
    "telegramApi": { "id": "1", "name": "Telegram account" }
  }
}
```

## Webhook Trigger (POST, respond manually)
```json
{
  "name": "Webhook",
  "type": "n8n-nodes-base.webhook",
  "typeVersion": 2,
  "position": [250, 300],
  "parameters": {
    "httpMethod": "POST",
    "path": "my-webhook",
    "responseMode": "responseNode"
  }
}
```

## Schedule Trigger
```json
{
  "name": "Schedule Trigger",
  "type": "n8n-nodes-base.scheduleTrigger",
  "typeVersion": 1.2,
  "position": [250, 300],
  "parameters": {
    "rule": {
      "interval": [{ "field": "hours", "hoursInterval": 1 }]
    }
  }
}
```

## Error Trigger
```json
{
  "name": "Error Trigger",
  "type": "n8n-nodes-base.errorTrigger",
  "typeVersion": 1,
  "position": [250, 300],
  "parameters": {}
}
```
Production error-handler ID: `vQKuXqX6mzCEGmaE`. Set `settings.errorWorkflow` on production workflows to point to it.

## HTTP Request
```json
{
  "name": "HTTP Request",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [500, 300],
  "parameters": {
    "method": "GET",
    "url": "https://api.example.com/endpoint",
    "authentication": "none"
  }
}
```

## Code Node (JavaScript)
```json
{
  "name": "Code",
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "position": [500, 300],
  "parameters": {
    "jsCode": "return items.map(item => ({ json: { ...item.json } }));"
  }
}
```
JS patterns:
```js
return [{ json: { result: value } }];                                  // single output
return items.map(item => ({ json: { ...item.json, newField: val } })); // transform all
const data = $input.first().json;                                      // access input
```

## Filter
```json
{
  "name": "Filter",
  "type": "n8n-nodes-base.filter",
  "typeVersion": 2,
  "position": [500, 300],
  "parameters": {
    "conditions": {
      "options": { "caseSensitive": true, "leftValue": "" },
      "conditions": [
        {
          "id": "condition_0",
          "leftValue": "={{ $json.status }}",
          "rightValue": "active",
          "operator": { "type": "string", "operation": "equals" }
        }
      ],
      "combinator": "and"
    },
    "options": {}
  }
}
```
One output — items that fail are dropped (unlike IF which has two outputs).

## Aggregate
```json
{
  "name": "Aggregate",
  "type": "n8n-nodes-base.aggregate",
  "typeVersion": 1,
  "position": [700, 300],
  "parameters": {
    "aggregate": "aggregateAllItemData",
    "destinationFieldName": "data",
    "options": {}
  }
}
```
Modes: `aggregateAllItemData`, `aggregateIndividualFields` (add `fieldsToAggregate`).

## Remove Duplicates
```json
{
  "name": "Remove Duplicates",
  "type": "n8n-nodes-base.removeDuplicates",
  "typeVersion": 1.1,
  "position": [700, 300],
  "parameters": {
    "compare": "allFields",
    "options": {}
  }
}
```
`compare`: `"allFields"` or `"selectedFields"` (add `"fieldsToCompare": { "fields": [{ "fieldName": "id" }] }`).

## Edit Fields (Set)
```json
{
  "name": "Edit Fields",
  "type": "n8n-nodes-base.set",
  "typeVersion": 3.4,
  "position": [500, 300],
  "parameters": {
    "mode": "manual",
    "fields": {
      "values": [
        { "name": "newField", "stringValue": "={{ $json.existingField }}" },
        { "name": "staticField", "stringValue": "hello" }
      ]
    },
    "options": {}
  }
}
```

## IF
```json
{
  "name": "IF",
  "type": "n8n-nodes-base.if",
  "typeVersion": 2.2,
  "position": [500, 300],
  "parameters": {
    "conditions": {
      "options": { "caseSensitive": true, "leftValue": "" },
      "conditions": [
        {
          "id": "condition_0",
          "leftValue": "={{ $json.field }}",
          "rightValue": "expected",
          "operator": { "type": "string", "operation": "equals" }
        }
      ],
      "combinator": "and"
    },
    "options": {}
  }
}
```
Output 0 = true, Output 1 = false.

## Switch
```json
{
  "name": "Switch",
  "type": "n8n-nodes-base.switch",
  "typeVersion": 3.2,
  "position": [500, 300],
  "parameters": {
    "rules": {
      "values": [
        {
          "outputKey": "Route 0",
          "conditions": {
            "options": { "caseSensitive": true, "leftValue": "" },
            "conditions": [
              {
                "leftValue": "={{ $json.type }}",
                "rightValue": "typeA",
                "operator": { "type": "string", "operation": "equals" }
              }
            ],
            "combinator": "and"
          }
        }
      ]
    },
    "options": {}
  }
}
```
Each rule → output index (0, 1, 2…). Fallback = last index.

## Merge
```json
{
  "name": "Merge",
  "type": "n8n-nodes-base.merge",
  "typeVersion": 3,
  "position": [700, 300],
  "parameters": {
    "mode": "combine",
    "combinationMode": "mergeByPosition",
    "options": {}
  }
}
```
Modes: `append`, `combine` (`mergeByPosition`/`mergeByFields`), `chooseBranch`.

## Wait
```json
{
  "name": "Wait",
  "type": "n8n-nodes-base.wait",
  "typeVersion": 1.1,
  "position": [700, 300],
  "parameters": {
    "resume": "timeInterval",
    "amount": 5,
    "unit": "seconds",
    "options": {}
  }
}
```
`resume`: `"timeInterval"`, `"webhook"`, `"form"`. `unit`: `"seconds"`, `"minutes"`, `"hours"`, `"days"`.

## Respond to Webhook
```json
{
  "name": "Respond to Webhook",
  "type": "n8n-nodes-base.respondToWebhook",
  "typeVersion": 1.1,
  "position": [900, 300],
  "parameters": {
    "respondWith": "json",
    "responseBody": "={{ $json }}",
    "options": {}
  }
}
```
Use with Webhook trigger `"responseMode": "responseNode"`. `respondWith`: `json`, `text`, `noData`, `redirect`.

## Split In Batches
```json
{
  "name": "Split In Batches",
  "type": "n8n-nodes-base.splitInBatches",
  "typeVersion": 3,
  "position": [500, 300],
  "parameters": {
    "batchSize": 10,
    "options": {}
  }
}
```
Output 0 = loop body, Output 1 = done.

## NoOp
```json
{
  "name": "No Operation",
  "type": "n8n-nodes-base.noOp",
  "typeVersion": 1,
  "position": [700, 500],
  "parameters": {}
}
```

## Slack — Send Message
```json
{
  "name": "Slack",
  "type": "n8n-nodes-base.slack",
  "typeVersion": 2.3,
  "position": [700, 300],
  "parameters": {
    "resource": "message",
    "operation": "post",
    "channel": { "__rl": true, "value": "#general", "mode": "name" },
    "text": "={{ $json.message }}",
    "otherOptions": {}
  },
  "credentials": {
    "slackApi": { "id": "1", "name": "Slack account" }
  }
}
```
`channel` modes: `"name"` (`#channel`), `"id"`, `"expression"`. OAuth2: use `slackOAuth2Api`.

## Gmail — Send Email
```json
{
  "name": "Gmail",
  "type": "n8n-nodes-base.gmail",
  "typeVersion": 2.1,
  "position": [700, 300],
  "parameters": {
    "resource": "message",
    "operation": "send",
    "sendTo": { "__rl": true, "value": "={{ $json.email }}", "mode": "expression" },
    "subject": "={{ $json.subject }}",
    "emailType": "text",
    "message": "={{ $json.body }}",
    "options": {}
  },
  "credentials": {
    "gmailOAuth2": { "id": "1", "name": "Gmail account" }
  }
}
```
`emailType`: `"text"` or `"html"` (change `message` key to `html` for HTML).

## Google Sheets — Append Row
```json
{
  "name": "Google Sheets",
  "type": "n8n-nodes-base.googleSheets",
  "typeVersion": 4.5,
  "position": [700, 300],
  "parameters": {
    "resource": "sheet",
    "operation": "append",
    "documentId": { "__rl": true, "value": "SPREADSHEET_ID", "mode": "id" },
    "sheetName": { "__rl": true, "value": "gid=0", "mode": "list", "cachedResultName": "Sheet1" },
    "columns": {
      "mappingMode": "autoMapInputData",
      "value": {},
      "matchingColumns": [],
      "schema": []
    },
    "options": {}
  },
  "credentials": {
    "googleSheetsOAuth2Api": { "id": "1", "name": "Google Sheets account" }
  }
}
```
Read: `operation: "read"` + `"filtersUI": { "values": [] }`. Update: `operation: "update"` + `matchingColumns`.

## AI Agent (LangChain)
```json
{
  "name": "AI Agent",
  "type": "@n8n/n8n-nodes-langchain.agent",
  "typeVersion": 1.7,
  "position": [500, 300],
  "parameters": {
    "text": "={{ $json.message }}",
    "options": {}
  }
}
```

## OpenAI Chat Model (sub-node)
```json
{
  "name": "OpenAI Chat Model",
  "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
  "typeVersion": 1.2,
  "position": [500, 500],
  "parameters": {
    "model": "gpt-4o-mini",
    "options": {}
  },
  "credentials": {
    "openAiApi": { "id": "1", "name": "OpenAI account" }
  }
}
```
Connect via `ai_languageModel`. Models: `"gpt-4o"`, `"gpt-4o-mini"`, `"gpt-4-turbo"`. Also works for DeepSeek/other OpenAI-compatible APIs — point to their API base URL in credentials.

## Window Buffer Memory (sub-node)
```json
{
  "name": "Window Buffer Memory",
  "type": "@n8n/n8n-nodes-langchain.memoryBufferWindow",
  "typeVersion": 1.3,
  "position": [700, 500],
  "parameters": {
    "sessionKey": "={{ $json.sessionId }}",
    "contextWindowLength": 10
  }
}
```
Connect via `ai_memory`.

## Calculator Tool (sub-node)
```json
{
  "name": "Calculator",
  "type": "@n8n/n8n-nodes-langchain.calculatorTool",
  "typeVersion": 1,
  "position": [300, 500],
  "parameters": {}
}
```
Connect via `ai_tool`.

## HTTP Request Tool (sub-node)
```json
{
  "name": "HTTP Request Tool",
  "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
  "typeVersion": 1.1,
  "position": [500, 500],
  "parameters": {
    "name": "search_api",
    "description": "Search an external API. Input should be a search query string.",
    "method": "GET",
    "url": "https://api.example.com/search",
    "sendQuery": true,
    "parametersQuery": {
      "values": [{ "name": "q", "valueProvider": "fieldValue", "value": "" }]
    }
  }
}
```
Connect via `ai_tool`.

## Structured Output Parser (sub-node)
```json
{
  "name": "Structured Output Parser",
  "type": "@n8n/n8n-nodes-langchain.outputParserStructured",
  "typeVersion": 1.2,
  "position": [700, 500],
  "parameters": {
    "schema": {
      "type": "object",
      "properties": {
        "result": { "type": "string", "description": "The main result" },
        "confidence": { "type": "number", "description": "Confidence score 0-1" }
      },
      "required": ["result"]
    }
  }
}
```
Connect via `ai_outputParser`.

## Chat Trigger (AI workflows)
```json
{
  "name": "When chat message received",
  "type": "@n8n/n8n-nodes-langchain.chatTrigger",
  "typeVersion": 1.1,
  "position": [250, 300],
  "parameters": {
    "options": {}
  }
}
```
No credentials needed. Connects via `main` to AI Agent. `options` supports `responseMode`, `allowedOrigins`, `loadPreviousSession`.

## Google Calendar — Get Events
```json
{
  "name": "Google Calendar",
  "type": "n8n-nodes-base.googleCalendar",
  "typeVersion": 1.2,
  "position": [500, 300],
  "parameters": {
    "operation": "getAll",
    "calendar": { "__rl": true, "value": "primary", "mode": "list", "cachedResultName": "primary" },
    "options": {
      "timeMin": "={{ $now.toUTC() }}",
      "timeMax": "={{ $now.plus(7, 'days').toUTC() }}",
      "singleEvents": true,
      "orderBy": "startTime"
    }
  },
  "credentials": {
    "googleCalendarOAuth2Api": { "id": "1", "name": "Google Calendar account" }
  }
}
```

## Google Calendar — Create Event
```json
{
  "name": "Create Calendar Event",
  "type": "n8n-nodes-base.googleCalendar",
  "typeVersion": 1.2,
  "position": [700, 300],
  "parameters": {
    "calendar": { "__rl": true, "value": "primary", "mode": "list", "cachedResultName": "primary" },
    "start": "={{ $json.startTime }}",
    "end": "={{ $json.endTime }}",
    "additionalFields": {
      "summary": "={{ $json.title }}",
      "description": "={{ $json.description }}",
      "attendees": ["={{ $json.attendeeEmail }}"],
      "conferenceDataUi": {
        "conferenceDataValues": { "conferenceSolution": "hangoutsMeet" }
      }
    }
  },
  "credentials": {
    "googleCalendarOAuth2Api": { "id": "1", "name": "Google Calendar account" }
  }
}
```
`start`/`end` must be ISO 8601 strings. `attendees` is an array of email strings.

## Google Docs — Get Document
```json
{
  "name": "Google Docs",
  "type": "n8n-nodes-base.googleDocs",
  "typeVersion": 2,
  "position": [500, 300],
  "parameters": {
    "operation": "get",
    "documentURL": "DOCUMENT_ID_OR_URL"
  },
  "credentials": {
    "googleDocsOAuth2Api": { "id": "1", "name": "Google Docs account" }
  }
}
```
Returns document content as plain text in `$json.body`. Use `operation: "update"` + `actionsUi` to append/replace content.

## Airtable — Create Record
```json
{
  "name": "Airtable",
  "type": "n8n-nodes-base.airtable",
  "typeVersion": 2.1,
  "position": [500, 300],
  "parameters": {
    "operation": "create",
    "base": { "__rl": true, "value": "BASE_ID", "mode": "list", "cachedResultName": "My Base" },
    "table": { "__rl": true, "value": "TABLE_ID", "mode": "list", "cachedResultName": "My Table" },
    "columns": {
      "mappingMode": "autoMapInputData",
      "value": {},
      "schema": []
    }
  },
  "credentials": {
    "airtableTokenApi": { "id": "1", "name": "Airtable account" }
  }
}
```
`operation`: `"create"`, `"read"`, `"update"`, `"delete"`. `base`/`table` require `__rl`. Field names in `columns.value` must exactly match Airtable column names.

## PostgreSQL — Select
```json
{
  "name": "Postgres",
  "type": "n8n-nodes-base.postgres",
  "typeVersion": 2.5,
  "position": [500, 300],
  "parameters": {
    "operation": "select",
    "schema": { "__rl": true, "value": "public", "mode": "list", "cachedResultName": "public" },
    "table": { "__rl": true, "value": "my_table", "mode": "list", "cachedResultName": "my_table" },
    "where": {
      "values": [{ "column": "id", "value": "={{ $json.id }}" }]
    },
    "options": {}
  },
  "credentials": {
    "postgres": { "id": "1", "name": "Postgres account" }
  }
}
```

## PostgreSQL — Insert
```json
{
  "name": "Postgres Insert",
  "type": "n8n-nodes-base.postgres",
  "typeVersion": 2.5,
  "position": [700, 300],
  "parameters": {
    "operation": "insert",
    "schema": { "__rl": true, "value": "public", "mode": "list", "cachedResultName": "public" },
    "table": { "__rl": true, "value": "my_table", "mode": "list", "cachedResultName": "my_table" },
    "columns": {
      "mappingMode": "autoMapInputData",
      "value": {},
      "schema": []
    },
    "options": {}
  },
  "credentials": {
    "postgres": { "id": "1", "name": "Postgres account" }
  }
}
```
`operation`: `"select"`, `"insert"`, `"update"`, `"delete"`, `"executeQuery"`. Both `schema` and `table` require `__rl`.

## Supabase — Get All Rows
```json
{
  "name": "Supabase",
  "type": "n8n-nodes-base.supabase",
  "typeVersion": 1,
  "position": [500, 300],
  "parameters": {
    "tableId": "my_table",
    "operation": "getAll"
  },
  "credentials": {
    "supabaseApi": { "id": "1", "name": "Supabase account" }
  }
}
```

## Supabase — Create Row
```json
{
  "name": "Supabase Create",
  "type": "n8n-nodes-base.supabase",
  "typeVersion": 1,
  "position": [700, 300],
  "parameters": {
    "tableId": "my_table",
    "fieldsUi": {
      "fieldValues": [
        { "fieldId": "field1", "fieldValue": "={{ $json.field1 }}" },
        { "fieldId": "field2", "fieldValue": "={{ $json.field2 }}" }
      ]
    }
  },
  "credentials": {
    "supabaseApi": { "id": "1", "name": "Supabase account" }
  }
}
```
`operation`: `"create"`, `"getAll"`, `"get"`, `"update"`, `"delete"`. `fieldId` must match exact Supabase column names.

## SerpAPI Tool (sub-node)
```json
{
  "name": "SerpAPI",
  "type": "@n8n/n8n-nodes-langchain.toolSerpApi",
  "typeVersion": 1,
  "position": [500, 500],
  "parameters": {
    "options": {}
  },
  "credentials": {
    "serpApi": { "id": "1", "name": "SerpAPI account" }
  }
}
```
Connect via `ai_tool`. Gives AI Agent live web search capability.

## Workflow Tool (sub-node — call another workflow as a tool)
```json
{
  "name": "Call Sub-Workflow",
  "type": "@n8n/n8n-nodes-langchain.toolWorkflow",
  "typeVersion": 1.2,
  "position": [700, 500],
  "parameters": {
    "name": "tool_name",
    "description": "Describe when and how the agent should use this tool.",
    "workflowId": { "__rl": true, "value": "WORKFLOW_ID", "mode": "id" },
    "fields": { "values": [] }
  }
}
```
Connect via `ai_tool`. `name` must be snake_case (no spaces). `fields.values` passes named inputs to the sub-workflow. Use `jsonSchemaExample` for complex input schemas.

## Execute Workflow
```json
{
  "name": "Execute Workflow",
  "type": "n8n-nodes-base.executeWorkflow",
  "typeVersion": 1.1,
  "position": [700, 300],
  "parameters": {
    "workflowId": { "__rl": true, "value": "WORKFLOW_ID", "mode": "id" },
    "mode": "each",
    "options": {}
  }
}
```
`mode`: `"each"` (one execution per input item) or `"once"` (single execution, all items passed). Connects via `main`.

## Notion — Create Database Item
```json
{
  "name": "Notion Create Item",
  "type": "n8n-nodes-base.notion",
  "typeVersion": 2.2,
  "position": [500, 300],
  "parameters": {
    "resource": "databasePage",
    "operation": "create",
    "databaseId": { "__rl": true, "value": "YOUR_DATABASE_ID", "mode": "id" },
    "propertiesUi": {
      "propertyValues": [
        { "key": "Name", "type": "title", "titleValue": "={{ $json.name }}" }
      ]
    },
    "options": {}
  },
  "credentials": {
    "notionApi": { "id": "1", "name": "Notion account" }
  }
}
```
`type` must match Notion property type: `title`, `richText`, `number`, `select`, `date`, etc.
