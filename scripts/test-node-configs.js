#!/usr/bin/env node
/**
 * n8n Node Config Tester
 *
 * Validates all node types and configs from CLAUDE.md against a live n8n instance.
 *
 * Usage:
 *   N8N_URL=https://your-instance.com N8N_API_KEY=your-key node scripts/test-node-configs.js
 *
 *   Or with CLI args:
 *   node scripts/test-node-configs.js --url https://your-instance.com --key your-key
 *
 * Debug mode (prints raw HTTP request + response for every API call):
 *   node scripts/test-node-configs.js --url ... --key ... --debug
 *
 * Single-node debug (test one node type and print full raw exchange):
 *   node scripts/test-node-configs.js --url ... --key ... --debug --node n8n-nodes-base.slack
 */

const https = require('https');
const http = require('http');
const url = require('url');

// ── Config ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};
const hasFlag = (flag) => args.includes(flag);

const N8N_URL = (getArg('--url') || process.env.N8N_URL || '').replace(/\/$/, '');
const N8N_API_KEY = getArg('--key') || process.env.N8N_API_KEY || '';
const DEBUG = hasFlag('--debug');
const DEBUG_NODE = getArg('--node') || null; // filter to one node type when --debug

if (!N8N_URL || !N8N_API_KEY) {
  console.error('Error: N8N_URL and N8N_API_KEY are required.');
  console.error('  N8N_URL=https://... N8N_API_KEY=... node scripts/test-node-configs.js');
  console.error('  node scripts/test-node-configs.js --url https://... --key ...');
  process.exit(1);
}

if (DEBUG) {
  console.log('\n  [DEBUG MODE ON] — raw HTTP request + response will be printed for every API call.');
  if (DEBUG_NODE) console.log(`  [DEBUG NODE FILTER] — only testing node type: ${DEBUG_NODE}`);
  console.log('');
}

// ── Node types to test (from CLAUDE.md typeVersion Reference) ───────────────

