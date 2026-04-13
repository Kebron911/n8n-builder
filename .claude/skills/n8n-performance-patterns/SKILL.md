---
name: n8n-performance-patterns
description: >
  Performance optimization patterns for n8n workflows. Covers: batching large
  datasets with Split In Batches, configuring execution timeouts, rate limit
  handling, memory-efficient processing, parallel vs sequential execution
  trade-offs, and when to use Sub-Workflow calls for isolation. Use when
  building workflows that process many items (100+), call rate-limited APIs,
  handle large payloads, or need reliability at scale. Trigger on: "slow
  workflow", "timeout", "rate limit", "batch processing", "large dataset",
  "1000 rows", "too many items", "workflow takes too long", "out of memory",
  "optimize workflow", "performance", "Split In Batches", "parallel
  execution", or any build/fix involving high-volume data processing.
---

# n8n Performance Patterns

## 1. When to Think About Performance

Scale determines your approach:

- **< 50 items:** Sequential processing is fine. No optimization needed.
- **50-500 items:** Consider Split In Batches if calling external APIs with rate limits.
- **500-5000 items:** Definitely batch; add execution timeouts; consider sub-workflows for large payloads.
- **5000+ items:** Use sub-workflow orchestrator pattern with workers; never load all items into a single node's memory.

---

## 2. Split In Batches Pattern

The core batching mechanism in n8n. Process large item lists by dividing into manageable chunks.

### Node Configuration

```json
{
  "type": "n8n-nodes-base.splitInBatches",
  "typeVersion": 3,
  "parameters": {
    "batchSize": 10,
    "options": {
      "reset": false
    }
  }
}
```

### Key Implementation Points

1. **Placement:** Add AFTER the node that produces the full item set (e.g., after Google Sheets Read, or after an HTTP Request that fetches a list).

2. **Loop Wiring:** The loop body connects back to Split In Batches input 1 (not input 0). Input 0 receives the initial full dataset; input 1 receives the loop-back signal to process the next batch.

3. **Batch Size:** Depends on API rate limits.
   - Example: Gmail API allows 100 emails/minute → use `batchSize: 10` with a 1-second Wait node after each batch (10 batches × 1s = 10s, well under 60s).
   - Example: Slack API allows 1 request/second → use `batchSize: 1` or add Wait node between API calls.

4. **Reset Option:** Set to `false` to accumulate results across batches. Set to `true` only if you want to process one batch at a time and discard prior results.

### Example: Email 2000 Rows with Rate Limit

```
Google Sheets (Read 2000 rows)
         ↓
Split In Batches (batchSize: 10)
         ↓
Gmail Send (send 10 emails)
         ↓
Wait (1 second delay)
         ↓
[Loop back to Split In Batches input 1]
         ↓
Aggregate results
         ↓
Notify completion
```

Result: 2000 emails sent over ~200 seconds (3.3 minutes), respecting the 100/minute rate limit.

---

## 3. Rate Limit Handling

Three strategies based on API behavior and requirements:

### Strategy 1: Wait Node (Simple)

Add a Wait node after each API call with a delay matching the rate limit window.

**Pros:**
- Simple to implement
- Reliable for predictable rate limits

**Cons:**
- Slow — processes sequentially within each batch
- Fixed delay may be too conservative

**When to use:** Low-volume workflows, APIs with strict rate limits, when simplicity is valued over speed.

**Example:**
```
API Call
  ↓
Wait (1 second)
  ↓
Continue
```

### Strategy 2: Split In Batches + Wait (Moderate)

Batch items, process entire batch, wait, then next batch.

**Pros:**
- Balances throughput with rate limits
- Reduces the number of wait pauses (wait once per batch, not per item)

**Cons:**
- Fixed delay may be too conservative or too aggressive depending on batch size and API speed

**When to use:** Moderate-volume workflows (100-5000 items), APIs with per-minute or per-second rate limits.

**Example:**
```
Split In Batches (batchSize: 10)
  ↓
API Call (10 items)
  ↓
Wait (1 second for 10/min rate limit)
  ↓
[Loop back]
```

### Strategy 3: Retry on 429 (Advanced)

Use HTTP Request node with automatic retry on rate limit (HTTP 429).

**Pros:**
- Adapts to actual API behavior
- No fixed delays — responds to the server

**Cons:**
- Requires HTTP Request node; not all integrations support it
- May retry aggressively if not configured carefully

**When to use:** APIs with variable or bursty rate limits, when you want adaptive backoff.

**HTTP Request Node Configuration:**
```json
"parameters": {
  "options": {
    "retry": {
      "enabled": true,
      "maxRetries": 3,
      "retryInterval": 1000,
      "retryOnErrors": ["429"]
    }
  }
}
```

---

