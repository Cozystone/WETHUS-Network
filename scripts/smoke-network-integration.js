const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const appRoot = path.join(repoRoot, 'WETHUS2');
const backendRoot = path.join(appRoot, 'backend');
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wethus-network-smoke-'));
const port = 18987;
const mockOllamaPort = 18988;
const base = `http://127.0.0.1:${port}`;
const errors = [];

function fail(message) {
  errors.push(message);
}

function startMockOllama() {
  const server = http.createServer((req, res) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      let request = {};
      try { request = JSON.parse(raw || '{}'); } catch (_) {}
      const prompt = String(request?.messages?.find((message) => message?.role === 'user')?.content || '');
      const plannerRequest = prompt.includes('CONTEXT_SCOPE_PLANNER');
      const conversationSelectorRequest = prompt.includes('CONVERSATION_SELECTOR');
      const selectorRequest = prompt.includes('REFERENCE_SELECTOR');
      const metadataRequest = prompt.includes('TURN_METADATA_EXTRACTOR');
      let records = [];
      if (selectorRequest) {
        try { records = JSON.parse(String(prompt.split('Reference index:\n')[1] || '[]')); } catch (_) {}
      } else if (metadataRequest) {
        try { records = JSON.parse(String(prompt.split('Prepared references:\n')[1] || '[]')); } catch (_) {}
      }
      const resourceId = (Array.isArray(records) ? records : []).find((record) => record?.type === 'Resource')?.id;
      const content = plannerRequest
        ? JSON.stringify({
            projectContextual: true,
            responseMode: 'project',
            needsConversationContext: false
          })
        : (conversationSelectorRequest
          ? JSON.stringify({ selectedConversationIds: [] })
          : (selectorRequest
          ? JSON.stringify({
              selectedReferenceIds: resourceId ? [resourceId] : []
            })
          : (metadataRequest
          ? JSON.stringify({
            projectContextual: true,
            responseMode: 'project',
            priority: '실제 결제 전환 확인',
            executionBlocker: '표현된 의향과 실제 결제 행동의 차이가 아직 측정되지 않았습니다.',
            nextActions: ['인터뷰 참여자에게 같은 조건의 결제 링크를 보내 실제 전환을 기록합니다.'],
            questions: [],
            toolActions: [],
            evidenceGaps: ['실제 결제 전환율'],
            usedReferenceIds: resourceId ? [resourceId] : []
          })
          : '인터뷰에서 나온 결제 의향은 아직 실제 구매가 아니므로, 같은 가격으로 작은 결제 링크 실험을 이어가는 편이 좋습니다.')));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ message: { content } }));
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(mockOllamaPort, '127.0.0.1', () => resolve(server));
  });
}

function closeServer(server) {
  if (!server?.listening) return Promise.resolve();
  return new Promise((resolve) => server.close(resolve));
}

