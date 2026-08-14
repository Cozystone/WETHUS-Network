import crypto from 'crypto';

const GRAPH_VERSION = 1;
const DEFAULT_LIMITS = Object.freeze({
  nodes: 2400,
  edges: 4800,
  episodes: 240
});

function text(value, max = 1200) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function list(value, max = 20) {
  return (Array.isArray(value) ? value : [])
    .map((item) => text(item, 240))
    .filter(Boolean)
    .slice(0, max);
}

function iso(value, fallback) {
  const parsed = new Date(value || '').getTime();
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
}

function stableId(prefix, ...parts) {
  const digest = crypto
    .createHash('sha256')
    .update(parts.map((part) => String(part || '')).join('\u001f'))
    .digest('hex')
    .slice(0, 24);
  return `${prefix}:${digest}`;
}

function scopeKey(actorId) {
  return stableId('scope', actorId).slice(6);
}

function tokenize(input) {
  const source = text(input, 10000).toLowerCase();
  const tokens = new Set(source.split(/[^\p{L}\p{N}]+/u).filter((item) => item.length > 1));
  const hangulChunks = source.match(/[가-힣]{2,}/g) || [];
  for (const chunk of hangulChunks) {
    for (let size = 2; size <= Math.min(3, chunk.length); size += 1) {
      for (let index = 0; index <= chunk.length - size; index += 1) {
        tokens.add(chunk.slice(index, index + size));
      }
    }
  }
  return tokens;
}

function safeAttributes(input = {}) {
  const output = {};
  for (const [key, value] of Object.entries(input || {})) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      const values = value.map((item) => text(item, 180)).filter(Boolean).slice(0, 20);
      if (values.length) output[key] = values;
      continue;
    }
    if (typeof value === 'boolean' || typeof value === 'number') {
      output[key] = value;
      continue;
    }
    const normalized = text(value, 800);
    if (normalized) output[key] = normalized;
  }
  return output;
}

function sourceMeta(kind, id = '', label = '') {
  return {
    kind: text(kind, 80),
    id: text(id, 180),
    label: text(label || kind, 180)
  };
}

function emptyDocument(now) {
  return { version: GRAPH_VERSION, updatedAt: now, scopes: {} };
}

function normalizeDocument(value, now) {
  if (!value || typeof value !== 'object') return emptyDocument(now);
  return {
    version: GRAPH_VERSION,
    updatedAt: text(value.updatedAt, 60) || now,
    scopes: value.scopes && typeof value.scopes === 'object' ? value.scopes : {}
  };
}

function createScope(actorId, now) {
  return {
    actorId: text(actorId, 180),
    createdAt: now,
    updatedAt: now,
    lastIngestedAt: '',
    nodes: [],
    edges: [],
    episodeIds: []
  };
}

function upsertNode(scope, node, now) {
  if (!node?.id || !node?.type || !node?.label) return null;
  const index = scope.nodes.findIndex((item) => item.id === node.id);
  const previous = index >= 0 ? scope.nodes[index] : {};
  const next = {
    ...previous,
    ...node,
    summary: text(node.summary || previous.summary, 1400),
    attributes: safeAttributes({ ...(previous.attributes || {}), ...(node.attributes || {}) }),
    source: node.source || previous.source || sourceMeta('wethus'),
    validFrom: iso(node.validFrom || previous.validFrom, now),
    validTo: node.validTo === null ? null : (text(node.validTo || previous.validTo, 60) || null),
    createdAt: previous.createdAt || now,
    updatedAt: now,
    lastSeenAt: now
  };
  if (index >= 0) scope.nodes[index] = next;
  else scope.nodes.push(next);
  return next;
}

