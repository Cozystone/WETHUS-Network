const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');

const repoRoot = path.resolve(__dirname, '..');
const backendRoot = path.join(repoRoot, 'WETHUS2', 'backend');
const port = Number(process.env.WETHUS_PROJECT_MENTOR_SMOKE_PORT || 8897);
const mockOllamaPort = Number(process.env.WETHUS_PROJECT_MENTOR_MOCK_PORT || (port + 1));
const baseUrl = `http://127.0.0.1:${port}`;
const errors = [];

function fail(message) {
  errors.push(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function startMockOllama(capturedPrompts) {
  const server = http.createServer((req, res) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      let request = {};
      try { request = JSON.parse(raw || '{}'); } catch (_) {}
      const prompt = String(request?.messages?.find((message) => message?.role === 'user')?.content || '');
      capturedPrompts.push(prompt);
      const plannerRequest = prompt.includes('CONTEXT_SCOPE_PLANNER');
      const conversationSelectorRequest = prompt.includes('CONVERSATION_SELECTOR');
      const selectorRequest = prompt.includes('REFERENCE_SELECTOR');
      const metadataRequest = prompt.includes('TURN_METADATA_EXTRACTOR');
      const currentMessage = metadataRequest
        ? String(prompt.match(/User message:\s*([\s\S]*?)\n\nAssistant reply:/)?.[1] || '').trim()
        : String(prompt.match(/Current user message:\s*([\s\S]*?)\n\n(?:Recent conversation|Selected conversation context|Selected project context|Current execution|Project snapshot):/)?.[1] || '').trim();
      let preparedRecords = [];
      if (selectorRequest) {
        try { preparedRecords = JSON.parse(String(prompt.split('Reference index:\n')[1] || '[]')); } catch (_) {}
      } else if (metadataRequest) {
        try { preparedRecords = JSON.parse(String(prompt.split('Prepared references:\n')[1] || '[]')); } catch (_) {}
      }
      const referenceIds = (Array.isArray(preparedRecords) ? preparedRecords : [])
        .filter((record) => record?.evidenceClass !== 'conversation_memory')
        .map((record) => String(record?.id || ''))
        .filter(Boolean)
        .slice(0, 2);
      const conversational = currentMessage === '안녕' || currentMessage === '?';
      const content = plannerRequest
        ? JSON.stringify({
            projectContextual: !conversational,
            responseMode: conversational ? (currentMessage === '안녕' ? 'conversation' : 'clarification') : 'project',
            needsConversationContext: false
          })
        : (conversationSelectorRequest
          ? JSON.stringify({ selectedConversationIds: [] })
          : (selectorRequest
          ? JSON.stringify({
              selectedReferenceIds: conversational ? [] : referenceIds
            })
          : (metadataRequest
          ? JSON.stringify({
                projectContextual: true,
                priority: '핵심 상호작용 회귀 검증',
                executionBlocker: '배포 전 실제 계정 기준의 검증 결과가 아직 없습니다.',
                nextActions: ['Leader와 Tester 계정으로 좋아요와 댓글을 한 번씩 왕복 검증합니다.'],
                questions: [],
                toolActions: [],
                evidenceGaps: ['배포 환경에서의 실제 반영 결과'],
                usedReferenceIds: referenceIds
              })
          : (conversational
            ? (currentMessage === '안녕'
                ? '반가워요. 오늘은 어떤 이야기를 나눠볼까요?'
                : '어느 부분이 걸렸는지 조금만 더 알려주실래요?')
            : '최근 실행 기록을 함께 보면, 먼저 좋아요와 댓글 흐름을 실제 계정으로 다시 확인하는 편이 좋습니다.'))));
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

function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, 3000);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
    child.kill();
  });
}

async function waitForServer(child, logs) {
  for (let i = 0; i < 40; i += 1) {
    if (child.exitCode !== null) break;
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch (_) {}
    await sleep(250);
  }
  throw new Error(`backend did not start on ${baseUrl}\n${logs.text}`);
}

function expectList(name, value, maxLength) {
  if (!Array.isArray(value)) {
    fail(`${name} should be an array`);
    return;
  }
  if (value.length > maxLength) {
    fail(`${name} should contain at most ${maxLength} items, got ${value.length}`);
  }
  if (value.some((item) => !String(item || '').trim())) {
    fail(`${name} should not contain empty items`);
  }
}

