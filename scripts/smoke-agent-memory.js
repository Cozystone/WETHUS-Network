const path = require('path');
const { pathToFileURL } = require('url');

const errors = [];

function fail(message) {
  errors.push(message);
}

(async () => {
  const moduleUrl = pathToFileURL(path.resolve(__dirname, '..', 'WETHUS2', 'backend', 'agent-memory.js')).href;
  const { createAgentMemoryStore } = await import(moduleUrl);
  let document = { version: 1, scopes: {} };
  let tick = 0;
  const store = createAgentMemoryStore({
    read: () => JSON.parse(JSON.stringify(document)),
    write: (next) => { document = JSON.parse(JSON.stringify(next)); },
    clock: () => new Date(Date.UTC(2026, 7, 14, 9, 0, tick++))
  });

  const actorId = 'memory-smoke-founder';
  const projectId = 'memory-smoke-project';
  const ingest = store.ingest(actorId, {
    actor: {
      id: actorId,
      name: 'Memory Founder',
      headline: '청소년 창업가',
      interestTags: ['사용자 리서치', '지역 창업']
    },
    users: [{ id: 'memory-smoke-researcher', name: 'Research Partner', headline: '인터뷰 설계' }],
    projects: [{
      id: projectId,
      title: '청소년 상권 팝업 실험',
      founderId: actorId,
      category: 'Startup',
      status: '진행 중',
      summary: '지역 청소년과 소상공인을 연결하는 팝업을 검증한다.'
    }],
    focusProject: { id: projectId, title: '청소년 상권 팝업 실험', founderId: actorId },
    projectHubs: {
      [projectId]: {
        goal: '이번 주 사용자 인터뷰 5명을 완료한다.',
        weeklyTodos: ['인터뷰 질문지 확정', '사용자 인터뷰 5명 진행'],
        recentActivities: [{ id: 'activity-1', text: '상인 인터뷰 2건 완료', createdAt: '2026-08-14T08:30:00.000Z' }],
        materials: [{ id: 'doc-1', name: '인터뷰 질문지', snippet: '가격 민감도와 방문 동기를 묻는다.' }],
        tools: [{ id: 'google-docs', name: 'Google Docs', connected: true, desc: '질문지와 인터뷰 메모' }]
      }
    },
    connections: [{ id: 'connection-1', actorId, targetUserId: 'memory-smoke-researcher', status: 'connected' }]
  });

  if (!ingest || ingest.nodes < 7) fail(`expected graph nodes, got ${ingest?.nodes || 0}`);
  if (ingest?.edges < 6) fail(`expected graph edges, got ${ingest?.edges || 0}`);

  store.remember(actorId, {
    role: 'user',
    text: '인터뷰 진행 상황과 다음 우선순위를 기억해줘.',
    projectId,
    sessionId: 'memory-smoke-session'
  });
  store.remember(actorId, {
    role: 'assistant',
    text: '질문지를 확정하고 남은 인터뷰 3명을 먼저 진행하세요.',
    projectId,
    sessionId: 'memory-smoke-session',
    provider: 'ollama',
    model: 'dolphin3:latest'
  });

  const recall = store.recall(actorId, '인터뷰 우선순위와 연결된 팀원을 알려줘', { projectId, limit: 20 });
  if (!recall.contextText.includes('청소년 상권 팝업 실험')) fail('recall should include the focused project');
  if (!recall.contextText.includes('사용자 인터뷰 5명 진행')) fail('recall should include a relevant task');
  if (!recall.contextText.includes('Research Partner')) fail('graph traversal should include a connected person');
  if (!recall.contextText.includes('Google Docs')) fail('recall should include a connected tool');
  if (recall.stats.episodes !== 2) fail(`expected 2 episodes, got ${recall.stats.episodes}`);
  if (!recall.sources.length) fail('recall should retain source provenance');

  const isolated = store.inspect('different-user');
  if (isolated.stats.nodes !== 0 || isolated.stats.edges !== 0) fail('memory must be isolated by actor');

  const restoredStore = createAgentMemoryStore({
    read: () => JSON.parse(JSON.stringify(document)),
    write: (next) => { document = JSON.parse(JSON.stringify(next)); }
  });
  const restored = restoredStore.recall(actorId, '지난 인터뷰 답변', { projectId });
  if (!restored.contextText.includes('남은 인터뷰 3명')) fail('memory should persist across store instances');

  if (!store.forget(actorId)) fail('forget should delete an existing actor graph');
  if (store.inspect(actorId).stats.nodes !== 0) fail('forgotten memory should not remain readable');

  if (errors.length) {
    console.error('Agent memory smoke failures:');
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }
  console.log('Agent memory smoke passed.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