function upsertEdge(scope, edge, now) {
  if (!edge?.from || !edge?.to || !edge?.type) return null;
  const id = edge.id || stableId('edge', edge.from, edge.type, edge.to);
  const index = scope.edges.findIndex((item) => item.id === id);
  const previous = index >= 0 ? scope.edges[index] : {};
  const next = {
    ...previous,
    ...edge,
    id,
    summary: text(edge.summary || previous.summary, 800),
    attributes: safeAttributes({ ...(previous.attributes || {}), ...(edge.attributes || {}) }),
    source: edge.source || previous.source || sourceMeta('wethus'),
    validFrom: iso(edge.validFrom || previous.validFrom, now),
    validTo: edge.validTo === null ? null : (text(edge.validTo || previous.validTo, 60) || null),
    createdAt: previous.createdAt || now,
    updatedAt: now,
    lastSeenAt: now
  };
  if (index >= 0) scope.edges[index] = next;
  else scope.edges.push(next);
  return next;
}

function projectNodeId(projectId) {
  return `project:${text(projectId, 180)}`;
}

function personNodeId(userId) {
  return `person:${text(userId, 180)}`;
}

function projectHub(snapshot, projectId) {
  const hubs = snapshot?.projectHubs;
  if (!hubs) return {};
  if (Array.isArray(hubs)) {
    return hubs.find((item) => String(item?.projectId || item?.id || '') === String(projectId)) || {};
  }
  return hubs[projectId] || {};
}

function addPerson(scope, user, now, source = sourceMeta('wethus-profile')) {
  const id = text(user?.id || user?.userId, 180);
  if (!id) return null;
  const label = text(user?.name || user?.nickname || user?.headline || 'WETHUS 사용자', 180);
  const portfolio = [
    user?.headline,
    user?.bio,
    user?.intro,
    user?.school,
    user?.major,
    user?.experience,
    user?.portfolioSummary,
    ...(Array.isArray(user?.interestTags) ? user.interestTags : []),
    ...(Array.isArray(user?.skills) ? user.skills : [])
  ].map((item) => text(item, 300)).filter(Boolean);
  return upsertNode(scope, {
    id: personNodeId(id),
    type: 'Person',
    label,
    summary: portfolio.join(' · ').slice(0, 1400),
    attributes: {
      nickname: user?.nickname,
      headline: user?.headline,
      school: user?.school,
      major: user?.major,
      interests: user?.interestTags,
      skills: user?.skills
    },
    source
  }, now);
}