(async () => {
  const logs = { text: '' };
  const smokeDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wethus-project-mentor-smoke-'));
  const capturedPrompts = [];
  let child;
  let mockOllama;

  try {
    mockOllama = await startMockOllama(capturedPrompts);
    child = spawn(process.execPath, ['server.js'], {
      cwd: backendRoot,
      env: {
        ...process.env,
        PORT: String(port),
        WETHUS_DATA_DIR: smokeDataDir,
        RATE_LIMIT_DISABLED: 'true',
        AI_PROVIDER: 'local',
        OLLAMA_BASE_URL: `http://127.0.0.1:${mockOllamaPort}`,
        OLLAMA_MODEL: 'wethus-smoke-model'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    child.stdout.on('data', (chunk) => {
      logs.text += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      logs.text += chunk.toString();
    });

    await waitForServer(child, logs);

    const response = await fetch(`${baseUrl}/ai/project-mentor`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-user-id': 'mentor-smoke-user' },
      body: JSON.stringify({
        actorId: 'mentor-smoke-user',
        sessionId: 'mentor-smoke-session',
        trigger: 'smoke',
        userPrompt: '문서 0건과 최근 활동을 반영해 현재 상태와 다음 액션을 정리해줘.',
        project: {
          id: 'mentor-smoke-project',
          founderId: 'mentor-smoke-user',
          title: 'WETHUS Commerce Hub',
          category: 'StartupBusiness',
          status: '진행 중',
          summary: '학생 창업 플랫폼의 배포 안정화와 사용자 흐름 고도화 작업'
        },
        hub: {
          goal: '좋아요, 댓글, 지원서, AI 멘토 흐름을 상용 수준으로 안정화한다.',
          weeklyTodos: ['배포 이슈 재현', '핵심 흐름 회귀 테스트', '멘토 답변 품질 개선'],
          recentActivities: [{ text: 'Google Docs 연동 상태를 점검했다.' }],
          teamChat: [{ from: 'Leader', text: '배포 전 좋아요와 댓글이 실제로 반영되는지 다시 보자.' }],
          materials: [{ name: 'launch-checklist.md' }],
          tools: [{ name: 'Google Docs', connected: true, desc: '운영 체크리스트' }]
        },
        insights: [
          { resourceName: 'launch-checklist.md', snippet: '좋아요, 댓글, 지원서, OAuth, 탐색 반영을 출시 전 확인한다.' }
        ],
        events: [
          { event_type: 'integration_synced', source_type: 'google_docs', source_item_name: '운영 체크리스트', occurred_at: new Date().toISOString() }
        ],
        statusSnapshot: {
          current_stage: '진행 중',
          recent_activity_summary: '운영 체크리스트 기준 회귀 점검 중',
          suggested_next_action: '좋아요와 댓글 흐름 재검증'
        }
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      fail(`/ai/project-mentor should return 200, got ${response.status}`);
    }
    if (!payload?.ok) {
      fail('/ai/project-mentor should return ok=true');
    }
    if (!String(payload?.summary || '').trim()) {
      fail('project mentor response should include a summary');
    }
    if (!String(payload?.priority || '').trim()) {
      fail('project mentor response should include a priority');
    }
    if (!String(payload?.executionBlocker || '').trim()) {
      fail('project mentor response should include executionBlocker');
    }
    if (!String(payload?.mentorMode || '').trim()) {
      fail('project mentor response should include mentorMode');
    }
    if (!String(payload?.reviewedAt || '').trim()) {
      fail('project mentor response should include reviewedAt');
    }
    if (payload?.memory?.enabled !== true) {
      fail('project mentor response should enable actor-scoped memory');
    }
    if (Number(payload?.memory?.stats?.nodes || 0) < 3) {
      fail('project mentor response should persist graph nodes');
    }
    if (payload?.projectContextual !== true || payload?.responseMode !== 'project') {
      fail('project mentor should preserve the model decision that this turn uses project context');
    }
    if (!Array.isArray(payload?.understanding?.selectedNodeIds)) {
      fail('project mentor understanding should expose selected graph records');
    }
    if (payload?.understanding?.method !== 'model-native-reference-reasoning-v1') {
      fail('project mentor should report model-native reference reasoning');
    }
    if (Number(payload?.understanding?.evidenceCount || 0) < 1) {
      fail('model-native response should identify factual records it used');
    }
    if (Number(payload?.references?.availableReferenceCount || 0) < 3) {
      fail('project mentor should prepare a project reference packet before asking the model');
    }
    if (Number(payload?.references?.usedReferenceCount || 0) < 1) {
      fail('project mentor should expose which prepared records the model actually used');
    }
    if (payload?.memory?.retrieval?.mode !== 'hybrid-context-candidates') {
      fail('project mentor should report hybrid context retrieval');
    }
    if (/\[(?:Task|Activity|Project|Resource)\]|출처\s/.test(String(payload?.summary || ''))) {
      fail('project mentor summary should not paste provenance labels into the answer');
    }
    expectList('nextActions', payload?.nextActions, 3);
    expectList('questions', payload?.questions, 2);
    expectList('toolActions', payload?.toolActions, 2);
    expectList('evidenceGaps', payload?.evidenceGaps, 3);
    expectList('grounding', payload?.grounding, 4);
    const selectorPrompt = capturedPrompts.find((item) => item.includes('REFERENCE_SELECTOR')) || '';
    const answerPrompt = capturedPrompts.find((item) => item.includes('Selected project context:')) || '';
    if (!selectorPrompt.includes('Reference index:') || !selectorPrompt.includes('좋아요와 댓글')) {
      fail('reference selector should receive the prepared project reference index');
    }
    if (!answerPrompt.includes('Selected project context:')) {
      fail('answer model should receive only the selected project context');
    }

    for (const [prompt, expectedMode] of [['안녕', 'conversation'], ['?', 'clarification']]) {
      const conversationResponse = await fetch(`${baseUrl}/ai/project-mentor`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-user-id': 'mentor-smoke-user' },
        body: JSON.stringify({
          actorId: 'mentor-smoke-user',
          sessionId: 'mentor-smoke-session',
          trigger: 'conversation-smoke',
          userPrompt: prompt,
          project: {
            id: 'mentor-smoke-project',
            founderId: 'mentor-smoke-user',
            title: 'WETHUS Commerce Hub',
            category: 'StartupBusiness',
            status: '진행 중'
          },
          hub: { weeklyTodos: ['배포 이슈 재현'] }
        })
      });
      const conversationPayload = await conversationResponse.json().catch(() => ({}));
      if (!conversationResponse.ok || !conversationPayload?.ok) fail(`${expectedMode} conversation should return ok=true`);
      if (conversationPayload?.conversationMode !== expectedMode) fail(`${expectedMode} conversation mode should be preserved`);
      if (conversationPayload?.projectContextual !== false) fail(`${expectedMode} conversation should not mutate project context`);
      if (!String(conversationPayload?.summary || '').trim()) fail(`${expectedMode} conversation should include a natural reply`);
      if (conversationPayload?.nextActions?.length) fail(`${expectedMode} conversation should not manufacture project actions`);
      if (conversationPayload?.grounding?.length) fail(`${expectedMode} conversation should not manufacture project evidence`);
      if (Number(conversationPayload?.references?.availableReferenceCount || 0) < 1) {
        fail(`${expectedMode} conversation should still receive prepared reference material`);
      }
      if (Number(conversationPayload?.references?.usedReferenceCount || 0) !== 0) {
        fail(`${expectedMode} conversation should not pretend it used project records`);
      }
      const capturedPrompt = [...capturedPrompts].reverse()
        .find((item) => item.includes(`Current user message:\n${prompt}`) && item.includes('Selected conversation context:')) || '';
      if (!capturedPrompt.includes('Selected conversation context:') || !capturedPrompt.includes(`Current user message:\n${prompt}`)) {
        fail(`${expectedMode} request should be answered naturally without injecting the full project index`);
      }
    }

    const memoryResponse = await fetch(`${baseUrl}/ai/memory/graph?limit=100`, {
      headers: { 'x-user-id': 'mentor-smoke-user' }
    });
    const memoryPayload = await memoryResponse.json().catch(() => ({}));
    if (!memoryResponse.ok || !memoryPayload?.ok) {
      fail('AI memory graph endpoint should return the actor graph');
    }
    if (!memoryPayload?.graph?.nodes?.some((node) => node.type === 'Project' && node.label === 'WETHUS Commerce Hub')) {
      fail('AI memory graph should contain the project node');
    }
    if (!memoryPayload?.graph?.nodes?.some((node) => node.type === 'Message' && String(node.summary || '').includes('좋아요와 댓글'))) {
      fail('AI memory graph should contain accessible project team chat');
    }
    if (!memoryPayload?.graph?.nodes?.some((node) => node.type === 'StatusSnapshot' && node.label === '진행 중')) {
      fail('AI memory graph should contain the latest project status snapshot');
    }
    if (Number(memoryPayload?.graph?.stats?.episodes || 0) < 2) {
      fail('AI memory graph should retain the user and assistant episodes');
    }
    const assistantEpisode = memoryPayload?.graph?.nodes?.find((node) => node.type === 'Episode' && node.attributes?.role === 'assistant');
    if (/\[(?:Task|Activity|Project|Resource)\]|출처\s/.test(String(assistantEpisode?.summary || ''))) {
      fail('assistant memory should retain meaning without pasted provenance lines');
    }

    const deleteResponse = await fetch(`${baseUrl}/ai/memory`, {
      method: 'DELETE',
      headers: { 'x-user-id': 'mentor-smoke-user' }
    });
    const deletePayload = await deleteResponse.json().catch(() => ({}));
    if (!deleteResponse.ok || deletePayload?.deleted !== true) {
      fail('AI memory delete endpoint should forget the current actor graph');
    }
    const forgottenResponse = await fetch(`${baseUrl}/ai/memory/graph`, {
      headers: { 'x-user-id': 'mentor-smoke-user' }
    });
    const forgottenPayload = await forgottenResponse.json().catch(() => ({}));
    if (Number(forgottenPayload?.graph?.stats?.nodes || 0) !== 0) {
      fail('deleted AI memory should not remain readable');
    }
  } catch (error) {
    fail(error.message || String(error));
  } finally {
    await stopChild(child);
    await closeServer(mockOllama);
    fs.rmSync(smokeDataDir, { recursive: true, force: true });
  }

  if (errors.length) {
    console.error('Project mentor smoke failures:');
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log('Project mentor smoke passed.');
})();