const TYPE_VERSION_TABLE = [
  { type: 'n8n-nodes-base.telegramTrigger',                      expectedVersion: 1.2 },
  { type: 'n8n-nodes-base.telegram',                             expectedVersion: 1.2 },
  { type: 'n8n-nodes-base.webhook',                              expectedVersion: 2   },
  { type: 'n8n-nodes-base.scheduleTrigger',                      expectedVersion: 1.2 },
  { type: 'n8n-nodes-base.manualTrigger',                        expectedVersion: 1   },
  { type: 'n8n-nodes-base.httpRequest',                          expectedVersion: 4.2 },
  { type: 'n8n-nodes-base.code',                                 expectedVersion: 2   },
  { type: 'n8n-nodes-base.set',                                  expectedVersion: 3.4 },
  { type: 'n8n-nodes-base.if',                                   expectedVersion: 2.2 },
  { type: 'n8n-nodes-base.switch',                               expectedVersion: 3.2 },
  { type: 'n8n-nodes-base.merge',                                expectedVersion: 3   },
  { type: 'n8n-nodes-base.splitInBatches',                       expectedVersion: 3   },
  { type: 'n8n-nodes-base.respondToWebhook',                     expectedVersion: 1.1 },
  { type: 'n8n-nodes-base.filter',                               expectedVersion: 2   },
  { type: 'n8n-nodes-base.aggregate',                            expectedVersion: 1   },
  { type: 'n8n-nodes-base.removeDuplicates',                     expectedVersion: 1.1 },
  { type: 'n8n-nodes-base.wait',                                 expectedVersion: 1.1 },
  { type: 'n8n-nodes-base.errorTrigger',                         expectedVersion: 1   },
  { type: 'n8n-nodes-base.executeCommand',                       expectedVersion: 1   },
  { type: 'n8n-nodes-base.stickyNote',                           expectedVersion: 1   },
  { type: 'n8n-nodes-base.noOp',                                 expectedVersion: 1   },
  { type: 'n8n-nodes-base.slack',                                expectedVersion: 2.3 },
  { type: 'n8n-nodes-base.gmail',                                expectedVersion: 2.1 },
  { type: 'n8n-nodes-base.googleSheets',                         expectedVersion: 4.5 },
  { type: 'n8n-nodes-base.googleDrive',                          expectedVersion: 3   },
  { type: '@n8n/n8n-nodes-langchain.agent',                      expectedVersion: 1.7 },
  { type: '@n8n/n8n-nodes-langchain.lmOpenAi',                   expectedVersion: 1.2 },
  { type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',         expectedVersion: 1.3 },
  { type: '@n8n/n8n-nodes-langchain.calculatorTool',             expectedVersion: 1   },
  { type: '@n8n/n8n-nodes-langchain.toolHttpRequest',            expectedVersion: 1.1 },
  { type: '@n8n/n8n-nodes-langchain.outputParserStructured',     expectedVersion: 1.2 },
  { type: '@n8n/n8n-nodes-langchain.textClassifier',             expectedVersion: 1   },
];

// ── Common node configs to validate (from CLAUDE.md) ────────────────────────

const COMMON_NODE_CONFIGS = [
  {
    label: 'Manual Trigger',
    node: {
      name: 'When clicking Test workflow',
      type: 'n8n-nodes-base.manualTrigger',
      typeVersion: 1,
      position: [250, 300],
      parameters: {}
    }
  },
  {
    label: 'Telegram Trigger',
    node: {
      name: 'Telegram Trigger',
      type: 'n8n-nodes-base.telegramTrigger',
      typeVersion: 1.2,
      position: [250, 300],
      parameters: { updates: ['message'], additionalFields: {} },
      credentials: { telegramApi: { id: '1', name: 'Telegram account' } }
    }
  },
  {
    label: 'Telegram Send Message',
    node: {
      name: 'Send Reply',
      type: 'n8n-nodes-base.telegram',
      typeVersion: 1.2,
      position: [500, 300],
      parameters: {
        resource: 'message',
        operation: 'sendMessage',
        chatId: { __rl: true, value: '={{ $json.message.chat.id }}', mode: 'expression' },
        text: '={{ $json.message.text }}',
        additionalFields: {}
      },
      credentials: { telegramApi: { id: '1', name: 'Telegram account' } }
    }
  },
  {
    label: 'Webhook Trigger',
    node: {
      name: 'Webhook',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 2,
      position: [250, 300],
      parameters: { httpMethod: 'POST', path: 'test-webhook', responseMode: 'responseNode' }
    }
  },
  {
    label: 'Schedule Trigger',
    node: {
      name: 'Schedule Trigger',
      type: 'n8n-nodes-base.scheduleTrigger',
      typeVersion: 1.2,
      position: [250, 300],
      parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 1 }] } }
    }
  },
  {
    label: 'HTTP Request',
    node: {
      name: 'HTTP Request',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [500, 300],
      parameters: { method: 'GET', url: 'https://httpbin.org/get', authentication: 'none' }
    }
  },
  {
    label: 'Code Node (JS)',
    node: {
      name: 'Code',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [500, 300],
      parameters: { jsCode: "return items.map(item => ({ json: { ...item.json } }));" }
    }
  },
  {
    label: 'Edit Fields (Set)',
    node: {
      name: 'Edit Fields',
      type: 'n8n-nodes-base.set',
      typeVersion: 3.4,
      position: [500, 300],
      parameters: {
        mode: 'manual',
        fields: { values: [{ name: 'newField', stringValue: '={{ $json.existingField }}' }] },
        options: {}
      }
    }
  },
  {
    label: 'IF Node',
    node: {
      name: 'IF',
      type: 'n8n-nodes-base.if',
      typeVersion: 2.2,
      position: [500, 300],
      parameters: {
        conditions: {
          options: { caseSensitive: true, leftValue: '' },
          conditions: [{
            id: 'condition_0',
            leftValue: '={{ $json.field }}',
            rightValue: 'expected',
            operator: { type: 'string', operation: 'equals' }
          }],
          combinator: 'and'
        },
        options: {}
      }
    }
  },
  {
    label: 'Filter',
    node: {
      name: 'Filter',
      type: 'n8n-nodes-base.filter',
      typeVersion: 2,
      position: [500, 300],
      parameters: {
        conditions: {
          options: { caseSensitive: true, leftValue: '' },
          conditions: [{
            id: 'condition_0',
            leftValue: '={{ $json.status }}',
            rightValue: 'active',
            operator: { type: 'string', operation: 'equals' }
          }],
          combinator: 'and'
        },
        options: {}
      }
    }
  },
  {
    label: 'Switch',
    node: {
      name: 'Switch',
      type: 'n8n-nodes-base.switch',
      typeVersion: 3.2,
      position: [500, 300],
      parameters: {
        rules: {
          values: [{
            outputKey: 'Route 0',
            conditions: {
              options: { caseSensitive: true, leftValue: '' },
              conditions: [{ leftValue: '={{ $json.type }}', rightValue: 'typeA', operator: { type: 'string', operation: 'equals' } }],
              combinator: 'and'
            }
          }]
        },
        options: {}
      }
    }
  },
  {
    label: 'Merge',
    node: {
      name: 'Merge',
      type: 'n8n-nodes-base.merge',
      typeVersion: 3,
      position: [700, 300],
      parameters: { mode: 'combine', combinationMode: 'mergeByPosition', options: {} }
    }
  },
  {
    label: 'Aggregate',
    node: {
      name: 'Aggregate',
      type: 'n8n-nodes-base.aggregate',
      typeVersion: 1,
      position: [700, 300],
      parameters: { aggregate: 'aggregateAllItemData', destinationFieldName: 'data', options: {} }
    }
  },
  {
    label: 'Remove Duplicates',
    node: {
      name: 'Remove Duplicates',
      type: 'n8n-nodes-base.removeDuplicates',
      typeVersion: 1.1,
      position: [700, 300],
      parameters: { compare: 'allFields', options: {} }
    }
  },
  {
    label: 'Wait',
    node: {
      name: 'Wait',
      type: 'n8n-nodes-base.wait',
      typeVersion: 1.1,
      position: [700, 300],
      parameters: { resume: 'timeInterval', amount: 5, unit: 'seconds', options: {} }
    }
  },
  {
    label: 'Respond to Webhook',
    node: {
      name: 'Respond to Webhook',
      type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1.1,
      position: [900, 300],
      parameters: { respondWith: 'json', responseBody: '={{ $json }}', options: {} }
    }
  },
  {
    label: 'Split In Batches',
    node: {
      name: 'Split In Batches',
      type: 'n8n-nodes-base.splitInBatches',
      typeVersion: 3,
      position: [500, 300],
      parameters: { batchSize: 10, options: {} }
    }
  },
  {
    label: 'NoOp',
    node: {
      name: 'No Operation',
      type: 'n8n-nodes-base.noOp',
      typeVersion: 1,
      position: [700, 500],
      parameters: {}
    }
  },
  {
    label: 'Slack Send Message',
    node: {
      name: 'Slack',
      type: 'n8n-nodes-base.slack',
      typeVersion: 2.3,
      position: [700, 300],
      parameters: {
        resource: 'message',
        operation: 'post',
        channel: { __rl: true, value: '#general', mode: 'name' },
        text: '={{ $json.message }}',
        otherOptions: {}
      },
      credentials: { slackApi: { id: '1', name: 'Slack account' } }
    }
  },
  {
    label: 'Gmail Send Email',
    node: {
      name: 'Gmail',
      type: 'n8n-nodes-base.gmail',
      typeVersion: 2.1,
      position: [700, 300],
      parameters: {
        resource: 'message',
        operation: 'send',
        sendTo: { __rl: true, value: '={{ $json.email }}', mode: 'expression' },
        subject: '={{ $json.subject }}',
        emailType: 'text',
        message: '={{ $json.body }}',
        options: {}
      },
      credentials: { gmailOAuth2: { id: '1', name: 'Gmail account' } }
    }
  },
  {
    label: 'Google Sheets Append Row',
    node: {
      name: 'Google Sheets',
      type: 'n8n-nodes-base.googleSheets',
      typeVersion: 4.5,
      position: [700, 300],
      parameters: {
        resource: 'sheet',
        operation: 'append',
        documentId: { __rl: true, value: 'SPREADSHEET_ID', mode: 'id' },
        sheetName: { __rl: true, value: 'gid=0', mode: 'list', cachedResultName: 'Sheet1' },
        columns: { mappingMode: 'autoMapInputData', value: {}, matchingColumns: [], schema: [] },
        options: {}
      },
      credentials: { googleSheetsOAuth2Api: { id: '1', name: 'Google Sheets account' } }
    }
  },
  {
    label: 'AI Agent (LangChain)',
    node: {
      name: 'AI Agent',
      type: '@n8n/n8n-nodes-langchain.agent',
      typeVersion: 1.7,
      position: [500, 300],
      parameters: { text: '={{ $json.message }}', options: {} }
    }
  },
  {
    label: 'OpenAI Chat Model',
    node: {
      name: 'OpenAI Chat Model',
      type: '@n8n/n8n-nodes-langchain.lmOpenAi',
      typeVersion: 1.2,
      position: [500, 500],
      parameters: { model: 'gpt-4o-mini', options: {} },
      credentials: { openAiApi: { id: '1', name: 'OpenAI account' } }
    }
  },
  {
    label: 'Window Buffer Memory',
    node: {
      name: 'Window Buffer Memory',
      type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
      typeVersion: 1.3,
      position: [700, 500],
      parameters: { sessionKey: '={{ $json.sessionId }}', contextWindowLength: 10 }
    }
  },
  {
    label: 'Error Trigger',
    node: {
      name: 'Error Trigger',
      type: 'n8n-nodes-base.errorTrigger',
      typeVersion: 1,
      position: [250, 300],
      parameters: {}
    }
  },
];