function addProject(scope, actorId, project, hub, now) {
  const id = text(project?.id, 180);
  if (!id) return null;
  const nodeId = projectNodeId(id);
  const label = text(project?.title || 'WETHUS 프로젝트', 220);
  const summary = [project?.summary, project?.description, project?.fullDescription, hub?.goal]
    .map((item) => text(item, 500))
    .filter(Boolean)
    .join(' · ')
    .slice(0, 1400);
  upsertNode(scope, {
    id: nodeId,
    type: 'Project',
    label,
    summary,
    attributes: {
      projectId: id,
      category: project?.category,
      normalizedCategory: project?.normalizedCategory,
      status: project?.status,
      moderationStatus: project?.moderationStatus,
      roles: project?.roles,
      teamSize: project?.teamSize,
      goal: hub?.goal
    },
    source: sourceMeta('wethus-project', id, label),
    validFrom: project?.createdAt
  }, now);

  const actorNode = personNodeId(actorId);
  const founderId = text(project?.founderId, 180);
  const relation = founderId && founderId === String(actorId) ? 'FOUNDED' : 'PARTICIPATES_IN';
  upsertEdge(scope, {
    from: actorNode,
    to: nodeId,
    type: relation,
    source: sourceMeta('wethus-project', id, label)
  }, now);

  for (const member of (Array.isArray(project?.teamMembers) ? project.teamMembers : []).slice(0, 40)) {
    const person = addPerson(scope, member, now, sourceMeta('wethus-team', id, label));
    if (!person) continue;
    upsertEdge(scope, {
      from: person.id,
      to: nodeId,
      type: member?.isLeader ? 'LEADS' : 'MEMBER_OF',
      attributes: { role: member?.role || member?.position },
      source: sourceMeta('wethus-team', id, label)
    }, now);
  }

  const todos = Array.isArray(hub?.weeklyTodos) ? hub.weeklyTodos : [];
  for (const [index, value] of todos.slice(0, 30).entries()) {
    const title = text(typeof value === 'string' ? value : value?.title, 240);
    if (!title) continue;
    const taskId = stableId('task', id, title);
    upsertNode(scope, {
      id: taskId,
      type: 'Task',
      label: title,
      summary: text(typeof value === 'object' ? value?.description : '', 600),
      attributes: { projectId: id, order: index + 1, status: value?.status || '' },
      source: sourceMeta('wethus-project-hub', id, label),
      validFrom: value?.createdAt
    }, now);
    upsertEdge(scope, {
      from: nodeId,
      to: taskId,
      type: 'HAS_TASK',
      source: sourceMeta('wethus-project-hub', id, label)
    }, now);
  }

  const activities = Array.isArray(hub?.recentActivities) ? hub.recentActivities : [];
  for (const [index, activity] of activities.slice(-40).entries()) {
    const activityText = text(activity?.text || activity?.summary || activity, 700);
    if (!activityText) continue;
    const occurredAt = iso(activity?.createdAt || activity?.occurredAt, now);
    const activityId = text(activity?.id, 180) || stableId('activity', id, activityText, occurredAt, index);
    upsertNode(scope, {
      id: activityId.startsWith('activity:') ? activityId : `activity:${activityId}`,
      type: 'Activity',
      label: activityText.slice(0, 180),
      summary: activityText,
      attributes: { projectId: id, kind: activity?.kind || activity?.type || '' },
      source: sourceMeta('wethus-project-hub', id, label),
      validFrom: occurredAt
    }, now);
    upsertEdge(scope, {
      from: nodeId,
      to: activityId.startsWith('activity:') ? activityId : `activity:${activityId}`,
      type: 'HAS_ACTIVITY',
      source: sourceMeta('wethus-project-hub', id, label),
      validFrom: occurredAt
    }, now);
  }

  const teamChat = Array.isArray(hub?.teamChat) ? hub.teamChat : [];
  for (const [index, message] of teamChat.slice(-40).entries()) {
    if (String(message?.channel || '').toLowerCase() === 'ai_mentor' || String(message?.kind || '').toLowerCase() === 'ai') continue;
    const author = text(message?.from || message?.author || message?.name || '팀원', 100);
    const messageText = text(message?.text || message?.message || message, 900);
    if (!messageText) continue;
    const occurredAt = iso(message?.createdAt || message?.sentAt, now);
    const messageId = text(message?.id, 180) || stableId('message', id, author, messageText, occurredAt, index);
    const nodeMessageId = messageId.startsWith('message:') ? messageId : `message:${messageId}`;
    upsertNode(scope, {
      id: nodeMessageId,
      type: 'Message',
      label: `${author}: ${messageText.slice(0, 140)}`,
      summary: messageText,
      attributes: { projectId: id, author },
      source: sourceMeta('wethus-team-chat', message?.id || messageId, label),
      validFrom: occurredAt
    }, now);
    upsertEdge(scope, {
      from: nodeId,
      to: nodeMessageId,
      type: 'HAS_MESSAGE',
      source: sourceMeta('wethus-team-chat', message?.id || messageId, label),
      validFrom: occurredAt
    }, now);
  }

  const materials = Array.isArray(hub?.materials) ? hub.materials : [];
  for (const material of materials.slice(0, 40)) {
    const name = text(material?.name || material?.title || material, 240);
    if (!name) continue;
    const resourceId = stableId('resource', id, material?.id || material?.url || name);
    upsertNode(scope, {
      id: resourceId,
      type: 'Resource',
      label: name,
      summary: text(material?.snippet || material?.description || '', 900),
      attributes: { projectId: id, type: material?.type || '', provider: material?.provider || '' },
      source: sourceMeta('wethus-material', material?.id || name, name)
    }, now);
    upsertEdge(scope, {
      from: nodeId,
      to: resourceId,
      type: 'HAS_RESOURCE',
      source: sourceMeta('wethus-material', material?.id || name, name)
    }, now);
  }

  const tools = Array.isArray(hub?.tools) ? hub.tools : [];
  for (const tool of tools.filter((item) => item?.connected).slice(0, 30)) {
    const name = text(tool?.name || tool?.provider, 180);
    if (!name) continue;
    const toolId = stableId('integration', id, tool?.id || tool?.provider || name);
    upsertNode(scope, {
      id: toolId,
      type: 'Integration',
      label: name,
      summary: text(tool?.desc || tool?.description, 700),
      attributes: { projectId: id, provider: tool?.provider || name, connected: true },
      source: sourceMeta('wethus-integration', tool?.id || name, name)
    }, now);
    upsertEdge(scope, {
      from: nodeId,
      to: toolId,
      type: 'USES_TOOL',
      source: sourceMeta('wethus-integration', tool?.id || name, name)
    }, now);
  }
  return nodeId;
}

