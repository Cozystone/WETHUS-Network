(function networkDirectory() {
  'use strict';

  const root = document.getElementById('networkDirectoryRoot');
  if (!root || !window.WETHUS) return;

  const query = new URLSearchParams(location.search);
  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
  const previewMode = query.get('preview') === '1' && isLocal;
  const validTabs = new Set(['people', 'connections', 'requests', 'schedule', 'activity']);
  const assetBase = 'assets/network-home';
  const fallbackPeople = [
    { id: 'network-person-field', name: '박지훈', headline: 'Field Ops', school: '연세대 · 사회학 4학년', bio: '현장 운영과 청소년 인터뷰 경험이 풍부해요.', lookingFor: '초기 현장 실험 팀', skills: ['현장 운영', '사용자 인터뷰'], interestTags: ['사회문제'], profileImage: `${assetBase}/person-field-ops.webp` },
    { id: 'network-person-data', name: '윤태호', headline: 'Data', school: '한양대 · 데이터 3학년', bio: '상권 데이터 분석과 시각화에 강점이 있어요.', lookingFor: '실제 데이터가 쌓이는 프로젝트', skills: ['데이터 분석', '시각화'], interestTags: ['데이터/리서치'], profileImage: `${assetBase}/person-data.webp` },
    { id: 'network-person-design', name: '최유나', headline: 'Design', school: '홍익대 · 시각 4학년', bio: '팝업 브랜딩과 공간 디자인 경험이 많아요.', lookingFor: '브랜드 실험과 오프라인 프로젝트', skills: ['브랜딩', '공간 디자인'], interestTags: ['콘텐츠/미디어'], profileImage: `${assetBase}/person-design.webp` },
    { id: 'network-person-marketing', name: '정민재', headline: 'Marketing', school: 'KAIST · 경영 2학년', bio: 'SNS 운영과 콘텐츠 기획 경험이 있어요.', lookingFor: '초기 사용자 모집을 시작하는 팀', skills: ['SNS 운영', '콘텐츠 기획'], interestTags: ['커머스/브랜드'], profileImage: `${assetBase}/person-marketing.webp` }
  ];

  const state = {
    actorId: '',
    user: null,
    projects: [],
    projectId: query.get('projectId') || '',
    tab: validTabs.has(query.get('tab')) ? query.get('tab') : 'people',
    people: [],
    selectedPersonId: query.get('personId') || '',
    peopleFilter: 'all',
    search: '',
    selectedDate: query.get('date') || localDateKey(new Date())
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function safeImageUrl(value) {
    const raw = String(value || '').trim();
    return /^(https?:\/\/|data:image\/|\/|\.\/|assets\/)/i.test(raw) ? raw : '';
  }

  function localDateKey(date) {
    const value = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(value.getTime())) return '';
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }

  function addDays(dateValue, amount) {
    const date = new Date(`${dateValue}T12:00:00`);
    date.setDate(date.getDate() + amount);
    return localDateKey(date);
  }

  function formatDate(dateValue) {
    const date = new Date(`${String(dateValue || '').slice(0, 10)}T12:00:00`);
    if (Number.isNaN(date.getTime())) return '날짜 미정';
    return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }).format(date);
  }

  function uniqueProjects(rows) {
    const map = new Map();
    (rows || []).forEach((project) => {
      if (project?.id && !map.has(String(project.id))) map.set(String(project.id), project);
    });
    return Array.from(map.values());
  }

  function currentProject() {
    return state.projects.find((project) => String(project.id) === String(state.projectId)) || state.projects[0] || null;
  }

  function selectedPerson() {
    return state.people.find((person) => String(person.id) === String(state.selectedPersonId)) || state.people[0] || null;
  }

  function personHref(person) {
    const params = new URLSearchParams({
      userId: String(person?.id || ''),
      name: String(person?.name || 'WETHUS 사용자'),
      role: String(person?.headline || 'Builder'),
      bio: String(person?.bio || '')
    });
    return `member.html?${params.toString()}`;
  }

  function projectHref(options = {}) {
    const project = currentProject();
    if (!project?.id) return 'project-hub.html';
    const params = new URLSearchParams({ projectId: String(project.id), tab: options.tab || 'overview' });
    if (options.focus) params.set('focus', options.focus);
    if (options.taskId) params.set('taskId', options.taskId);
    if (previewMode) params.set('preview', '1');
    return `project-hub.html?${params.toString()}`;
  }

  function ensurePreviewData() {
    if (!previewMode) return;
    WETHUS.ensureLocalDevUser?.({
      force: true,
      id: 'network-preview-user',
      name: '김안석',
      nickname: 'anseok.kim',
      email: 'network.preview@wethus.dev'
    });
    let project = (WETHUS.myProjects?.() || []).find((item) => item.id === 'network-preview-workspace');
    if (!project) {
      project = WETHUS.addProject?.({
        id: 'network-preview-workspace',
        title: '상권 데이터로 청소년 팝업 실험 운영',
        summary: '지역 청소년과 상권을 연결하는 첫 팝업을 준비하고 있어요.',
        fullDescription: '상권 데이터와 현장 인터뷰를 바탕으로 작은 팝업 실험을 설계하고 운영합니다.',
        category: 'Startup',
        status: '진행 중',
        image: `${assetBase}/project-hero.webp`,
        moderationStatus: 'approved'
      });
    }
    if (!project?.id) return;
    const today = localDateKey(new Date());
    const hub = WETHUS.getProjectHub?.(project.id) || {};
    if (hub.networkDirectorySeedVersion !== 2) {
      WETHUS.upsertProjectHub?.(project.id, {
        networkDirectorySeedVersion: 2,
        goal: '첫 팝업 실험의 운영 일정과 측정 기준을 확정합니다.',
        blocker: '현장 운영을 맡을 팀원과 인터뷰 참여자를 더 확보해야 합니다.'
      });
      const tasks = ['현장 운영 재개 계획', '사용자 인터뷰 5명 확정', '챌린지 지원 여부 결정'];
      tasks.forEach((title, index) => {
        WETHUS.addProjectTask?.(project.id, {
          title,
          dueAt: addDays(today, index + 2),
          time: index === 0 ? '15:30' : '',
          location: index === 0 ? '집중 세션' : '프로젝트 작업',
          source: 'network-preview'
        });
      });
      const latestHub = WETHUS.getProjectHub?.(project.id) || {};
      if (!Array.isArray(latestHub.schedule) || !latestHub.schedule.length) {
        [
          { title: '팀 스탠드업', time: '10:00', location: 'WETHUS Room', kind: 'meeting' },
          { title: '사용자 인터뷰', time: '13:00', location: '온라인 Zoom', kind: 'interview' },
          { title: '청년 창업가 정모', time: '18:00', location: '강남 커뮤니티 라운지', kind: 'community' }
        ].forEach((item) => WETHUS.addProjectScheduleItem?.(project.id, { ...item, date: today }));
      }
    }
  }

  function collectProjects() {
    return uniqueProjects([...(WETHUS.myProjects?.() || []), ...(WETHUS.myParticipatingProjects?.() || [])]);
  }

  function collectPeople() {
    const actual = WETHUS.listNetworkPeople?.({ actorId: state.actorId }) || [];
    const map = new Map();
    [...actual, ...(previewMode ? fallbackPeople : [])].forEach((person) => {
      if (person?.id && String(person.id) !== state.actorId) map.set(String(person.id), person);
    });
    return Array.from(map.values());
  }

  function connectionMap() {
    const outgoing = WETHUS.listConnections?.({ actorId: state.actorId }) || [];
    const acceptedIncoming = (WETHUS.listConnections?.({ actorId: state.actorId, direction: 'incoming' }) || [])
      .filter((item) => item.status === 'accepted')
      .map((item) => ({ ...item, targetUserId: item.actorId, reciprocal: true }));
    return new Map([...outgoing, ...acceptedIncoming].map((item) => [String(item.targetUserId || ''), item]));
  }

  function filteredPeople() {
    const queryText = state.search.trim().toLowerCase();
    return state.people.filter((person) => {
      const tags = [...(person.skills || []), ...(person.interestTags || [])];
      const blob = [person.name, person.nickname, person.headline, person.school, person.bio, person.lookingFor, ...tags].join(' ').toLowerCase();
      const queryMatch = !queryText || blob.includes(queryText);
      const filterMatch = state.peopleFilter === 'all' || blob.includes(state.peopleFilter.toLowerCase());
      return queryMatch && filterMatch;
    });
  }

  function avatarMarkup(person, small = false) {
    const image = safeImageUrl(person?.profileImage);
    return `<span class="nd-avatar${small ? ' nd-avatar--small' : ''}">${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(person?.name || '프로필')}" />` : escapeHtml(String(person?.name || 'W').slice(0, 1))}</span>`;
  }

  function tabCounts() {
    return {
      people: state.people.length,
      connections: connectionMap().size + (WETHUS.listConnections?.({ actorId: state.actorId, direction: 'incoming' }) || []).filter((item) => item.status === 'requested').length,
      requests: (WETHUS.listAsks?.({ actorId: state.actorId }) || []).filter((item) => item.status === 'open').length,
      schedule: currentProject()?.id ? (WETHUS.listProjectSchedule?.(currentProject().id) || []).length : 0,
      activity: (WETHUS.listSemanticEvents?.({ actorId: state.actorId, limit: 200 }) || []).length
    };
  }

  function renderPageHead() {
    const options = state.projects.length
      ? state.projects.map((project) => `<option value="${escapeHtml(project.id)}" ${String(project.id) === String(currentProject()?.id) ? 'selected' : ''}>${escapeHtml(project.title || '프로젝트')}</option>`).join('')
      : '<option value="">프로젝트 없음</option>';
    return `
      <header class="nd-page-head">
        <div>
          <span class="nd-eyebrow"><i class="ph ph-circles-four" aria-hidden="true"></i>WETHUS Network</span>
          <h1>사람과 실행을 연결합니다.</h1>
          <p>프로필만 나열하지 않고, 지금 진행 중인 프로젝트와 필요한 도움을 기준으로 다음 연결을 보여줍니다.</p>
        </div>
        <label class="nd-project-picker"><i class="ph ph-folder" aria-hidden="true"></i><select id="ndProjectSelect" aria-label="기준 프로젝트">${options}</select></label>
      </header>`;
  }

  function renderSide() {
    const counts = tabCounts();
    const tabs = [
      ['people', 'ph-users-three', '사람 찾기'],
      ['connections', 'ph-handshake', '내 연결'],
      ['requests', 'ph-broadcast', 'ASK / OFFER'],
      ['schedule', 'ph-calendar-dots', '일정'],
      ['activity', 'ph-waveform', '활동']
    ];
    const project = currentProject();
    return `
      <aside class="nd-panel nd-side">
        <div class="nd-side-label">Network</div>
        <nav class="nd-tab-list" aria-label="Network 메뉴">
          ${tabs.map(([id, icon, label]) => `<button class="nd-tab${state.tab === id ? ' is-active' : ''}" type="button" data-tab="${id}"><i class="ph ${icon}" aria-hidden="true"></i><span>${label}</span><span class="nd-tab-count">${counts[id]}</span></button>`).join('')}
        </nav>
        <div class="nd-side-project"><span>기준 프로젝트</span><strong>${escapeHtml(project?.title || '프로젝트를 시작해보세요')}</strong><a href="${escapeHtml(projectHref())}">프로젝트 허브 <i class="ph ph-arrow-up-right" aria-hidden="true"></i></a></div>
      </aside>`;
  }

  function renderPeople() {
    const people = filteredPeople();
    const connections = connectionMap();
    const filters = [['all', '전체'], ['운영', '운영'], ['데이터', '데이터'], ['디자인', '디자인'], ['마케팅', '마케팅']];
    return `
      <section class="nd-panel nd-content-panel">
        <div class="nd-section-head">
          <div><h2>추천 연결</h2><p>${escapeHtml(currentProject()?.title || '내 활동')}의 역할과 현재 필요한 도움을 기준으로 찾았습니다.</p></div>
          <label class="nd-search"><i class="ph ph-magnifying-glass" aria-hidden="true"></i><input id="ndPeopleSearch" value="${escapeHtml(state.search)}" placeholder="이름, 역할, 경험 검색" aria-label="사람 검색" /></label>
        </div>
        <div class="nd-filter-row">${filters.map(([id, label]) => `<button class="nd-filter-chip${state.peopleFilter === id ? ' is-active' : ''}" type="button" data-people-filter="${id}">${label}</button>`).join('')}</div>
        ${people.length ? `<div class="nd-people-grid">${people.map((person) => {
          const connection = connections.get(String(person.id));
          const accepted = connection?.status === 'accepted';
          const requested = connection?.status === 'requested';
          const tags = [...(person.skills || []), ...(person.interestTags || [])].filter(Boolean).slice(0, 3);
          return `<article class="nd-person-card${String(person.id) === String(selectedPerson()?.id) ? ' is-selected' : ''}" data-person-card="${escapeHtml(person.id)}">
            <div class="nd-person-head">${avatarMarkup(person)}<div class="nd-person-copy"><strong>${escapeHtml(person.name)}</strong><span>${escapeHtml([person.headline, person.school].filter(Boolean).join(' · ') || 'Builder')}</span></div><button class="nd-button" type="button" data-person-select="${escapeHtml(person.id)}" aria-label="${escapeHtml(person.name)} 상세 보기"><i class="ph ph-caret-right" aria-hidden="true"></i></button></div>
            <p>${escapeHtml(person.bio || person.lookingFor || '프로젝트와 활동을 통해 협업 가능성을 확인할 수 있습니다.')}</p>
            <div class="nd-tag-row">${tags.map((tag) => `<span class="nd-tag">${escapeHtml(tag)}</span>`).join('')}</div>
            <div class="nd-person-actions"><a class="nd-button" href="${escapeHtml(personHref(person))}">프로필</a>${accepted ? `<button class="nd-button nd-button--primary" type="button" data-message-person="${escapeHtml(person.id)}">메시지</button>` : `<button class="nd-button${requested ? ' is-connected' : ' nd-button--primary'}" type="button" data-connect-person="${escapeHtml(person.id)}">${requested ? '요청 취소' : '연결 요청'}</button>`}</div>
          </article>`;
        }).join('')}</div>` : `<div class="nd-empty"><i class="ph ph-user-search" aria-hidden="true"></i><strong>조건에 맞는 사람이 아직 없습니다.</strong><p>검색어를 줄이거나 내 프로필의 역할과 찾는 협업을 더 구체적으로 적어보세요.</p><a class="nd-button" href="profile.html">프로필 보완하기</a></div>`}
      </section>`;
  }

  function connectionPerson(connection, direction) {
    const personId = direction === 'incoming' ? connection.actorId : connection.targetUserId;
    return state.people.find((person) => String(person.id) === String(personId)) || {
      id: personId,
      name: direction === 'incoming' ? (connection.actorName || 'WETHUS 사용자') : 'WETHUS 사용자',
      profileImage: direction === 'incoming' ? connection.actorAvatar : ''
    };
  }

  function renderConnections() {
    const incoming = WETHUS.listConnections?.({ actorId: state.actorId, direction: 'incoming' }) || [];
    const outgoing = WETHUS.listConnections?.({ actorId: state.actorId }) || [];
    const rows = [
      ...incoming.map((item) => ({ ...item, direction: 'incoming' })),
      ...outgoing.map((item) => ({ ...item, direction: 'outgoing' }))
    ];
    return `<section class="nd-panel nd-content-panel">
      <div class="nd-section-head"><div><h2>내 연결</h2><p>받은 요청과 보낸 요청을 한곳에서 확인하고, 연결된 사람과 바로 대화를 시작합니다.</p></div></div>
      ${rows.length ? `<div class="nd-list">${rows.map((row) => {
        const person = connectionPerson(row, row.direction);
        const pendingIncoming = row.direction === 'incoming' && row.status === 'requested';
        const accepted = row.status === 'accepted';
        const label = pendingIncoming ? '받은 요청' : (accepted ? '연결됨' : (row.status === 'declined' ? '거절됨' : '보낸 요청'));
        return `<article class="nd-list-row">${avatarMarkup(person, true)}<div class="nd-list-copy"><strong>${escapeHtml(person.name)}</strong><span>${escapeHtml([label, person.headline || person.school].filter(Boolean).join(' · '))}</span></div><div class="nd-row-actions">${pendingIncoming ? `<button class="nd-button nd-button--primary" type="button" data-connection-response="accepted" data-request-id="${escapeHtml(row.id)}">수락</button><button class="nd-button" type="button" data-connection-response="declined" data-request-id="${escapeHtml(row.id)}">거절</button>` : ''}${accepted ? `<button class="nd-button nd-button--primary" type="button" data-message-person="${escapeHtml(person.id)}">DM</button>` : ''}<a class="nd-button" href="${escapeHtml(personHref(person))}">프로필</a></div></article>`;
      }).join('')}</div>` : `<div class="nd-empty"><i class="ph ph-handshake" aria-hidden="true"></i><strong>아직 연결 요청이 없습니다.</strong><p>사람 찾기에서 프로젝트에 필요한 경험을 가진 사람에게 먼저 요청해보세요.</p><button class="nd-button nd-button--primary" type="button" data-tab="people">사람 찾기</button></div>`}
    </section>`;
  }

  function renderRequests() {
    const asks = WETHUS.listAsks?.({}) || [];
    const offers = WETHUS.listOffers?.({ includeInactive: true }) || [];
    const requestCard = (item, type) => `<article class="nd-request-card"><div class="nd-tag-row"><span class="nd-tag">${type}</span><span class="nd-tag">${escapeHtml(item.category || 'General')}</span></div><p>${escapeHtml(item.text || '')}</p><div class="nd-request-meta"><span>${escapeHtml(type === 'ASK' ? (item.due || '일정 무관') : (item.availability || '협의 가능'))}</span><span>${escapeHtml(item.status || '')}</span></div></article>`;
    return `<section class="nd-panel nd-content-panel">
      <div class="nd-section-head"><div><h2>ASK / OFFER</h2><p>필요한 도움과 지금 도울 수 있는 일을 명확히 남기면 WETHUS가 연결 문맥으로 사용합니다.</p></div></div>
      <div class="nd-request-grid">
        <div class="nd-request-column"><div class="nd-request-title"><h3>Open ASK</h3><span class="nd-tag">${asks.filter((item) => item.status === 'open').length}</span></div>${asks.length ? asks.map((item) => requestCard(item, 'ASK')).join('') : '<div class="nd-empty"><strong>등록한 ASK가 없습니다.</strong><p>오른쪽에서 필요한 도움을 한 문장으로 알려주세요.</p></div>'}</div>
        <div class="nd-request-column"><div class="nd-request-title"><h3>My OFFER</h3><span class="nd-tag">${offers.filter((item) => item.status === 'active').length}</span></div>${offers.length ? offers.map((item) => requestCard(item, 'OFFER')).join('') : '<div class="nd-empty"><strong>등록한 OFFER가 없습니다.</strong><p>누구를 어떤 방식으로 도울 수 있는지 공개해보세요.</p></div>'}</div>
      </div>
    </section>`;
  }

  function renderSchedule() {
    const project = currentProject();
    const rows = project?.id ? (WETHUS.listProjectSchedule?.(project.id, { from: state.selectedDate, to: state.selectedDate }) || []) : [];
    return `<section class="nd-panel nd-content-panel">
      <div class="nd-section-head"><div><h2>${escapeHtml(formatDate(state.selectedDate))} 일정</h2><p>프로젝트 작업의 마감과 직접 등록한 미팅을 같은 날짜 흐름으로 봅니다.</p></div><div class="nd-date-nav"><button class="nd-button" type="button" data-date-step="-1" aria-label="이전 날"><i class="ph ph-caret-left"></i></button><input id="ndScheduleDate" type="date" value="${escapeHtml(state.selectedDate)}" aria-label="일정 날짜" /><button class="nd-button" type="button" data-date-step="1" aria-label="다음 날"><i class="ph ph-caret-right"></i></button></div></div>
      ${rows.length ? `<div class="nd-list">${rows.map((item) => `<article class="nd-list-row"><span class="nd-list-icon"><i class="ph ${item.kind === 'task' ? 'ph-check-square' : (item.kind === 'meeting' ? 'ph-users-three' : 'ph-calendar-dots')}" aria-hidden="true"></i></span><div class="nd-list-copy"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml([item.time || '시간 미정', item.location || '장소 미정', item.completed ? '완료' : ''].filter(Boolean).join(' · '))}</span></div><div class="nd-row-actions"><a class="nd-button" href="${escapeHtml(projectHref({ tab: 'overview', focus: item.kind === 'task' ? 'tasks' : 'schedule', taskId: item.taskId || '' }))}">프로젝트에서 보기</a></div></article>`).join('')}</div>` : `<div class="nd-empty"><i class="ph ph-calendar-blank" aria-hidden="true"></i><strong>이 날짜에는 일정이 없습니다.</strong><p>오른쪽에서 팀 미팅이나 마일스톤을 추가하면 홈 캘린더에도 바로 표시됩니다.</p></div>`}
    </section>`;
  }

  function eventLabel(action) {
    const labels = {
      project_created: '프로젝트 생성', project_updated: '프로젝트 수정', task_created: '작업 추가', task_updated: '작업 수정', task_completed: '작업 완료', task_reopened: '작업 재개', schedule_created: '일정 추가', connection_created: '연결 요청', connection_accepted: '연결 수락', connection_declined: '연결 거절', connection_cancelled: '연결 취소', ask_created: 'ASK 등록', offer_created: 'OFFER 등록', ai_recommendation_applied: 'AI 제안 반영', ai_mentor_message_created: 'AI 멘토 대화'
    };
    return labels[action] || String(action || '활동').replace(/_/g, ' ');
  }

  function renderActivity() {
    const project = currentProject();
    const rows = WETHUS.listSemanticEvents?.({ projectId: project?.id || '', limit: 100 }) || [];
    return `<section class="nd-panel nd-content-panel"><div class="nd-section-head"><div><h2>활동 흐름</h2><p>${escapeHtml(project?.title || '내 WETHUS')}에서 발생한 실행 기록을 최신 순으로 확인합니다.</p></div></div>${rows.length ? `<div class="nd-list">${rows.map((event) => `<article class="nd-list-row"><span class="nd-list-icon"><i class="ph ph-waveform" aria-hidden="true"></i></span><div class="nd-list-copy"><strong>${escapeHtml(eventLabel(event.action))}</strong><span>${escapeHtml([event.metadata?.title || event.context || '', event.occurredAt ? new Date(event.occurredAt).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''].filter(Boolean).join(' · '))}</span></div><div class="nd-row-actions"><span class="nd-tag">${escapeHtml(event.visibility || 'network')}</span></div></article>`).join('')}</div>` : `<div class="nd-empty"><i class="ph ph-waveform" aria-hidden="true"></i><strong>아직 기록된 활동이 없습니다.</strong><p>작업을 추가하거나 완료하고, ASK를 등록하면 이 흐름에 자동으로 쌓입니다.</p></div>`}</section>`;
  }

  function renderContent() {
    if (state.tab === 'connections') return renderConnections();
    if (state.tab === 'requests') return renderRequests();
    if (state.tab === 'schedule') return renderSchedule();
    if (state.tab === 'activity') return renderActivity();
    return renderPeople();
  }

  function renderContext() {
    const project = currentProject();
    if (state.tab === 'requests') {
      return `<aside class="nd-context"><section class="nd-panel nd-context-card"><span class="nd-context-label">새 ASK</span><h3>지금 필요한 도움</h3><form class="nd-form" data-request-form="ask"><label class="nd-field"><span>요청</span><textarea name="text" maxlength="180" required placeholder="예: 청소년 인터뷰 질문을 함께 검토해줄 분을 찾습니다."></textarea></label><div class="nd-form-grid"><label class="nd-field"><span>분야</span><input name="category" maxlength="30" placeholder="UX Research" /></label><label class="nd-field"><span>필요 시점</span><select name="due"><option>이번 주</option><option>2주 안</option><option>일정 무관</option></select></label></div><button class="nd-button nd-button--primary" type="submit">ASK 등록</button></form></section><section class="nd-panel nd-context-card"><span class="nd-context-label">새 OFFER</span><h3>지금 도울 수 있는 일</h3><form class="nd-form" data-request-form="offer"><label class="nd-field"><span>제안</span><textarea name="text" maxlength="180" required placeholder="예: 초기 서비스 인터뷰 설계를 30분 동안 함께 볼 수 있습니다."></textarea></label><div class="nd-form-grid"><label class="nd-field"><span>분야</span><input name="category" maxlength="30" placeholder="Product" /></label><label class="nd-field"><span>가능 시간</span><select name="availability"><option>이번 주 30분</option><option>주말 1시간</option><option>협의 가능</option></select></label></div><button class="nd-button" type="submit">OFFER 등록</button></form></section></aside>`;
    }
    if (state.tab === 'schedule') {
      return `<aside class="nd-context"><section class="nd-panel nd-context-card"><span class="nd-context-label">일정 추가</span><h3>${escapeHtml(project?.title || '프로젝트')}</h3><p>추가한 일정은 홈의 오늘 일정과 캘린더에 바로 반영됩니다.</p><form class="nd-form" data-schedule-form><label class="nd-field"><span>일정 이름</span><input name="title" maxlength="80" required placeholder="팀 주간 회의" /></label><div class="nd-form-grid"><label class="nd-field"><span>날짜</span><input name="date" type="date" value="${escapeHtml(state.selectedDate)}" required /></label><label class="nd-field"><span>시간</span><input name="time" type="time" /></label></div><label class="nd-field"><span>장소 / 링크</span><input name="location" maxlength="100" placeholder="WETHUS Room 또는 회의 링크" /></label><button class="nd-button nd-button--primary" type="submit" ${project?.id ? '' : 'disabled'}>일정 추가</button></form></section></aside>`;
    }
    if (state.tab === 'activity') {
      const events = WETHUS.listSemanticEvents?.({ projectId: project?.id || '', limit: 100 }) || [];
      const completed = events.filter((event) => event.action === 'task_completed').length;
      return `<aside class="nd-context"><section class="nd-panel nd-context-card"><span class="nd-context-label">Project Context</span><h3>${escapeHtml(project?.title || '프로젝트 없음')}</h3><p>${escapeHtml(project?.summary || '프로젝트를 선택하면 활동 문맥이 표시됩니다.')}</p><div class="nd-stat-list"><div class="nd-stat-row"><span>기록된 활동</span><strong>${events.length}</strong></div><div class="nd-stat-row"><span>완료 작업</span><strong>${completed}</strong></div><div class="nd-stat-row"><span>공개 범위</span><strong>팀 기준</strong></div></div><a class="nd-button" href="${escapeHtml(projectHref({ tab: 'progress' }))}">진행 로그 열기</a></section></aside>`;
    }
    if (state.tab === 'connections') {
      const outgoing = WETHUS.listConnections?.({ actorId: state.actorId }) || [];
      const incoming = WETHUS.listConnections?.({ actorId: state.actorId, direction: 'incoming' }) || [];
      return `<aside class="nd-context"><section class="nd-panel nd-context-card"><span class="nd-context-label">Connection Status</span><h3>연결 상태</h3><div class="nd-stat-list"><div class="nd-stat-row"><span>연결됨</span><strong>${outgoing.filter((item) => item.status === 'accepted').length}</strong></div><div class="nd-stat-row"><span>보낸 요청</span><strong>${outgoing.filter((item) => item.status === 'requested').length}</strong></div><div class="nd-stat-row"><span>받은 요청</span><strong>${incoming.filter((item) => item.status === 'requested').length}</strong></div></div><button class="nd-button nd-button--primary" type="button" data-tab="people">새 연결 찾기</button></section></aside>`;
    }
    const person = selectedPerson();
    if (!person) return '<aside class="nd-context"></aside>';
    const connection = connectionMap().get(String(person.id));
    const accepted = connection?.status === 'accepted';
    return `<aside class="nd-context"><section class="nd-panel nd-context-card"><span class="nd-context-label">Selected Person</span><div class="nd-context-person">${avatarMarkup(person)}<div class="nd-person-copy"><strong>${escapeHtml(person.name)}</strong><span>${escapeHtml(person.headline || 'Builder')}</span></div></div><h3>${escapeHtml(person.lookingFor || '함께 실행할 프로젝트를 찾고 있어요.')}</h3><p>${escapeHtml(person.bio || '공개 프로필에서 프로젝트와 실행 기록을 더 확인할 수 있습니다.')}</p><div class="nd-context-actions"><a class="nd-button" href="${escapeHtml(personHref(person))}">프로필 보기</a>${accepted ? `<button class="nd-button nd-button--primary" type="button" data-message-person="${escapeHtml(person.id)}">DM 시작</button>` : `<button class="nd-button nd-button--primary" type="button" data-connect-person="${escapeHtml(person.id)}">${connection ? '요청 취소' : '연결 요청'}</button>`}</div></section><section class="nd-panel nd-context-card"><span class="nd-context-label">Matching Context</span><h3>${escapeHtml(project?.title || '현재 활동')}</h3><p>${escapeHtml(person.skills?.length ? `${person.skills.slice(0, 2).join(' · ')} 경험이 현재 프로젝트 문맥과 연결됩니다.` : '역할, 관심사, 활동 기록을 바탕으로 추천했습니다.')}</p></section></aside>`;
  }

  function render() {
    root.innerHTML = `${renderPageHead()}<div class="nd-shell">${renderSide()}<div class="nd-content">${renderContent()}</div>${renderContext()}</div>`;
    document.title = `WETHUS | ${state.tab === 'people' ? 'People' : state.tab.charAt(0).toUpperCase() + state.tab.slice(1)}`;
  }

  function updateUrl() {
    const params = new URLSearchParams();
    params.set('tab', state.tab);
    if (state.projectId) params.set('projectId', state.projectId);
    if (state.tab === 'schedule' && state.selectedDate) params.set('date', state.selectedDate);
    if (state.tab === 'people' && state.selectedPersonId) params.set('personId', state.selectedPersonId);
    if (previewMode) params.set('preview', '1');
    history.replaceState({}, '', `network.html?${params.toString()}`);
  }

  function showToast(message) {
    const region = document.getElementById('ndToastRegion');
    if (!region) return;
    const toast = document.createElement('div');
    toast.className = 'nd-toast';
    toast.textContent = message;
    region.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3200);
  }

  async function handleClick(event) {
    const tabButton = event.target.closest('[data-tab]');
    if (tabButton) {
      state.tab = tabButton.dataset.tab;
      updateUrl();
      render();
      return;
    }
    const filterButton = event.target.closest('[data-people-filter]');
    if (filterButton) {
      state.peopleFilter = filterButton.dataset.peopleFilter;
      render();
      document.getElementById('ndPeopleSearch')?.focus();
      return;
    }
    const personSelect = event.target.closest('[data-person-select]');
    if (personSelect) {
      state.selectedPersonId = personSelect.dataset.personSelect;
      updateUrl();
      render();
      return;
    }
    const connectButton = event.target.closest('[data-connect-person]');
    if (connectButton) {
      const result = WETHUS.toggleConnection?.(connectButton.dataset.connectPerson);
      showToast(result?.connected ? '연결 요청을 보냈습니다.' : '연결 요청을 취소했습니다.');
      render();
      return;
    }
    const responseButton = event.target.closest('[data-connection-response]');
    if (responseButton) {
      try {
        WETHUS.respondToConnection?.(responseButton.dataset.requestId, responseButton.dataset.connectionResponse);
        showToast(responseButton.dataset.connectionResponse === 'accepted' ? '연결 요청을 수락했습니다.' : '연결 요청을 거절했습니다.');
        render();
      } catch (error) {
        showToast(error?.message || '연결 요청을 처리하지 못했습니다.');
      }
      return;
    }
    const messageButton = event.target.closest('[data-message-person]');
    if (messageButton) {
      const person = state.people.find((item) => String(item.id) === String(messageButton.dataset.messagePerson)) || { id: messageButton.dataset.messagePerson, name: 'WETHUS 사용자' };
      messageButton.disabled = true;
      try {
        const thread = await WETHUS.createDmThread?.({ targetUserId: person.id, targetName: person.name, targetAvatar: person.profileImage || '' });
        location.href = `dm.html?threadId=${encodeURIComponent(thread?.id || '')}`;
      } catch (error) {
        messageButton.disabled = false;
        showToast(error?.message || 'DM을 열지 못했습니다.');
      }
      return;
    }
    const dateButton = event.target.closest('[data-date-step]');
    if (dateButton) {
      state.selectedDate = addDays(state.selectedDate, Number(dateButton.dataset.dateStep || 0));
      updateUrl();
      render();
    }
  }

  function handleInput(event) {
    if (event.target.id !== 'ndPeopleSearch') return;
    state.search = event.target.value;
    const cursor = event.target.selectionStart;
    render();
    const next = document.getElementById('ndPeopleSearch');
    next?.focus();
    next?.setSelectionRange(cursor, cursor);
  }

  function handleChange(event) {
    if (event.target.id === 'ndProjectSelect') {
      state.projectId = event.target.value;
      updateUrl();
      render();
      return;
    }
    if (event.target.id === 'ndScheduleDate') {
      state.selectedDate = event.target.value || localDateKey(new Date());
      updateUrl();
      render();
    }
  }

  function handleSubmit(event) {
    const requestForm = event.target.closest('[data-request-form]');
    if (requestForm) {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(requestForm).entries());
      try {
        if (requestForm.dataset.requestForm === 'ask') {
          WETHUS.createAsk?.({ text: values.text, category: values.category || 'General', due: values.due, projectId: currentProject()?.id || '', visibility: 'network' });
          showToast('ASK를 Network에 등록했습니다.');
        } else {
          WETHUS.createOffer?.({ text: values.text, category: values.category || 'General', availability: values.availability, visibility: 'network' });
          showToast('OFFER를 Network에 등록했습니다.');
        }
        requestForm.reset();
        render();
      } catch (error) {
        showToast(error?.message || '등록하지 못했습니다.');
      }
      return;
    }
    const scheduleForm = event.target.closest('[data-schedule-form]');
    if (scheduleForm) {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(scheduleForm).entries());
      try {
        WETHUS.addProjectScheduleItem?.(currentProject()?.id, values);
        state.selectedDate = values.date;
        showToast('일정을 프로젝트와 홈 캘린더에 추가했습니다.');
        updateUrl();
        render();
      } catch (error) {
        showToast(error?.message || '일정을 추가하지 못했습니다.');
      }
    }
  }

  async function init() {
    ensurePreviewData();
    state.actorId = String(WETHUS.currentActorId?.() || '').trim();
    if (!state.actorId) {
      WETHUS.setAuthReturnState?.();
      location.href = `login.html?next=${encodeURIComponent(location.pathname + location.search)}`;
      return;
    }
    state.user = WETHUS.currentUser?.() || null;
    state.projects = collectProjects();
    if (!state.projects.some((project) => String(project.id) === String(state.projectId))) state.projectId = state.projects[0]?.id || '';
    await Promise.allSettled([
      WETHUS.refreshNetworkPeople?.(),
      WETHUS.refreshNetworkConnections?.()
    ]);
    state.people = collectPeople();
    if (!state.people.some((person) => String(person.id) === String(state.selectedPersonId))) state.selectedPersonId = state.people[0]?.id || '';
    WETHUS.refreshGlobalNav?.();
    updateUrl();
    render();
    root.addEventListener('click', handleClick);
    root.addEventListener('input', handleInput);
    root.addEventListener('change', handleChange);
    root.addEventListener('submit', handleSubmit);
  }

  init().catch((error) => {
    root.innerHTML = `<div class="nd-empty"><i class="ph ph-warning-circle" aria-hidden="true"></i><strong>Network를 불러오지 못했습니다.</strong><p>${escapeHtml(error?.message || '잠시 후 다시 시도해주세요.')}</p><a class="nd-button" href="index.html">홈으로 돌아가기</a></div>`;
  });
})();