// ── Debug printer ─────────────────────────────────────────────────────────────

let _debugCallCount = 0;

function debugPrint(method, path, payload, status, responseBody) {
  _debugCallCount++;
  const keyPreview = N8N_API_KEY
    ? N8N_API_KEY.slice(0, 8) + '****'
    : '(not set)';

  console.log(`\n${'─'.repeat(70)}`);
  console.log(`  [DEBUG #${_debugCallCount}] ${method} ${N8N_URL}${path}`);
  console.log(`${'─'.repeat(70)}`);

  // Request
  console.log('  REQUEST HEADERS:');
  console.log(`    X-N8N-API-KEY: ${keyPreview}`);
  console.log(`    Content-Type: application/json`);
  console.log(`    Accept: application/json`);

  if (payload) {
    const bodyStr = JSON.stringify(JSON.parse(payload), null, 2);
    const preview = bodyStr.length > 1500
      ? bodyStr.slice(0, 1500) + '\n    ... [truncated]'
      : bodyStr;
    console.log(`  REQUEST BODY:\n${preview.split('\n').map(l => '    ' + l).join('\n')}`);
  } else {
    console.log('  REQUEST BODY: (none)');
  }

  // Response
  console.log(`\n  RESPONSE STATUS: ${status}`);
  const respStr = typeof responseBody === 'string'
    ? responseBody
    : JSON.stringify(responseBody, null, 2);
  const respPreview = respStr.length > 2000
    ? respStr.slice(0, 2000) + '\n    ... [truncated]'
    : respStr;
  console.log(`  RESPONSE BODY:\n${respPreview.split('\n').map(l => '    ' + l).join('\n')}`);
  console.log('');
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new url.URL(N8N_URL + path);
    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;

    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      },
      rejectUnauthorized: false // allow self-signed certs on self-hosted
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        if (DEBUG) debugPrint(method, path, payload, res.statusCode, parsed);
        resolve({ status: res.statusCode, body: parsed });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Result tracking ───────────────────────────────────────────────────────────