function pruneScope(scope, limits) {
  const nodePriority = (node) => {
    const typeWeight = ['Person', 'Project', 'Integration'].includes(node.type) ? 10 : 0;
    return typeWeight + new Date(node.lastSeenAt || node.updatedAt || 0).getTime() / 1e13;
  };
  scope.nodes = scope.nodes
    .sort((a, b) => nodePriority(b) - nodePriority(a))
    .slice(0, limits.nodes);
  const nodeIds = new Set(scope.nodes.map((node) => node.id));
  scope.edges = scope.edges
    .filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to))
    .sort((a, b) => new Date(b.lastSeenAt || b.updatedAt || 0) - new Date(a.lastSeenAt || a.updatedAt || 0))
    .slice(0, limits.edges);
  scope.episodeIds = scope.episodeIds.filter((id) => nodeIds.has(id)).slice(-limits.episodes);
}

function nodeSearchText(node) {
  return [node.type, node.label, node.summary, ...Object.values(node.attributes || {}).flat()]
    .map((item) => text(item, 1200))
    .filter(Boolean)
    .join(' ');
}

function recencyScore(node, nowMs) {
  const stamp = new Date(node.validFrom || node.updatedAt || node.lastSeenAt || 0).getTime();
  if (!Number.isFinite(stamp) || stamp <= 0) return 0;
  const ageDays = Math.max(0, (nowMs - stamp) / 86400000);
  return Math.max(0, 2.5 - Math.log10(ageDays + 1));
}

function relationSentence(edge, labels) {
  const from = labels.get(edge.from) || edge.from;
  const to = labels.get(edge.to) || edge.to;
  const relation = {
    FOUNDED: '창업했다',
    PARTICIPATES_IN: '참여한다',
    LEADS: '이끈다',
    MEMBER_OF: '팀원이다',
    CONNECTED_TO: '연결되어 있다',
    HAS_TASK: '작업으로 가진다',
    HAS_ACTIVITY: '활동 기록으로 가진다',
    HAS_RESOURCE: '자료로 가진다',
    USES_TOOL: '도구로 사용한다',
    HAS_MESSAGE: '팀 대화 기록으로 가진다',
    HAS_STATUS: '진척도 스냅샷으로 가진다',
    BOOKMARKED: '관심 프로젝트로 저장했다',
    APPLIED_TO: '지원했다',
    ASKED: '질문했다',
    RECEIVED: '답변을 받았다',
    ABOUT_PROJECT: '프로젝트에 관한 기록이다'
  }[edge.type] || edge.type;
  return `${from} → ${relation} → ${to}`;
}