## 4. Execution Timeout Configuration

Set a maximum execution time for workflows to prevent runaway jobs.

### Workflow Settings

```json
"settings": {
  "executionTimeout": 300,
  "timezone": "America/New_York"
}
```

### Values

- **Default:** No timeout (dangerous for production)
- **Webhook workflows:** Keep under 30 seconds to avoid client timeouts
- **Batch workflows:** 300-600 seconds (5-10 minutes) typical
- **Large jobs (10,000+ items):** 600+ seconds or use sub-workflows to break into smaller executables

### Calculation

Estimate workflow runtime:
- 2000 items × 0.1s per item + 5s overhead = 205 seconds → set timeout to 300s
- If you can't estimate, use sub-workflows to bound individual executions to <300s each

---

## 5. Sub-Workflow Pattern (Execute Workflow)

For jobs processing 1000+ items or requiring memory isolation, break into orchestrator + worker workflows.

### Pattern: Orchestrator + Workers

**Orchestrator Workflow:**
1. Trigger → fetch/generate the full item list (e.g., paginate through API, read large sheet)
2. Split In Batches (e.g., batchSize: 100)
3. Execute Workflow (call worker) → pass each batch as input data
4. Collect results from all worker executions
5. Final aggregation or completion

**Worker Workflow:**
1. Manual Trigger node (receives batch data in `$input.all()`)
2. Process items (transform, call APIs, etc.)
3. Return results

### Benefits

- **Memory isolation:** Each worker execution runs in its own isolated memory context; one batch doesn't consume memory from previous batches.
- **Error isolation:** If one batch fails, others continue. Failed batch can be retried independently.
- **Potential parallelism:** n8n can run multiple worker executions concurrently (check your plan).

### Example: Sync 10,000 Contacts to PostgreSQL

**Orchestrator:**
```
HubSpot API (paginate all contacts)
         ↓
Split In Batches (batchSize: 100)
         ↓
Execute Workflow (WorkerSync)
         ↓
Merge results
         ↓
Completion notification
```

**WorkerSync:**
```
Manual Trigger (receives 100 contacts)
         ↓
PostgreSQL Upsert (batch insert 100 records)
         ↓
Return success/failure
```

Result: 10,000 contacts synced in ~10 worker executions (100 each), isolated and parallelizable.

---

## 6. Memory-Efficient Patterns

### Reduce Memory Footprint

1. **Avoid storing large payloads in workflow variables.**
   - Bad: `$var.allImages = [blob, blob, blob, ...]`
   - Good: `$var.imageUrls = ["https://...", "https://...", ...]` then fetch on-demand

2. **Use `$json` instead of `$node[nodeId].json` when possible.**
   - `$json` refers to the current node's output
   - `$node[nodeId].json` loads the entire output of another node — memory-inefficient

3. **For file processing, stream via URLs instead of embedding binary data.**
   - Bad: Base64 encode a 5MB image and store in JSON
   - Good: Store the URL, fetch on-demand in the processing node

4. **Remove unnecessary fields early with Edit Fields (Set) node.**
   - Before processing 1000 records, strip unused columns
   - Example: Keep only `email`, `name`, `id`; drop `full_audit_trail`, `raw_html`, etc.

5. **For AI workflows, truncate context and memory to avoid token bloat.**
   - Don't accumulate the entire conversation history
   - Summarize and flush old context periodically

### Example: Process 1000 Images Without OOM

Bad approach:
```
HTTP Request (download 1000 images as base64)
         ↓
Code node (all images in memory)
         ↓
Crash: out of memory
```

Good approach:
```
Spreadsheet (1000 image URLs)
         ↓
Split In Batches (batchSize: 5)
         ↓
HTTP Request (download 5 images)
         ↓
Code node (process 5 in memory)
         ↓
Upload to S3
         ↓
[Loop back — previous images dropped from memory]
```

---

## 7. Parallel vs Sequential Trade-offs

| Approach | When to Use | Risk | Throughput |
|---|---|---|---|
| **Sequential (default)** | Low volume (<50 items), no rate limits | Slow at scale (1 item/s typical) | 1 item/s |
| **Split In Batches** | Moderate volume (50-5000), rate-limited APIs | Complexity in loop wiring; batch size tuning | 10-100 items/s (batch dependent) |
| **Sub-Workflow workers** | High volume (1000+), need isolation | Setup overhead; harder to debug; requires manual trigger in worker | 100+ items/s (parallelism dependent) |
| **Parallel HTTP calls** | Independent API calls, no rate limit | Can overwhelm target API; network overhead | 10+ calls/s but risk DoS |

### When NOT to Parallelize