const results = {
  instanceInfo: null,
  nodeTypeChecks: [],
  configValidations: [],
  createdWorkflowIds: []
};

// ── STEP 1: Instance health check ─────────────────────────────────────────────

async function checkInstance() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  n8n Node Config Tester');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Instance: ${N8N_URL}`);

  try {
    const res = await apiRequest('GET', '/api/v1/workflows?limit=1');
    if (res.status === 401) {
      console.error('\n✗ Authentication failed — check your API key');
      process.exit(1);
    }
    if (res.status >= 400) {
      console.error(`\n✗ Instance returned ${res.status} — check the URL`);
      process.exit(1);
    }

    // Try to get n8n version from settings endpoint
    const settingsRes = await apiRequest('GET', '/api/v1/me');
    results.instanceInfo = { status: 'reachable', user: settingsRes.body?.firstName || 'unknown' };
    console.log(`  Auth: ✓ Connected (user: ${results.instanceInfo.user})`);
  } catch (e) {
    console.error(`\n✗ Could not reach instance: ${e.message}`);
    process.exit(1);
  }
}

// ── STEP 2: Check node types exist via workflow create + immediate delete ─────

async function checkNodeTypes() {
  const table = DEBUG_NODE
    ? TYPE_VERSION_TABLE.filter(r => r.type === DEBUG_NODE)
    : TYPE_VERSION_TABLE;

  if (DEBUG_NODE && table.length === 0) {
    console.log(`\n[1/3] --node filter "${DEBUG_NODE}" matched no entries in TYPE_VERSION_TABLE — skipping.\n`);
    return;
  }

  console.log('\n[1/3] Checking node type availability...\n');

  for (const { type, expectedVersion } of table) {
    const shortType = type.replace('n8n-nodes-base.', '').replace('@n8n/n8n-nodes-langchain.', 'langchain.');
    process.stdout.write(`  ${shortType.padEnd(45)}`);

    // Create a minimal workflow with just this node to check if it's known
    const testWf = {
      name: `__nodetest_${Date.now()}__`,
      nodes: [{
        id: 'node1',
        name: 'TestNode',
        type,
        typeVersion: expectedVersion,
        position: [250, 300],
        parameters: {}
      }],
      connections: {},
      settings: { executionOrder: 'v1' }
    };

    try {
      const res = await apiRequest('POST', '/api/v1/workflows', testWf);

      if (res.status === 200 || res.status === 201) {
        const wfId = res.body?.id;
        if (wfId) results.createdWorkflowIds.push(wfId);

        results.nodeTypeChecks.push({ type, expectedVersion, status: 'exists', wfId });
        console.log(`✓ exists (v${expectedVersion})`);
      } else {
        const errMsg = res.body?.message || JSON.stringify(res.body).slice(0, 120);
        const isUnknownType = errMsg.includes('unknown') || errMsg.includes('not found') || errMsg.includes('invalid');
        results.nodeTypeChecks.push({ type, expectedVersion, status: 'error', error: errMsg });
        console.log(`✗ ${isUnknownType ? 'NODE NOT FOUND' : 'error: ' + errMsg.slice(0, 80)}`);
      }
    } catch (e) {
      results.nodeTypeChecks.push({ type, expectedVersion, status: 'exception', error: e.message });
      console.log(`✗ exception: ${e.message.slice(0, 80)}`);
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 150));
  }
}

