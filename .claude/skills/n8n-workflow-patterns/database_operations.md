# Database Operations — n8n-Specific Details

---

## n8n Postgres Node Config (operation-specific)

The `operation` field changes which other parameters are required. Claude gets these wrong without this reference.

### executeQuery (raw SQL)
```json
{
  "type": "n8n-nodes-base.postgres",
  "parameters": {
    "operation": "executeQuery",
    "query": "SELECT id, name, email FROM users WHERE updated_at > $1 LIMIT $2",
    "additionalFields": {
      "queryParams": "={{ [$json.since_date, 1000] }}"
    }
  }
}
```

`queryParams` takes an array — positional `$1`, `$2`, etc. Never string-interpolate values into the query.

### insert
```json
{
  "parameters": {
    "operation": "insert",
    "schema": "public",
    "table": "users",
    "columns": "id,name,email,created_at",
    "additionalFields": {}
  }
}
```

Column values come from `$json` fields matching the column names (automap). Use Set node upstream to shape data.

### update
```json
{
  "parameters": {
    "operation": "update",
    "schema": "public",
    "table": "users",
    "updateKey": "id",
    "columns": "name,email,updated_at",
    "additionalFields": {}
  }
}
```

`updateKey` = the column used to find the row. Must be in the input `$json`.

### upsert
```json
{
  "parameters": {
    "operation": "upsert",
    "schema": "public",
    "table": "users",
    "conflictColumns": "id",
    "columns": "id,name,email,updated_at",
    "additionalFields": {}
  }
}
```

`conflictColumns` = the unique constraint column(s).

---

## MySQL Node (same pattern, different field names)

```json
{
  "type": "n8n-nodes-base.mySql",
  "parameters": {
    "operation": "executeQuery",
    "query": "SELECT * FROM users WHERE id = ?",
    "queryParams": "={{ [$json.user_id] }}"
  }
}
```

MySQL uses `?` placeholders (not `$1`), and `queryParams` is a top-level parameter (not inside `additionalFields`).

---

## Incremental Sync Pattern

Store last sync timestamp in a sync_log table, use it to fetch only changed records:

```sql
-- Read last sync time
SELECT last_sync FROM sync_log WHERE workflow_id = 'my-workflow' LIMIT 1;

-- Fetch changed records
SELECT * FROM source_table WHERE updated_at > $1 ORDER BY updated_at ASC LIMIT 1000;

-- Update sync time after processing
UPDATE sync_log SET last_sync = NOW() WHERE workflow_id = 'my-workflow';
```

n8n wiring:
```
Schedule → Postgres (get last_sync) → Postgres (fetch changed) → [process] → Postgres (update last_sync)
```

Access last sync in expression: `={{ $node['Get Last Sync'].json.last_sync }}`

---

## Return Value from DB Nodes

n8n DB nodes return each row as a separate item in the output array. To access a single scalar value (e.g., a count):

```javascript
// In a Code node after executeQuery:
const count = $input.first().json.count;  // result from SELECT COUNT(*) AS count

// Or directly in Set node:
{{ $json.count }}  // field from the SELECT result
```

For INSERT/UPDATE, the return value depends on `additionalFields.returnFields` — set this to get the inserted/updated row back.

---

## Common Failure: Missing Schema Field

Postgres node in n8n requires `schema` parameter (defaults to `"public"` but must be explicitly set in some versions):

```json
{
  "parameters": {
    "operation": "insert",
    "schema": "public",
    "table": "users"
  }
}
```

Omitting `schema` can cause validation errors — always include it.