export function createAgentMemoryStore({ read, write, clock = () => new Date(), limits = {} }) {
  if (typeof read !== 'function' || typeof write !== 'function') {
    throw new TypeError('agent memory requires read and write functions');
  }
  const resolvedLimits = { ...DEFAULT_LIMITS, ...limits };

  function load() {
    const now = clock().toISOString();
    try {
      return normalizeDocument(read(), now);
    } catch {
      return emptyDocument(now);
    }
  }

  function save(document) {
    document.version = GRAPH_VERSION;
    document.updatedAt = clock().toISOString();
    write(document);
  }

  function withScope(actorId, mutator) {
    const normalizedActorId = text(actorId, 180);
    if (!normalizedActorId) return null;
    const now = clock().toISOString();
    const document = load();
    const key = scopeKey(normalizedActorId);
    const scope = document.scopes[key] || createScope(normalizedActorId, now);
    const result = mutator(scope, now);
    scope.updatedAt = now;
    pruneScope(scope, resolvedLimits);
    document.scopes[key] = scope;
    save(document);
    return result;
  }

  function ingest(actorId, snapshot = {}) {
    return withScope(actorId, (scope, now) => {
      const actor = snapshot.actor || { id: actorId, name: snapshot.actorName || 'WETHUS 사용자' };
      addPerson(scope, { ...actor, id: actorId }, now);
      const users = new Map((Array.isArray(snapshot.users) ? snapshot.users : [])
        .filter((user) => user?.id)
        .map((user) => [String(user.id), user]));

      const projectsById = new Map();
      for (const project of [snapshot.focusProject, ...(Array.isArray(snapshot.projects) ? snapshot.projects : [])]) {
        if (project?.id) projectsById.set(String(project.id), project);
      }
      for (const project of projectsById.values()) {
        addProject(scope, actorId, project, projectHub(snapshot, project.id), now);
      }

      for (const status of (Array.isArray(snapshot.statusSnapshots) ? snapshot.statusSnapshots : []).slice(-120)) {
        const projectId = text(status?.project_id || status?.projectId, 180);
        if (!projectId) continue;
        const updatedAt = iso(status?.updated_at || status?.updatedAt || status?.recent_activity_at, now);
        const statusSummary = [status?.recent_activity_summary, status?.blocker_summary, status?.suggested_next_action]
          .map((item) => text(item, 420))
          .filter(Boolean)
          .join(' · ');
        const statusId = stableId('status', projectId, updatedAt, statusSummary);
        upsertNode(scope, {
          id: statusId,
          type: 'StatusSnapshot',
          label: text(status?.current_stage || '프로젝트 진척도', 180),
          summary: statusSummary,
          attributes: {
            projectId,
            activityHealth: status?.activity_health,
            blocker: status?.blocker_summary,
            suggestedNextAction: status?.suggested_next_action
          },
          source: sourceMeta('wethus-status-snapshot', status?.id || statusId, 'WETHUS 진척도'),
          validFrom: updatedAt
        }, now);
        upsertEdge(scope, {
          from: projectNodeId(projectId),
          to: statusId,
          type: 'HAS_STATUS',
          source: sourceMeta('wethus-status-snapshot', status?.id || statusId, 'WETHUS 진척도'),
          validFrom: updatedAt
        }, now);
      }

      for (const connection of (Array.isArray(snapshot.connections) ? snapshot.connections : []).slice(0, 200)) {
        const targetId = text(connection?.targetUserId || connection?.peerId || connection?.userId, 180);
        if (!targetId || targetId === String(actorId)) continue;
        const person = addPerson(scope, users.get(targetId) || {
          id: targetId,
          name: connection?.targetName || connection?.name || '연결된 WETHUS 사용자',
          headline: connection?.headline || ''
        }, now, sourceMeta('wethus-connection', connection?.id || targetId));
        if (!person) continue;
        upsertEdge(scope, {
          from: personNodeId(actorId),
          to: person.id,
          type: 'CONNECTED_TO',
          attributes: { status: connection?.status || 'connected' },
          source: sourceMeta('wethus-connection', connection?.id || targetId)
        }, now);
      }

      for (const event of (Array.isArray(snapshot.events) ? snapshot.events : []).slice(-300)) {
        const projectId = text(event?.projectId || event?.project_id, 180);
        const eventText = text(event?.text || event?.summary || event?.event_type || event?.action, 700);
        if (!eventText) continue;
        const occurredAt = iso(event?.occurred_at || event?.occurredAt || event?.createdAt, now);
        const eventId = `activity:${text(event?.id, 180) || stableId('event', projectId, eventText, occurredAt).slice(6)}`;
        upsertNode(scope, {
          id: eventId,
          type: 'Activity',
          label: text(event?.source_item_name || event?.sourceItemName || eventText, 180),
          summary: eventText,
          attributes: {
            projectId,
            eventType: event?.event_type || event?.action || event?.type,
            sourceType: event?.source_type || event?.sourceType
          },
          source: sourceMeta('wethus-activity', event?.id || eventId, event?.source_item_name || 'WETHUS 활동'),
          validFrom: occurredAt
        }, now);
        upsertEdge(scope, {
          from: projectId ? projectNodeId(projectId) : personNodeId(actorId),
          to: eventId,
          type: 'HAS_ACTIVITY',
          source: sourceMeta('wethus-activity', event?.id || eventId),
          validFrom: occurredAt
        }, now);
      }

      for (const integration of (Array.isArray(snapshot.integrations) ? snapshot.integrations : []).slice(0, 100)) {
        const projectId = text(integration?.project_id || integration?.projectId, 180);
        const name = text(integration?.resource_name || integration?.resourceName || integration?.provider, 180);
        if (!name) continue;
        const integrationId = stableId('integration', projectId, integration?.id || integration?.provider || name);
        upsertNode(scope, {
          id: integrationId,
          type: 'Integration',
          label: name,
          summary: text(integration?.resource_url || integration?.resourceUrl || integration?.integration_type, 700),
          attributes: {
            projectId,
            provider: integration?.provider,
            type: integration?.integration_type || integration?.integrationType,
            webhookHealth: integration?.webhook_health
          },
          source: sourceMeta('wethus-integration', integration?.id || name, name)
        }, now);
        upsertEdge(scope, {
          from: projectId ? projectNodeId(projectId) : personNodeId(actorId),
          to: integrationId,
          type: 'USES_TOOL',
          source: sourceMeta('wethus-integration', integration?.id || name, name)
        }, now);
      }

      for (const insight of (Array.isArray(snapshot.insights) ? snapshot.insights : []).slice(-120)) {
        const projectId = text(insight?.projectId || insight?.project_id, 180);
        const name = text(insight?.resourceName || insight?.sourceFolderName || insight?.name || '연결 서비스 인사이트', 220);
        const snippet = text(insight?.snippet || insight?.summary || insight?.text, 1200);
        if (!snippet) continue;
        const resourceId = stableId('resource', projectId, insight?.id || name, snippet.slice(0, 160));
        upsertNode(scope, {
          id: resourceId,
          type: 'Resource',
          label: name,
          summary: snippet,
          attributes: {
            projectId,
            provider: insight?.provider || insight?.sourceType,
            resourceType: insight?.resourceType || insight?.type
          },
          source: sourceMeta('wethus-integration-insight', insight?.id || name, name),
          validFrom: insight?.createdAt || insight?.updatedAt
        }, now);
        upsertEdge(scope, {
          from: projectId ? projectNodeId(projectId) : personNodeId(actorId),
          to: resourceId,
          type: 'HAS_RESOURCE',
          source: sourceMeta('wethus-integration-insight', insight?.id || name, name)
        }, now);
      }

      for (const bookmark of (Array.isArray(snapshot.bookmarks) ? snapshot.bookmarks : []).slice(0, 200)) {
        const projectId = text(bookmark?.projectId || bookmark?.project_id || bookmark, 180);
        if (!projectId) continue;
        upsertEdge(scope, {
          from: personNodeId(actorId),
          to: projectNodeId(projectId),
          type: 'BOOKMARKED',
          source: sourceMeta('wethus-bookmark', bookmark?.id || projectId),
          validFrom: bookmark?.createdAt
        }, now);
      }

      for (const application of (Array.isArray(snapshot.applications) ? snapshot.applications : []).slice(0, 200)) {
        const projectId = text(application?.projectId || application?.project_id, 180);
        if (!projectId) continue;
        upsertEdge(scope, {
          from: personNodeId(actorId),
          to: projectNodeId(projectId),
          type: 'APPLIED_TO',
          attributes: { status: application?.status || '' },
          source: sourceMeta('wethus-application', application?.id || projectId),
          validFrom: application?.createdAt
        }, now);
      }

      scope.lastIngestedAt = now;
      return {
        nodes: scope.nodes.length,
        edges: scope.edges.length,
        episodes: scope.episodeIds.length,
        lastIngestedAt: now
      };
    });
  }

  function remember(actorId, episode = {}) {
    return withScope(actorId, (scope, now) => {
      const role = episode.role === 'assistant' || episode.role === 'ai' ? 'assistant' : 'user';
      const content = text(episode.text || episode.content, 2200);
      if (!content) return null;
      const projectId = text(episode.projectId, 180);
      const episodeId = `episode:${text(episode.id, 180) || crypto.randomUUID()}`;
      upsertNode(scope, {
        id: episodeId,
        type: 'Episode',
        label: role === 'assistant' ? 'WETHUS AI 답변' : '사용자 질문',
        summary: content,
        attributes: {
          role,
          projectId,
          sessionId: episode.sessionId,
          model: episode.model,
          provider: episode.provider
        },
        source: sourceMeta('wethus-ai-conversation', episode.id || episodeId, role),
        validFrom: episode.createdAt
      }, now);
      upsertEdge(scope, {
        from: personNodeId(actorId),
        to: episodeId,
        type: role === 'assistant' ? 'RECEIVED' : 'ASKED',
        source: sourceMeta('wethus-ai-conversation', episode.id || episodeId),
        validFrom: episode.createdAt
      }, now);
      if (projectId) {
        upsertEdge(scope, {
          from: episodeId,
          to: projectNodeId(projectId),
          type: 'ABOUT_PROJECT',
          source: sourceMeta('wethus-ai-conversation', episode.id || episodeId),
          validFrom: episode.createdAt
        }, now);
      }
      scope.episodeIds = [...scope.episodeIds.filter((id) => id !== episodeId), episodeId].slice(-resolvedLimits.episodes);
      return episodeId;
    });
  }

  function recall(actorId, query, options = {}) {
    const normalizedActorId = text(actorId, 180);
    if (!normalizedActorId) return { contextText: '', nodes: [], edges: [], sources: [], stats: { nodes: 0, edges: 0, episodes: 0 } };
    const document = load();
    const scope = document.scopes[scopeKey(normalizedActorId)];
    if (!scope) return { contextText: '', nodes: [], edges: [], sources: [], stats: { nodes: 0, edges: 0, episodes: 0 } };

    const queryTokens = tokenize(query);
    const projectId = text(options.projectId, 180);
    const nowMs = clock().getTime();
    const scored = scope.nodes
      .filter((node) => !node.validTo)
      .map((node) => {
        const nodeTokens = tokenize(nodeSearchText(node));
        let overlap = 0;
        for (const token of queryTokens) if (nodeTokens.has(token)) overlap += 1;
        const projectBoost = projectId && (node.id === projectNodeId(projectId) || String(node.attributes?.projectId || '') === projectId) ? 8 : 0;
        const actorBoost = node.id === personNodeId(normalizedActorId) ? 2 : 0;
        const typeBoost = node.type === 'Project' ? 1.5 : node.type === 'Episode' ? 1 : 0.5;
        return { node, score: overlap * 3 + projectBoost + actorBoost + typeBoost + recencyScore(node, nowMs) };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    const maxNodes = Math.max(6, Math.min(30, Number(options.limit || 18)));
    const selected = new Map(scored.slice(0, Math.max(8, Math.floor(maxNodes * 0.7))).map((item) => [item.node.id, item.node]));
    const anchorIds = new Set([...selected.keys()].slice(0, 8));
    for (const edge of scope.edges) {
      if (selected.size >= maxNodes) break;
      if (!anchorIds.has(edge.from) && !anchorIds.has(edge.to)) continue;
      const neighborId = anchorIds.has(edge.from) ? edge.to : edge.from;
      const neighbor = scope.nodes.find((node) => node.id === neighborId && !node.validTo);
      if (neighbor) selected.set(neighbor.id, neighbor);
    }

    const nodes = [...selected.values()];
    const nodeIds = new Set(nodes.map((node) => node.id));
    const edges = scope.edges
      .filter((edge) => !edge.validTo && nodeIds.has(edge.from) && nodeIds.has(edge.to))
      .slice(0, 40);
    const labels = new Map(nodes.map((node) => [node.id, node.label]));
    const formatNodeLine = (node) => {
      const detail = text(node.summary || Object.values(node.attributes || {}).flat().join(' · '), 380);
      const date = String(node.validFrom || node.updatedAt || '').slice(0, 10);
      const source = text(node.source?.label || node.source?.kind, 120);
      const episodeRole = node.type === 'Episode' ? `:${text(node.attributes?.role || 'conversation', 20)}` : '';
      const trustNote = node.type === 'Episode' ? ' <대화 이력이며 사실 근거로 사용 금지>' : '';
      return `- [${node.type}${episodeRole}] ${node.label}${detail ? `: ${detail}` : ''}${date ? ` (${date})` : ''}${source ? ` <출처: ${source}>` : ''}${trustNote}`;
    };
    const factLines = nodes.filter((node) => node.type !== 'Episode').map(formatNodeLine);
    const episodeLines = nodes.filter((node) => node.type === 'Episode').map(formatNodeLine);
    const edgeLines = edges.map((edge) => `- ${relationSentence(edge, labels)}`);
    const contextText = [
      '사용자별 WETHUS 시간형 지식그래프에서 회상한 근거입니다.',
      'Episode 노드는 대화 연속성만 위한 이력이며, WETHUS 활동/프로젝트 사실을 증명하는 근거가 아닙니다.',
      '검증 가능한 WETHUS 사실:',
      ...(factLines.length ? factLines : ['- 없음']),
      ...(episodeLines.length ? ['대화 이력(사실 근거 아님):', ...episodeLines] : []),
      ...(edgeLines.length ? ['관계:', ...edgeLines] : [])
    ].join('\n').slice(0, 9000);
    const sources = Array.from(new Set(nodes
      .filter((node) => node.type !== 'Episode')
      .map((node) => text(node.source?.label || node.source?.kind, 120))
      .filter(Boolean)));
    return {
      contextText,
      nodes,
      edges,
      sources,
      stats: { nodes: scope.nodes.length, edges: scope.edges.length, episodes: scope.episodeIds.length }
    };
  }

  function inspect(actorId, options = {}) {
    const normalizedActorId = text(actorId, 180);
    const document = load();
    const scope = normalizedActorId ? document.scopes[scopeKey(normalizedActorId)] : null;
    if (!scope) return { actorId: normalizedActorId, nodes: [], edges: [], stats: { nodes: 0, edges: 0, episodes: 0 } };
    const limit = Math.max(1, Math.min(resolvedLimits.nodes, Number(options.limit || 50)));
    const edgeLimit = Math.max(1, Math.min(resolvedLimits.edges, Number(options.edgeLimit || limit)));
    return {
      actorId: scope.actorId,
      updatedAt: scope.updatedAt,
      lastIngestedAt: scope.lastIngestedAt,
      nodes: scope.nodes.slice(0, limit),
      edges: scope.edges.slice(0, edgeLimit),
      stats: { nodes: scope.nodes.length, edges: scope.edges.length, episodes: scope.episodeIds.length }
    };
  }

  function forget(actorId) {
    const normalizedActorId = text(actorId, 180);
    if (!normalizedActorId) return false;
    const document = load();
    const key = scopeKey(normalizedActorId);
    if (!document.scopes[key]) return false;
    delete document.scopes[key];
    save(document);
    return true;
  }

  return { ingest, remember, recall, inspect, forget };
}