// ── STEP 3: Validate common node configs ──────────────────────────────────────

async function validateCommonConfigs() {
  const configs = DEBUG_NODE
    ? COMMON_NODE_CONFIGS.filter(c => c.node.type === DEBUG_NODE)
    : COMMON_NODE_CONFIGS;

  if (DEBUG_NODE && configs.length === 0) {
    console.log(`\n[2/3] --node filter "${DEBUG_NODE}" matched no entries in COMMON_NODE_CONFIGS — skipping.\n`);
    return;
  }

  console.log('\n[2/3] Validating common node configs...\n');

  for (const { label, node } of configs) {
    process.stdout.write(`  ${label.padEnd(35)}`);

    const testWf = {
      name: `__configtest_${Date.now()}__`,
      nodes: [{ id: 'node1', ...node }],
      connections: {},
      settings: { executionOrder: 'v1' }
    };

    try {
      const res = await apiRequest('POST', '/api/v1/workflows', testWf);

      if (res.status === 200 || res.status === 201) {
        const wfId = res.body?.id;
        if (wfId) results.createdWorkflowIds.push(wfId);
        results.configValidations.push({ label, status: 'pass', wfId });
        console.log('✓ valid');
      } else {
        const errMsg = res.body?.message || JSON.stringify(res.body).slice(0, 200);
        results.configValidations.push({ label, status: 'fail', error: errMsg });
        console.log(`✗ ${errMsg.slice(0, 100)}`);
      }
    } catch (e) {
      results.configValidations.push({ label, status: 'exception', error: e.message });
      console.log(`✗ exception: ${e.message.slice(0, 80)}`);
    }

    await new Promise(r => setTimeout(r, 150));
  }
}