- **Rate-limited APIs:** HubSpot, Slack, Gmail all have per-second or per-minute limits. Parallel calls will hit 429 errors immediately.
- **Database writes:** Parallel upserts to PostgreSQL/MySQL can cause lock contention. Batch sequentially instead.
- **Webhook responses:** Keep response fast — respond immediately, process asynchronously.

### When to Parallelize

- **Independent read operations:** Fetching data from multiple sources (no cross-dependencies).
- **Stateless transformations:** Code node processing doesn't depend on order.

---

## 8. Production Checklist for High-Volume Workflows

Before activating any workflow processing 100+ items or calling rate-limited APIs:

- [ ] **Execution timeout is set** — `settings.executionTimeout` is not null; typically 300-600s
- [ ] **Error workflow is configured** — `settings.errorWorkflow` points to a production error handler (e.g., `vQKuXqX6mzCEGmaE`)
- [ ] **Rate limits are addressed** — Split In Batches or Wait nodes used for rate-limited APIs
- [ ] **No unbounded loops** — Split In Batches has a finite item list, or loop has a max iteration guard
- [ ] **Large payloads are stripped** — Edit Fields (Set) node removes unnecessary columns/data before processing
- [ ] **Sub-workflows used for scale** — For 1000+ items, orchestrator + worker pattern is implemented
- [ ] **Tested with production-volume data** — Validate with actual row counts and API response sizes
- [ ] **Monitored** — Error notifications and execution logging enabled

---

## Common Patterns Reference

### Pattern A: Moderate-Volume API Sync (100-5000 items)

```
Data Source (fetch all items)
         ↓
Split In Batches
         ↓
API Call (external service)
         ↓
Wait (rate limit pace)
         ↓
[Loop]
         ↓
Success notification
```

**Configuration:**
- Batch size: 10-50 (depends on API rate limit)
- Timeout: 300-600s
- Error workflow: enabled

---

### Pattern B: Large Batch Job (5000+ items)

```
Orchestrator Workflow:
  Data Source (paginate)
      ↓
  Split In Batches (100 items per batch)
      ↓
  Execute Workflow (worker)
      ↓
  Merge results
      ↓
  Completion

Worker Workflow:
  Manual Trigger
      ↓
  Process batch
      ↓
  Return
```

**Configuration:**
- Orchestrator timeout: 600s
- Worker timeout: 300s per batch
- Error workflow: both workflows

---

### Pattern C: Webhook with Async Processing

```
Webhook Trigger
      ↓
  Respond to Webhook (return 200 OK immediately)
      ↓
  [If independent calls: split into parallel branches]
      ↓                    ↓
  API Call A           API Call B
      ↓                    ↓
  Merge (mode: Append)
      ↓
  Final processing / database writes
      ↓
  Completion logging
```

**Configuration:**
- Timeout: 30s (webhook client timeout)
- Use Respond to Webhook node to return early
- Process remaining steps after response
- **Parallelize independent API calls** after the response — if you need data from multiple services (CRM lookup, enrichment API, analytics), branch them in parallel and merge results. This is the single biggest latency win for webhook workflows.

---

## Troubleshooting

### Symptom: Workflow times out

**Diagnosis:**
1. Check `settings.executionTimeout`
2. Estimate items × time per item
3. If > timeout, either increase timeout or use sub-workflows to break into smaller executables

**Fix:**
- Increase timeout (short-term, risky)
- Add Split In Batches to parallelize within batch
- Switch to sub-workflow pattern for larger jobs

---

### Symptom: Out of memory error

**Diagnosis:**
1. What's the total data size? (item count × payload size)
2. Are all items loaded into a single node at once?

**Fix:**
- Add Split In Batches with small batch size (1-10 for large payloads)
- Use sub-workflows for memory isolation between batches
- Remove unnecessary fields early with Edit Fields (Set)
- Stream URLs instead of embedding binary data

---

### Symptom: Hitting rate limits (HTTP 429, 403, etc.)

**Diagnosis:**
1. Is the API rate-limited per second, per minute, or per day?
2. How many items are being processed?

**Fix:**
- Add Wait node after API call (simplest)
- Use Split In Batches + Wait to batch requests
- Switch to HTTP Request with retry on 429 (if supported)
- Check API docs for recommended batch size

---

### Symptom: Webhook client times out before completion

**Diagnosis:**
1. Workflow is processing too long (> 30s typically)
2. Webhook client is waiting for response

**Fix:**
- Use Respond to Webhook node to return immediately
- Move long-running logic after the response
- **Parallelize independent API calls** — if the post-response work involves multiple independent API calls (e.g., fetching from CRM + enrichment service + analytics), run them in parallel using Merge node (mode: "Append") with multiple branches, rather than sequentially. This reduces total processing time proportionally to the number of parallel paths.
- Consider moving to a background job (sub-workflow with delayed trigger)