function actorState(id, name, email) {
  return {
    email,
    state: {
      currentUserId: id,
      users: [{ id, name, nickname: name.toLowerCase(), email, headline: id === 'leader-smoke' ? 'Founder' : 'Researcher', profilePublic: true }],
      connections: [],
      incomingConnections: [],
      notifications: []
    }
  };
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${base}/health`);
      if (response.ok) return;
    } catch (_) {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('network smoke backend did not become healthy');
}

async function request(pathname, actorId, options = {}) {
  const response = await fetch(`${base}${pathname}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': actorId,
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${pathname} failed (${response.status}): ${payload.error || 'unknown error'}`);
  return payload;
}

function validateFrontendContracts() {
  const app = fs.readFileSync(path.join(appRoot, 'app.js'), 'utf8');
  const home = fs.readFileSync(path.join(appRoot, 'network-home.js'), 'utf8');
  const directory = fs.readFileSync(path.join(appRoot, 'network-directory.js'), 'utf8');
  const hub = fs.readFileSync(path.join(appRoot, 'project-hub.html'), 'utf8');
  const member = fs.readFileSync(path.join(appRoot, 'member.html'), 'utf8');
  const backend = fs.readFileSync(path.join(appRoot, 'backend', 'server.js'), 'utf8');
  const checks = [
    [app.includes('function refreshNetworkPeople('), 'public people refresh contract missing'],
    [app.includes('function mergeConnectionRecords(') && app.includes("status: 'cancelled'"), 'connection tombstone merge contract missing'],
    [app.includes('function addProjectTask(') && app.includes('function setProjectTaskCompleted('), 'shared project task contract missing'],
    [app.includes('function addProjectScheduleItem('), 'shared project schedule contract missing'],
    [home.includes("projectHubHref({ tab: 'overview', focus: 'tasks'"), 'home-to-hub task deep link missing'],
    [home.includes('function buildProjectFlow(') && home.includes('data-home-schedule-id'), 'home project-flow schedule integration missing'],
    [home.includes('data-flow-request-form="ask"') && home.includes('data-flow-request-form="offer"'), 'home ASK/OFFER integration missing'],
    [
      !home.includes('lightweightChatReply') &&
      !home.includes('fallbackAiReply') &&
      !backend.includes('classifyProjectMentorConversationTurn') &&
      !backend.includes('buildProjectMentorFallback(') &&
      !backend.includes('detectProjectMentorMode(') &&
      backend.includes('CONTEXT_SCOPE_PLANNER') &&
      backend.includes('CONVERSATION_SELECTOR') &&
      backend.includes('REFERENCE_SELECTOR') &&
      backend.includes('Selected project context:') &&
      backend.includes('model-native-reference-reasoning-v1'),
      'model-native referenced chat contract missing'
    ],
    [directory.includes("WETHUS.respondToConnection"), 'connection response UI missing'],
    [hub.includes('function focusHubDeepLink()'), 'project hub deep-link focus missing'],
    [hub.includes('function renderHubSchedule()') && hub.includes("pendingHubFocus === 'schedule'"), 'project schedule detail route missing'],
    [hub.includes('data-hub-task-toggle'), 'project hub shared task control missing'],
    [member.includes("params.get('userId')"), 'public profile userId route missing']
  ];
  checks.forEach(([ok, message]) => { if (!ok) fail(message); });
}

(async () => {
  const mockOllama = await startMockOllama();
  const leaderFixture = actorState('leader-smoke', 'Leader Smoke', 'leader-smoke@example.com');
  leaderFixture.state.connections.push({
    id: 'cancelled-connection-tombstone',
    actorId: 'leader-smoke',
    targetUserId: 'researcher-smoke',
    status: 'cancelled',
    createdAt: '2026-08-14T00:00:00.000Z',
    updatedAt: '2026-08-14T00:01:00.000Z'
  });
  fs.writeFileSync(path.join(dataDir, 'cloud-state.json'), JSON.stringify({
    states: [
      leaderFixture,
      actorState('researcher-smoke', 'Researcher Smoke', 'researcher-smoke@example.com')
    ]
  }, null, 2));

  const server = spawn(process.execPath, ['server.js'], {
    cwd: backendRoot,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: String(port),
      WETHUS_DATA_DIR: dataDir,
      WETHUS_WRITE_BACKUPS: 'false',
      NETWORK_REQUIRE_SESSION: 'false',
      AI_MEMORY_REQUIRE_SESSION: 'false',
      AI_PROVIDER: 'local',
      OLLAMA_BASE_URL: `http://127.0.0.1:${mockOllamaPort}`,
      OLLAMA_MODEL: 'wethus-network-smoke-model',
      RATE_LIMIT_DISABLED: 'true',
      ALLOWED_ORIGINS: 'http://127.0.0.1:8095'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let serverError = '';
  server.stderr.on('data', (chunk) => { serverError += String(chunk); });

  try {
    await waitForHealth();
    validateFrontendContracts();

    const people = await request('/network/people', 'leader-smoke');
    if (!people.people?.some((person) => person.id === 'researcher-smoke')) fail('people directory should expose the other public account');
    if (JSON.stringify(people).includes('researcher-smoke@example.com')) fail('people directory must not expose email addresses');

    const initialConnections = await request('/network/connections', 'leader-smoke');
    if (initialConnections.outgoing?.some((item) => item.id === 'cancelled-connection-tombstone')) fail('connection API must hide cancellation tombstones');

    const requestId = 'connection-smoke-request';
    const created = await request('/network/connections/toggle', 'leader-smoke', {
      method: 'POST',
      body: JSON.stringify({ requestId, targetUserId: 'researcher-smoke', connected: true })
    });
    if (!created.delivered) fail('connection request should be delivered to the target account');

    const incoming = await request('/network/connections', 'researcher-smoke');
    if (incoming.incoming?.[0]?.id !== requestId || incoming.incoming?.[0]?.status !== 'requested') fail('target account should receive a pending connection request');

    await request('/network/connections/respond', 'researcher-smoke', {
      method: 'POST',
      body: JSON.stringify({ requestId, status: 'accepted' })
    });
    const sender = await request('/network/connections', 'leader-smoke');
    if (sender.outgoing?.[0]?.status !== 'accepted') fail('accepted status should propagate back to the sender');

    await request('/network/connections/toggle', 'leader-smoke', {
      method: 'POST',
      body: JSON.stringify({ requestId, targetUserId: 'researcher-smoke', connected: false })
    });
    const cancelled = await request('/network/connections', 'researcher-smoke');
    if (cancelled.incoming?.some((item) => item.id === requestId)) fail('cancelling a connection should remove the target request');
    const cancelledSender = await request('/network/connections', 'leader-smoke');
    if (cancelledSender.outgoing?.some((item) => item.id === requestId)) fail('cancelling a connection should remove the sender request');

    const mentor = await request('/ai/project-mentor', 'leader-smoke', {
      method: 'POST',
      body: JSON.stringify({
        project: { id: 'network-smoke-project', title: '학생 팝업 실험', status: '검증 중', category: 'Startup' },
        hub: {
          goal: '결제 전환 가능성을 검증한다.',
          weeklyTodos: ['인터뷰 결과 정리'],
          materials: [{
            id: 'network-smoke-attachment',
            name: '인터뷰-요약.md',
            type: 'text/markdown',
            snippet: '인터뷰 8명 중 6명은 5천 원이면 결제 의향이 있다고 답했다. 결제 링크 테스트는 아직 하지 않았다.',
            source: 'network-home-ai'
          }, {
            id: 'network-smoke-attachment-repeated',
            name: '인터뷰-요약.md',
            type: 'text/markdown',
            snippet: '인터뷰 8명 중 6명은 5천 원이면 결제 의향이 있다고 답했다. 결제 링크 테스트는 아직 하지 않았다.',
            source: 'network-home-ai'
          }]
        },
        userPrompt: '첨부한 인터뷰 기록을 읽고 다음 행동을 정리해줘.',
        sessionId: 'network-smoke-session',
        attachment: {
          id: 'network-smoke-attachment',
          name: '인터뷰-요약.md',
          type: 'text/markdown',
          size: 92,
          content: '인터뷰 8명 중 6명은 5천 원이면 결제 의향이 있다고 답했다. 결제 링크 테스트는 아직 하지 않았다.'
        }
      })
    });
    if (!mentor.memory?.enabled) fail('mentor response should persist actor-scoped memory');
    if (mentor.projectContextual !== true || mentor.understanding?.method !== 'model-native-reference-reasoning-v1') {
      fail('mentor response should use model-native project reasoning');
    }
    if (!mentor.understanding?.usedAttachment || Number(mentor.references?.usedReferenceCount || 0) < 1) {
      fail('mentor should make the attached project material available and report when the model uses it');
    }
    const graph = await request('/ai/memory/graph?limit=80', 'leader-smoke');
    const attachmentNodes = graph.graph?.nodes?.filter((node) => node.type === 'Resource' && String(node.label || '').includes('인터뷰-요약')) || [];
    const attachmentNode = attachmentNodes[0];
    if (!attachmentNode || !String(attachmentNode.summary || '').includes('결제 의향')) fail('attached text should be ingested as a project resource in agent memory');
    if (attachmentNodes.length !== 1) fail('the same attached document should not be duplicated in agent memory');

    if (errors.length) {
      console.error('Network integration smoke failures:');
      errors.forEach((error) => console.error(`- ${error}`));
      process.exitCode = 1;
    } else {
      console.log('Network integration smoke passed.');
    }
  } catch (error) {
    console.error(error);
    if (serverError.trim()) console.error(serverError.trim());
    process.exitCode = 1;
  } finally {
    server.kill();
    await closeServer(mockOllama);
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
})();