// ── STEP 4: Cleanup test workflows ───────────────────────────────────────────

async function cleanup() {
  if (results.createdWorkflowIds.length === 0) return;

  console.log(`\n[3/3] Cleaning up ${results.createdWorkflowIds.length} test workflows...`);
  let deleted = 0;

  for (const id of results.createdWorkflowIds) {
    try {
      const res = await apiRequest('DELETE', `/api/v1/workflows/${id}`);
      if (res.status === 200 || res.status === 204) deleted++;
    } catch {}
    await new Promise(r => setTimeout(r, 80));
  }

  console.log(`  Deleted: ${deleted}/${results.createdWorkflowIds.length}`);
}

// ── STEP 5: Print report ──────────────────────────────────────────────────────

function printReport() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  RESULTS SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Node type availability
  const typePass = results.nodeTypeChecks.filter(r => r.status === 'exists').length;
  const typeFail = results.nodeTypeChecks.filter(r => r.status !== 'exists').length;
  console.log(`Node Types: ${typePass}/${TYPE_VERSION_TABLE.length} available`);

  const failedTypes = results.nodeTypeChecks.filter(r => r.status !== 'exists');
  if (failedTypes.length > 0) {
    console.log('\n  ✗ Missing or erroring node types:');
    failedTypes.forEach(r => console.log(`    - ${r.type}: ${r.error?.slice(0, 120)}`));
  }

  // Config validations
  const configPass = results.configValidations.filter(r => r.status === 'pass').length;
  const configFail = results.configValidations.filter(r => r.status !== 'pass').length;
  console.log(`\nNode Configs: ${configPass}/${COMMON_NODE_CONFIGS.length} valid`);

  const failedConfigs = results.configValidations.filter(r => r.status !== 'pass');
  if (failedConfigs.length > 0) {
    console.log('\n  ✗ Failed configs:');
    failedConfigs.forEach(r => console.log(`    - ${r.label}: ${r.error?.slice(0, 120)}`));
  }

  // Overall
  const totalTests = TYPE_VERSION_TABLE.length + COMMON_NODE_CONFIGS.length;
  const totalPass = typePass + configPass;
  const totalFail = typeFail + configFail;

  console.log('\n──────────────────────────────────────────────────────────────');
  console.log(`  Total: ${totalPass}/${totalTests} passed, ${totalFail} failed`);

  if (totalFail === 0) {
    console.log('\n  ✓ All checks passed — CLAUDE.md configs match this instance.\n');
  } else {
    console.log('\n  ✗ Some checks failed — review errors above and update CLAUDE.md.\n');
  }

  // JSON output for programmatic use
  const reportPath = `node-config-test-${Date.now()}.json`;
  require('fs').writeFileSync(reportPath, JSON.stringify({
    instance: N8N_URL,
    date: new Date().toISOString(),
    summary: { total: totalTests, passed: totalPass, failed: totalFail },
    nodeTypeChecks: results.nodeTypeChecks,
    configValidations: results.configValidations
  }, null, 2));
  console.log(`  Full report saved to: ${reportPath}\n`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  try {
    await checkInstance();
    await checkNodeTypes();
    await validateCommonConfigs();
    await cleanup();
    printReport();
  } catch (e) {
    console.error('\nUnexpected error:', e);
    process.exit(1);
  }
})();
