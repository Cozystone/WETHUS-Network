(function networkHomeDashboard() {
  'use strict';

  const root = document.getElementById('networkHomeRoot');
  if (!root) return;

  const query = new URLSearchParams(location.search);
  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
  const isNetworkPreviewHost = /^wethus-network-integrated-preview(?:-[a-z0-9]+)?\.vercel\.app$/i.test(location.hostname);
  const previewMode = query.get('preview') === '1' && (isLocal || isNetworkPreviewHost);
  const assetBase = 'assets/network-home';
  const fallbackAvatar = `${assetBase}/person-field-ops.webp`;
  const generatedHero = `${assetBase}/project-hero.webp`;

  const demoPeople = [
    {
      id: 'network-person-field',
      name: '박지훈',
      role: 'Field Ops',
      school: '연세대 · 사회학 4학년',
      summary: '현장 운영과 청소년 인터뷰 경험이 풍부해요.',
      profileImage: `${assetBase}/person-field-ops.webp`
    },
    {
      id: 'network-person-data',
      name: '윤태호',
      role: 'Data',
      school: '한양대 · 데이터 3학년',
      summary: '상권 데이터 분석과 시각화에 강점이 있어요.',
      profileImage: `${assetBase}/person-data.webp`
    },
    {
      id: 'network-person-design',
      name: '최유나',
      role: 'Design',
      school: '홍익대 · 시각 4학년',
      summary: '팝업 브랜딩과 공간 디자인 경험이 많아요.',
      profileImage: `${assetBase}/person-design.webp`
    },
    {
      id: 'network-person-marketing',
      name: '정민재',
      role: 'Marketing',
      school: 'KAIST · 경영 2학년',
      summary: 'SNS 운영과 콘텐츠 기획 경험이 있어요.',
      profileImage: `${assetBase}/person-marketing.webp`
    }
  ];

  const dashboard = {
    actorId: '',
    user: null,
    projects: [],
    activeProject: null,
    hub: null,
    people: [],
    slides: [],
    slideIndex: 0,
    calendarDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    selectedDay: new Date().getDate(),
    selectedDate: '',
    busy: false
  };
  let existingNavHeightObserver = null;
  let existingNavResizeHandler = null;
  let popoverDocumentHandler = null;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));

  function localDateKey(date) {
    const value = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(value.getTime())) return '';
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }

  function addDays(dateValue, amount) {
    const value = new Date(`${String(dateValue || localDateKey(new Date())).slice(0, 10)}T12:00:00`);
    value.setDate(value.getDate() + amount);
    return localDateKey(value);
  }

  function projectHubHref(options = {}) {
    if (!dashboard.activeProject?.id) return 'project-hub.html';
    const params = new URLSearchParams({
      projectId: String(dashboard.activeProject.id),
      tab: options.tab || 'overview'
    });
    if (options.focus) params.set('focus', options.focus);
    if (options.taskId) params.set('taskId', options.taskId);
    if (previewMode) params.set('preview', '1');
    return `project-hub.html?${params.toString()}`;
  }

  function networkHref(tab, options = {}) {
    const params = new URLSearchParams({ tab: tab || 'people' });
    if (dashboard.activeProject?.id) params.set('projectId', dashboard.activeProject.id);
    if (options.date) params.set('date', options.date);
    if (options.personId) params.set('personId', options.personId);
    if (previewMode) params.set('preview', '1');
    return `network.html?${params.toString()}`;
  }

  function personHref(person) {
    const params = new URLSearchParams({
      userId: String(person?.id || ''),
      name: String(person?.name || 'WETHUS 사용자'),
      role: String(person?.role || person?.headline || 'Builder'),
      bio: String(person?.summary || person?.bio || '')
    });
    return `member.html?${params.toString()}`;
  }

  function safeImageUrl(value, fallback = fallbackAvatar) {
    const raw = String(value || '').trim();
    if (!raw) return fallback;
    if (/^(https?:\/\/|data:image\/|\/|\.\/|assets\/|[a-z0-9_.-]+\/)/i.test(raw)) return raw;
    return fallback;
  }

  function actorId() {
    const state = window.WETHUS?.getState?.() || {};
    return String(window.WETHUS?.currentActorId?.() || state.currentUserId || (state.devMode ? 'dev-temp' : '')).trim();
  }

  function uniqueProjects(rows) {
    const map = new Map();
    (rows || []).forEach((project) => {
      if (!project?.id || map.has(String(project.id))) return;
      map.set(String(project.id), project);
    });
    return Array.from(map.values());
  }

  function userLabel(user) {
    return String(user?.name || user?.nickname || 'WETHUS 사용자').trim();
  }

  function userHandle(user) {
    const value = String(user?.nickname || user?.name || 'builder').trim().replace(/^@/, '').replace(/\s+/g, '.');
    return `@${value || 'builder'}`;
  }

  function profileRole(user) {
    const headline = String(user?.headline || '').trim();
    if (headline && headline.length <= 32) return headline;
    const interests = Array.isArray(user?.interestTags) ? user.interestTags : [];
    return interests[0] || 'Builder';
  }

  async function restoreSessionIfNeeded() {
    if (actorId() || !window.WETHUS?.restoreServerSession || previewMode) return;
    try {
      await Promise.race([
        window.WETHUS.restoreServerSession(),
        new Promise((resolve) => setTimeout(resolve, 3200))
      ]);
    } catch (_) {}
  }

  function ensurePreviewData() {
    if (!previewMode || !window.WETHUS) return;
    window.WETHUS.ensureLocalDevUser?.({
      force: true,
      id: 'network-preview-user',
      name: '김안석',
      nickname: 'anseok.kim',
      email: 'network.preview@wethus.dev'
    });

    const current = window.WETHUS.currentUser?.();
    if (current && (
      current.name !== '김안석' ||
      current.nickname !== 'anseok.kim' ||
      current.profileImage !== fallbackAvatar ||
      current.headline !== 'Builder'
    )) {
      window.WETHUS.updateCurrentUserProfile?.({
        name: '김안석',
        nickname: 'anseok.kim',
        profileImage: fallbackAvatar,
        headline: 'Builder',
        school: 'WETHUS Lab',
        interestTags: ['Startup', 'Data']
      });
    }

    let project = (window.WETHUS.myProjects?.() || []).find((item) => item.id === 'network-preview-workspace');
    if (!project) {
      project = window.WETHUS.addProject?.({
        id: 'network-preview-workspace',
        title: '상권 데이터로 청소년 팝업 실험 운영',
        summary: '지역 청소년과 상권을 연결하는 첫 팝업을 준비하고 있어요.',
        fullDescription: '상권 데이터와 현장 인터뷰를 바탕으로 작은 팝업 실험을 설계하고 운영합니다.',
        category: 'Startup',
        status: '진행 중',
        teamSize: '4인',
        roles: '리서치 · 현장 운영 · 디자인 · 마케팅',
        image: generatedHero,
        moderationStatus: 'approved'
      });
    }

    if (project && (project.image !== generatedHero || project.status !== '진행 중')) {
      try {
        project = window.WETHUS.updateProject?.(project.id, {
          image: generatedHero,
          status: '진행 중',
          summary: '지역 청소년과 상권을 연결하는 첫 팝업을 준비하고 있어요.'
        }) || project;
      } catch (_) {}
    }

    if (!project?.id) return;
    const state = window.WETHUS.getState?.() || {};
    const rawHub = state.projectHubs?.[project.id] || {};
    if (rawHub.networkHomeSeedVersion !== 3) {
      window.WETHUS.upsertProjectHub?.(project.id, {
        networkHomeSeedVersion: 3,
        goal: '첫 팝업 실험의 운영 일정과 측정 기준을 확정합니다.',
        weeklyTodos: ['현장 운영 재개 계획', '사용자 인터뷰 5명 확정', '챌린지 지원 여부 결정'],
        recentActivities: [
          { id: 'network-home-activity-1', text: '상점 인터뷰 3건을 정리했습니다.', createdAt: '2026-08-14T06:40:00.000Z' },
          { id: 'network-home-activity-2', text: '방문자 설문 초안을 팀과 공유했습니다.', createdAt: '2026-08-13T09:15:00.000Z' }
        ],
        blocker: '현장 운영을 맡을 팀원과 인터뷰 참여자를 더 확보해야 합니다.',
        mentorSummary: '검증 대상은 선명합니다. 이번 주에는 현장 운영 재개와 인터뷰 5명 확정이 우선입니다.',
        mentorPriority: '현장 운영 재개',
        mentorNextActions: ['현장 운영 재개 계획', '사용자 인터뷰 5명 확정', '챌린지 지원 여부 결정'],
        tools: [
          { name: 'Google Docs', url: '', desc: '인터뷰와 설문 문서' },
          { name: 'Google Sheets', url: '', desc: '일정과 응답 정리' }
        ]
      });
      const today = localDateKey(new Date());
      [
        ['현장 운영 재개 계획', 7, '15:30', '집중 세션'],
        ['사용자 인터뷰 5명 확정', 8, '', '프로젝트 작업'],
        ['챌린지 지원 여부 결정', 9, '', '프로젝트 작업']
      ].forEach(([title, offset, time, location]) => {
        window.WETHUS.addProjectTask?.(project.id, { title, dueAt: addDays(today, offset), time, location, source: 'network-preview' });
      });
      if (!(window.WETHUS.listProjectSchedule?.(project.id) || []).some((item) => item.kind !== 'task')) {
        [
          { title: '팀 스탠드업', time: '10:00', location: 'WETHUS Room', kind: 'meeting' },
          { title: '사용자 인터뷰', time: '13:00', location: '온라인 Zoom', kind: 'interview' },
          { title: '청년 창업가 정모', time: '18:00', location: '강남 커뮤니티 라운지', kind: 'community' }
        ].forEach((item) => window.WETHUS.addProjectScheduleItem?.(project.id, { ...item, date: today }));
      }
    }
  }

  function collectProjects() {
    const own = window.WETHUS?.myProjects?.() || [];
    const participating = window.WETHUS?.myParticipatingProjects?.() || [];
    return uniqueProjects([...own, ...participating]);
  }

  function selectedProjectId() {
    const key = `wethus.networkHome.project.${dashboard.actorId || 'guest'}`;
    try { return localStorage.getItem(key) || ''; } catch (_) { return ''; }
  }

  function persistSelectedProject(projectId) {
    const key = `wethus.networkHome.project.${dashboard.actorId || 'guest'}`;
    try { localStorage.setItem(key, String(projectId || '')); } catch (_) {}
  }

  function collectPeople() {
    const actual = (window.WETHUS?.listNetworkPeople?.({ actorId: dashboard.actorId }) || [])
      .filter((item) => item?.id && String(item.id) !== dashboard.actorId && !item.isAgent && item.role !== 'agent')
      .map((item, index) => ({
        id: String(item.id),
        name: userLabel(item),
        role: item.headline || (Array.isArray(item.interestTags) && item.interestTags[0]) || 'Builder',
        school: [item.school, item.major].filter(Boolean).join(' · ') || 'WETHUS Network',
        summary: item.bio || item.lookingFor || '프로젝트와 활동 기록을 통해 협업 가능성을 확인할 수 있어요.',
        profileImage: safeImageUrl(item.profileImage, previewMode ? demoPeople[index % demoPeople.length].profileImage : fallbackAvatar),
        skills: Array.isArray(item.skills) ? item.skills : [],
        lookingFor: item.lookingFor || '',
        realUser: true
      }));

    const map = new Map();
    [...actual, ...(previewMode ? demoPeople : [])].forEach((person) => {
      if (!map.has(person.id)) map.set(person.id, person);
    });
    return Array.from(map.values()).slice(0, 4);
  }

  function createSlides() {
    const projectSlides = dashboard.projects.slice(0, 3).map((project, index) => ({
      id: project.id,
      title: project.title || '현재 프로젝트',
      summary: project.summary || project.fullDescription || '프로젝트의 이번 주 실행 흐름을 확인하세요.',
      stage: index === 0 ? 'Week 2' : (project.status || '진행 중'),
      stageDetail: index === 0 ? '현장 실행' : (project.category || 'Project'),
      image: index === 0 ? safeImageUrl(project.image, generatedHero) : safeImageUrl(project.image, generatedHero),
      href: `project-hub.html?projectId=${encodeURIComponent(project.id)}&tab=overview${previewMode ? '&preview=1' : ''}`,
      cta: '프로젝트 열기'
    }));

    if (!projectSlides.length) {
      return [
        {
          id: 'start-project',
          title: '첫 프로젝트를 시작해보세요',
          summary: '아이디어를 등록하면 팀과 실행 기록, AI 멘토를 한곳에서 관리할 수 있어요.',
          stage: 'Start',
          stageDetail: '새 실행 만들기',
          image: generatedHero,
          href: 'founder.html',
          cta: '프로젝트 시작하기'
        },
        {
          id: 'find-network',
          title: '함께 실행할 사람을 찾아보세요',
          summary: '역할과 관심 분야를 기준으로 프로필을 읽고 연결을 시작할 수 있어요.',
          stage: 'Network',
          stageDetail: '사람 탐색',
          image: generatedHero,
          href: networkHref('people'),
          cta: '사람 찾기'
        },
        {
          id: 'explore-projects',
          title: '진행 중인 프로젝트를 둘러보세요',
          summary: '관심 분야의 프로젝트를 보고 팀 지원이나 북마크로 다음 행동을 이어가세요.',
          stage: 'Discover',
          stageDetail: '프로젝트 탐색',
          image: generatedHero,
          href: 'explore.html',
          cta: '탐색 열기'
        }
      ];
    }

    const current = projectSlides[0];
    while (projectSlides.length < 3) {
      const nextIndex = projectSlides.length;
      projectSlides.push({
        ...current,
        id: `${current.id}-brief-${nextIndex}`,
        title: nextIndex === 1 ? '이번 주 실행 브리프' : '팀 연결 추천 업데이트',
        summary: nextIndex === 1
          ? (dashboard.hub?.mentorSummary || '최근 활동을 바탕으로 이번 주 우선순위를 정리했어요.')
          : '프로젝트 단계와 필요한 역할을 기준으로 새로운 연결 후보를 찾았어요.',
        stage: nextIndex === 1 ? 'AI Brief' : 'Network',
        stageDetail: nextIndex === 1 ? '최근 기록 반영' : `새 연결 ${dashboard.people.length}명`,
        href: nextIndex === 1 ? projectHubHref({ tab: 'overview', focus: 'ai' }) : networkHref('people'),
        cta: nextIndex === 1 ? '브리프 열기' : '추천 연결 보기'
      });
    }
    return projectSlides.slice(0, 3);
  }

  function chatStorageKeyFor(projectId) {
    return `wethus.networkHome.chat.v1.${dashboard.actorId}.${projectId || 'general'}`;
  }

  function chatStorageKey() {
    return chatStorageKeyFor(dashboard.activeProject?.id);
  }

  function projectChatHistory() {
    return dashboard.projects.map((project) => {
      let messages = [];
      try {
        const parsed = JSON.parse(localStorage.getItem(chatStorageKeyFor(project.id)) || '[]');
        if (Array.isArray(parsed)) messages = parsed;
      } catch (_) {}
      const latest = messages[messages.length - 1];
      return { project, count: messages.length, latestAt: latest?.createdAt || '' };
    }).filter((item) => item.count > 0 || item.project.id === dashboard.activeProject?.id);
  }

  function initialMessages() {
    const projectTitle = dashboard.activeProject?.title || '현재 프로젝트';
    const tasks = projectTasks();
    if (!previewMode) {
      return [{
        id: `welcome-${dashboard.activeProject?.id || 'general'}`,
        role: 'ai',
        text: dashboard.activeProject?.id
          ? `${projectTitle}의 작업, 일정, 활동 기록을 함께 읽고 다음 실행을 정리할 수 있어요.`
          : '프로젝트를 시작하거나 참여하면 WETHUS AI가 작업, 일정, 활동 기록을 이어서 읽고 도와드려요.',
        actions: tasks.slice(0, 3)
      }];
    }
    return [
      {
        id: 'seed-user-1',
        role: 'user',
        text: '우리 팀에 지금 누가 필요해?'
      },
      {
        id: 'seed-ai-1',
        role: 'ai',
        text: '현장 운영과 청소년 인터뷰 경험이 풍부한 박지훈님을 추천드려요.',
        evidence: '팀 구성과 실행 이력을 함께 살펴봤어요.',
        personId: 'network-person-field'
      },
      {
        id: 'seed-user-2',
        role: 'user',
        text: '이번 주 우선순위도 정리해줘.'
      },
      {
        id: 'seed-ai-2',
        role: 'ai',
        text: `${projectTitle}의 최근 기록을 기준으로 이번 주 우선순위 3가지를 정리했어요.`,
        items: tasks.slice(0, 3),
        actions: tasks.slice(0, 3)
      },
      {
        id: 'seed-ai-3',
        role: 'ai',
        text: '새 활동 2건을 읽고 프로젝트 브리프를 업데이트했어요.'
      }
    ];
  }

  function readMessages() {
    try {
      const parsed = JSON.parse(localStorage.getItem(chatStorageKey()) || 'null');
      if (Array.isArray(parsed) && parsed.length) {
        const recent = parsed.slice(-40).filter((message) => previewMode || !String(message?.id || '').startsWith('seed-'));
        if (!recent.length) throw new Error('seed-only-history');
        const normalized = recent.map((message) => {
          const evidence = String(message?.evidence || '').trim();
          if (!evidence || /(맥락|흐름|상황).*(읽|살펴|바탕)|함께\s*(읽|살펴)/.test(evidence)) return message;
          return { ...message, evidence: '프로젝트 기록의 맥락과 관계를 함께 읽은 답변이에요.' };
        });
        if (JSON.stringify(normalized) !== JSON.stringify(recent)) writeMessages(normalized);
        return normalized;
      }
    } catch (_) {}
    const seeded = initialMessages();
    writeMessages(seeded);
    return seeded;
  }

  function writeMessages(messages) {
    try { localStorage.setItem(chatStorageKey(), JSON.stringify((messages || []).slice(-40))); } catch (_) {}
  }

  function projectTaskRows() {
    const rows = dashboard.activeProject?.id ? (window.WETHUS?.listProjectTasks?.(dashboard.activeProject.id) || []) : [];
    if (rows.length) return rows.slice(0, 5);
    return (Array.isArray(dashboard.hub?.weeklyTodos) ? dashboard.hub.weeklyTodos : [])
      .map((item, index) => ({
        id: `legacy-task-${index}`,
        title: typeof item === 'string' ? item : (item?.title || item?.text || ''),
        completed: false,
        dueAt: addDays(localDateKey(new Date()), index + 7),
        assigneeIds: []
      }))
      .filter((item) => item.title)
      .slice(0, 5);
  }

  function projectTasks() {
    return projectTaskRows().map((task) => task.title);
  }

  function scheduleRows(date = dashboard.selectedDate || localDateKey(new Date())) {
    if (!dashboard.activeProject?.id) return [];
    const rows = window.WETHUS?.listProjectSchedule?.(dashboard.activeProject.id, { from: date, to: date }) || [];
    return rows.slice(0, 6).map((item) => ({
      ...item,
      place: item.location || (item.kind === 'task' ? '프로젝트 작업' : '장소 미정'),
      icon: item.kind === 'task' ? 'ph-check-square' : (item.kind === 'meeting' ? 'ph-users-three' : (item.kind === 'interview' ? 'ph-chats-circle' : 'ph-calendar-dots')),
      href: item.kind === 'community'
        ? 'opportunities.html'
        : (item.kind === 'task'
            ? projectHubHref({ tab: 'overview', focus: 'tasks', taskId: item.taskId || '' })
            : networkHref('schedule', { date: item.date || date }))
    }));
  }

  function dueDate(value, fallbackOffset) {
    const date = value ? new Date(`${String(value).slice(0, 10)}T12:00:00`) : new Date();
    if (!value) date.setDate(date.getDate() + fallbackOffset);
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} (${weekdays[date.getDay()]})`;
  }

  function scheduleHeading() {
    const today = localDateKey(new Date());
    if (dashboard.selectedDate === today) return '오늘 일정';
    const date = new Date(`${dashboard.selectedDate}T12:00:00`);
    return Number.isNaN(date.getTime()) ? '선택한 일정' : `${date.getMonth() + 1}월 ${date.getDate()}일 일정`;
  }

  function buildProfileCard() {
    const avatar = safeImageUrl(dashboard.user?.profileImage, fallbackAvatar);
    const rows = scheduleRows();
    return `
      <section class="nh-panel nh-profile-card" aria-labelledby="nhProfileName">
        <div class="nh-profile-head">
          <a class="nh-profile-avatar" href="profile.html" aria-label="내 프로필 열기">
            <img src="${escapeHtml(avatar)}" alt="${escapeHtml(userLabel(dashboard.user))}" />
          </a>
          <div>
            <div class="nh-profile-name-row">
              <h1 class="nh-profile-name" id="nhProfileName">${escapeHtml(userLabel(dashboard.user))}</h1>
              <span class="nh-handle">${escapeHtml(userHandle(dashboard.user))}</span>
            </div>
            <p class="nh-profile-role">${escapeHtml(profileRole(dashboard.user))}</p>
          </div>
        </div>
        <div class="nh-divider" aria-hidden="true"></div>
        <div class="nh-section-heading">
          <h2 id="nhScheduleHeading">${escapeHtml(scheduleHeading())}</h2>
          <button class="nh-link-button" id="nhScheduleAll" type="button">전체 보기 <i class="ph ph-caret-right" aria-hidden="true"></i></button>
        </div>
        <ul class="nh-schedule-list" id="nhScheduleList">
          ${rows.length ? rows.map((row) => `
            <li><a class="nh-schedule-item" href="${escapeHtml(row.href)}">
              <span class="nh-schedule-icon"><i class="ph ${row.icon}" aria-hidden="true"></i></span>
              <span class="nh-schedule-time">${escapeHtml(row.time || '종일')}</span>
              <span class="nh-schedule-copy"><strong>${escapeHtml(row.title)}</strong><span>${escapeHtml(row.place)}</span></span>
              <span class="nh-schedule-dot" aria-hidden="true"></span>
            </a></li>
          `).join('') : '<li class="nh-schedule-empty"><span>이 날짜에는 일정이 없습니다.</span><a href="' + escapeHtml(networkHref('schedule', { date: dashboard.selectedDate })) + '">일정 추가</a></li>'}
        </ul>
      </section>
    `;
  }

  function buildCalendarCard() {
    return `
      <section class="nh-panel nh-calendar-card" aria-labelledby="nhCalendarTitle">
        <div class="nh-section-heading">
          <h2 id="nhCalendarTitle"></h2>
          <div class="nh-calendar-controls">
            <button class="nh-calendar-arrow" id="nhCalendarPrev" type="button" aria-label="이전 달"><i class="ph ph-caret-left" aria-hidden="true"></i></button>
            <button class="nh-calendar-arrow" id="nhCalendarNext" type="button" aria-label="다음 달"><i class="ph ph-caret-right" aria-hidden="true"></i></button>
          </div>
        </div>
        <div class="nh-calendar-weekdays" aria-hidden="true">
          <span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>
        </div>
        <div class="nh-calendar-days" id="nhCalendarDays"></div>
      </section>
    `;
  }

  function buildHero() {
    const slide = dashboard.slides[dashboard.slideIndex] || dashboard.slides[0];
    return `
      <section class="nh-panel nh-hero-card" aria-label="현재 프로젝트">
        <img class="nh-hero-image" id="nhHeroImage" src="${escapeHtml(safeImageUrl(slide.image, generatedHero))}" alt="${escapeHtml(slide.title)}" />
        <div class="nh-hero-overlay" aria-hidden="true"></div>
        <div class="nh-hero-tint" aria-hidden="true"></div>
        <div class="nh-hero-content">
          <h2 class="nh-hero-title" id="nhHeroTitle">${escapeHtml(slide.title)}</h2>
          <div class="nh-hero-stage"><strong id="nhHeroStage">${escapeHtml(slide.stage)}</strong><span>·</span><span id="nhHeroStageDetail">${escapeHtml(slide.stageDetail)}</span></div>
          <p class="nh-hero-summary" id="nhHeroSummary">${escapeHtml(slide.summary)}</p>
          <a class="nh-primary-button nh-hero-button" id="nhHeroLink" href="${escapeHtml(slide.href)}">${escapeHtml(slide.cta)} <i class="ph ph-arrow-right" aria-hidden="true"></i></a>
        </div>
        <button class="nh-carousel-arrow nh-carousel-arrow--prev" id="nhHeroPrev" type="button" aria-label="이전 배너"><i class="ph ph-caret-left" aria-hidden="true"></i></button>
        <button class="nh-carousel-arrow nh-carousel-arrow--next" id="nhHeroNext" type="button" aria-label="다음 배너"><i class="ph ph-caret-right" aria-hidden="true"></i></button>
        <div class="nh-carousel-dots" role="tablist" aria-label="프로젝트 배너">
          ${dashboard.slides.map((item, index) => `<button class="nh-carousel-dot${index === dashboard.slideIndex ? ' is-active' : ''}" type="button" data-slide-index="${index}" aria-label="${index + 1}번 배너" aria-selected="${index === dashboard.slideIndex}"></button>`).join('')}
        </div>
      </section>
    `;
  }

  function connectionIds() {
    const outgoing = window.WETHUS?.listConnections?.({ actorId: dashboard.actorId }) || [];
    const acceptedIncoming = (window.WETHUS?.listConnections?.({ actorId: dashboard.actorId, direction: 'incoming' }) || [])
      .filter((row) => row.status === 'accepted');
    return new Set([
      ...outgoing.map((row) => String(row.targetUserId || '')),
      ...acceptedIncoming.map((row) => String(row.actorId || ''))
    ].filter(Boolean));
  }

  function taskAssignees(task, index) {
    const appState = window.WETHUS?.getState?.() || {};
    const users = Array.isArray(appState.users) ? appState.users : [];
    const team = Array.isArray(dashboard.activeProject?.teamMembers) ? dashboard.activeProject.teamMembers : [];
    const ids = Array.isArray(task?.assigneeIds) ? task.assigneeIds.map(String) : [];
    let rows = team
      .filter((member) => !ids.length || ids.includes(String(member?.id || member?.userId || '')))
      .map((member) => {
        const account = users.find((user) => String(user?.id || '') === String(member?.id || member?.userId || '')) || {};
        return {
          id: member?.id || account?.id || '',
          name: member?.name || account?.name || account?.nickname || '팀원',
          profileImage: account?.profileImage || member?.profileImage || ''
        };
      });
    if (!rows.length && dashboard.user) {
      rows = [{ id: dashboard.actorId, name: userLabel(dashboard.user), profileImage: dashboard.user.profileImage || fallbackAvatar }];
    }
    if (previewMode && rows.length < 2) rows.push(demoPeople[index % demoPeople.length]);
    const map = new Map();
    rows.forEach((person) => { if (person?.name && !map.has(String(person.id || person.name))) map.set(String(person.id || person.name), person); });
    return Array.from(map.values());
  }

  function buildPeople() {
    const connected = connectionIds();
    return `
      <section class="nh-panel nh-people-panel" aria-labelledby="nhPeopleTitle">
        <div class="nh-section-heading">
          <h2 id="nhPeopleTitle">추천 연결</h2>
          <a class="nh-link-button" href="${escapeHtml(networkHref('people'))}">더 보기 <i class="ph ph-caret-right" aria-hidden="true"></i></a>
        </div>
        ${dashboard.people.length ? `<div class="nh-people-grid">
          ${dashboard.people.map((person) => {
            const isConnected = connected.has(String(person.id));
            return `
              <article class="nh-person-card" data-person-id="${escapeHtml(person.id)}">
                <div class="nh-person-head">
                  <a class="nh-person-avatar" href="${escapeHtml(personHref(person))}" aria-label="${escapeHtml(person.name)} 프로필"><img src="${escapeHtml(safeImageUrl(person.profileImage))}" alt="${escapeHtml(person.name)}" /></a>
                  <div>
                    <div class="nh-person-name-row"><a class="nh-person-name" href="${escapeHtml(personHref(person))}">${escapeHtml(person.name)}</a><span class="nh-person-role">${escapeHtml(person.role)}</span></div>
                    <span class="nh-person-school">${escapeHtml(person.school)}</span>
                  </div>
                </div>
                <p class="nh-person-summary">${escapeHtml(person.summary)}</p>
                <button class="nh-connect-button${isConnected ? ' is-connected' : ''}" type="button" data-connect-id="${escapeHtml(person.id)}" aria-pressed="${isConnected}">
                  <i class="ph ${isConnected ? 'ph-check' : 'ph-user-plus'}" aria-hidden="true"></i>${isConnected ? '연결 요청됨' : '연결'}
                </button>
              </article>
            `;
          }).join('')}
        </div>` : `<div class="nh-people-empty"><strong>새 연결을 찾을 준비가 됐습니다.</strong><span>프로필의 역할과 찾는 협업을 채우면 실제 WETHUS 사용자 추천이 여기에 표시됩니다.</span><a href="profile.html">프로필 보완</a></div>`}
      </section>
    `;
  }

  function buildTaskRows() {
    const tasks = projectTaskRows();
    const icons = ['ph-file-pdf', 'ph-chart-bar', 'ph-check'];
    return tasks.map((task, index) => {
      const title = task.title;
      const complete = !!task.completed;
      const assignees = taskAssignees(task, index);
      return `
        <div class="nh-task-row${complete ? ' is-complete' : ''}" data-task-id="${escapeHtml(task.id)}">
          <button class="nh-task-check" type="button" data-task-check="${escapeHtml(task.id)}" aria-label="${escapeHtml(title)} ${complete ? '완료 취소' : '완료 처리'}" aria-pressed="${complete}"><i class="ph ph-check" aria-hidden="true"></i></button>
          <span class="nh-task-icon"><i class="ph ${icons[index] || 'ph-check'}" aria-hidden="true"></i></span>
          <span class="nh-task-main"><strong class="nh-task-title">${escapeHtml(title)}</strong><span class="nh-task-status">${complete ? '완료' : '진행 중'}</span></span>
          <span class="nh-task-due">마감&nbsp; ${escapeHtml(dueDate(task.dueAt, 7 + index))}</span>
          <span class="nh-task-avatars" aria-label="담당자">
            ${assignees.slice(0, 2).map((person) => `<span class="nh-task-avatar"><img src="${escapeHtml(safeImageUrl(person.profileImage))}" alt="${escapeHtml(person.name)}" /></span>`).join('')}
            ${assignees.length > 2 ? `<span class="nh-task-avatar-more">+${assignees.length - 2}</span>` : ''}
          </span>
          <button class="nh-task-menu" type="button" data-task-open="${escapeHtml(task.id)}" aria-label="${escapeHtml(title)} 프로젝트 허브에서 열기"><i class="ph ph-dots-three-vertical" aria-hidden="true"></i></button>
        </div>
      `;
    }).join('');
  }

  function buildWork() {
    return `
      <section class="nh-panel nh-work-panel" aria-labelledby="nhWorkTitle">
        <div class="nh-section-heading"><h2 id="nhWorkTitle">Work</h2></div>
        <div class="nh-task-list" id="nhTaskList">${buildTaskRows()}</div>
        <button class="nh-add-task-button" id="nhAddTask" type="button"><i class="ph ph-plus" aria-hidden="true"></i>새 작업 추가</button>
        <form class="nh-task-adder" id="nhTaskAdder">
          <input id="nhTaskInput" maxlength="80" autocomplete="off" aria-label="새 작업" placeholder="새 작업을 입력하세요" />
          <button class="nh-primary-button" type="submit">추가</button>
          <button class="nh-secondary-button" id="nhTaskCancel" type="button">취소</button>
        </form>
      </section>
    `;
  }

  function messageMarkup(message) {
    const isAi = message.role === 'ai';
    const avatar = safeImageUrl(dashboard.user?.profileImage, fallbackAvatar);
    const person = message.personId ? dashboard.people.find((item) => item.id === message.personId) : null;
    const items = Array.isArray(message.items) ? message.items.filter(Boolean) : [];
    const actions = Array.isArray(message.actions) ? message.actions.filter(Boolean) : [];
    return `
      <article class="nh-message ${isAi ? 'is-ai' : 'is-user'}" data-message-id="${escapeHtml(message.id)}">
        <span class="nh-message-avatar">${isAi ? '<span class="nh-ai-glyph" aria-hidden="true">W.</span>' : `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(userLabel(dashboard.user))}" />`}</span>
        <div>
          <div class="nh-message-bubble">
            <div>${escapeHtml(message.text || '')}</div>
            ${items.length ? `<ol>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol>` : ''}
            ${message.evidence ? `<div class="nh-message-evidence">${escapeHtml(message.evidence)}</div>` : ''}
            ${(person || actions.length) ? `
              <div class="nh-message-actions">
                ${person ? `<a class="nh-secondary-button nh-apply-button" href="${escapeHtml(personHref(person))}">${escapeHtml(person.name)} 보기</a><button class="nh-apply-button" type="button" data-connect-id="${escapeHtml(person.id)}">연결 제안</button>` : ''}
                ${actions.length ? `<button class="nh-apply-button" type="button" data-apply-message="${escapeHtml(message.id)}" ${message.applied ? 'disabled' : ''}>${message.applied ? '반영됨' : '프로젝트에 반영'}</button>` : ''}
              </div>
            ` : ''}
          </div>
        </div>
      </article>
    `;
  }

  function buildAiPanel() {
    const projectOptions = dashboard.projects.length
      ? dashboard.projects.map((project) => `<option value="${escapeHtml(project.id)}" ${project.id === dashboard.activeProject?.id ? 'selected' : ''}>${escapeHtml(project.title || '현재 프로젝트')}</option>`).join('')
      : '<option value="">프로젝트 없음</option>';
    return `
      <aside class="nh-panel nh-ai-panel" aria-labelledby="nhAiTitle">
        <header class="nh-ai-header">
          <div>
            <h2 class="nh-ai-title" id="nhAiTitle">WETHUS</h2>
            <p class="nh-ai-status"><span class="nh-ai-status-dot" aria-hidden="true"></span>프로젝트 · 지식그래프 기억 연결됨</p>
          </div>
          <div class="nh-ai-header-actions">
            <button class="nh-icon-button" id="nhAiHistory" type="button" aria-label="대화 기록"><i class="ph ph-clock-counter-clockwise" aria-hidden="true"></i></button>
            <button class="nh-icon-button" id="nhAiMore" type="button" aria-label="AI 메뉴" aria-expanded="false"><i class="ph ph-dots-three-vertical" aria-hidden="true"></i></button>
          </div>
        </header>
        <div class="nh-ai-menu" id="nhAiMenu">
          <a href="${escapeHtml(projectHubHref({ tab: 'overview', focus: 'ai' }))}"><i class="ph ph-layout" aria-hidden="true"></i>AI 멘토 허브 열기</a>
          <button id="nhAiReset" type="button"><i class="ph ph-arrow-counter-clockwise" aria-hidden="true"></i>대화 초기화</button>
        </div>
        <div class="nh-ai-history" id="nhAiHistoryPanel" hidden>
          <div class="nh-ai-history-head"><strong>프로젝트별 대화</strong><button type="button" id="nhAiHistoryClose" aria-label="대화 기록 닫기"><i class="ph ph-x" aria-hidden="true"></i></button></div>
          <div class="nh-ai-history-list">
            ${projectChatHistory().map(({ project, count, latestAt }) => `<button class="nh-ai-history-row${project.id === dashboard.activeProject?.id ? ' is-active' : ''}" type="button" data-history-project="${escapeHtml(project.id)}"><span><strong>${escapeHtml(project.title || '프로젝트')}</strong><small>${latestAt ? escapeHtml(new Date(latestAt).toLocaleDateString('ko-KR')) : '새 대화'}</small></span><em>${count}건</em></button>`).join('')}
          </div>
        </div>
        <div class="nh-ai-messages" id="nhAiMessages" aria-live="polite"></div>
        <div class="nh-ai-composer">
          <form class="nh-chat-form" id="nhChatForm">
            <input class="nh-chat-input" id="nhChatInput" maxlength="800" autocomplete="off" placeholder="무엇이든 물어보세요" aria-label="WETHUS AI 메시지" />
            <button class="nh-attach-button" id="nhAttachButton" type="button" aria-label="파일 첨부"><i class="ph ph-paperclip" aria-hidden="true"></i></button>
            <button class="nh-send-button" id="nhSendButton" type="submit" aria-label="보내기"><i class="ph ph-paper-plane-tilt" aria-hidden="true"></i></button>
            <input id="nhFileInput" type="file" accept=".txt,.md,.markdown,.csv,.json,.log,text/plain,text/markdown,text/csv,application/json" hidden />
          </form>
          <label class="nh-project-context">
            <i class="ph ph-folder" aria-hidden="true"></i>
            <select id="nhProjectSelect" aria-label="AI가 참고할 프로젝트">${projectOptions}</select>
          </label>
        </div>
      </aside>
    `;
  }

  function integrateExistingNav() {
    const existingNav = document.querySelector('body > .nav');
    if (!existingNav) return;

    const existingWordmark = existingNav.querySelector('.wordmark');
    if (existingWordmark) existingWordmark.setAttribute('href', 'index.html');

    const syncHeight = () => {
      const height = Math.ceil(existingNav.getBoundingClientRect().height || 62);
      document.documentElement.style.setProperty('--nh-existing-nav-height', `${height}px`);
    };
    syncHeight();

    if (!existingNavResizeHandler) {
      existingNavResizeHandler = syncHeight;
      window.addEventListener('resize', existingNavResizeHandler, { passive: true });
    }
    if (!existingNavHeightObserver && 'ResizeObserver' in window) {
      existingNavHeightObserver = new ResizeObserver(syncHeight);
      existingNavHeightObserver.observe(existingNav);
    }
  }

  function renderShell() {
    root.innerHTML = `
      <div class="nh-shell">
        <main class="nh-dashboard-grid">
          <div class="nh-left-column">
            ${buildProfileCard()}
            ${buildCalendarCard()}
          </div>
          <div class="nh-center-column" tabindex="0" aria-label="프로젝트 홈 중앙 콘텐츠">
            ${buildHero()}
            ${buildPeople()}
            ${buildWork()}
          </div>
          ${buildAiPanel()}
        </main>
      </div>
      <div class="nh-toast-region" id="nhToastRegion" aria-live="polite"></div>
    `;
    root.hidden = false;
    document.body.classList.add('network-home-mode');
    integrateExistingNav();
    document.title = 'WETHUS | Home';
    renderCalendar();
    renderMessages();
    bindInteractions();
  }

  function renderHeroSlide() {
    const slide = dashboard.slides[dashboard.slideIndex] || dashboard.slides[0];
    if (!slide) return;
    const image = document.getElementById('nhHeroImage');
    if (image) {
      image.style.opacity = '0.35';
      window.setTimeout(() => {
        image.src = safeImageUrl(slide.image, generatedHero);
        image.alt = slide.title;
        image.style.opacity = '1';
      }, 120);
    }
    const title = document.getElementById('nhHeroTitle');
    const stage = document.getElementById('nhHeroStage');
    const detail = document.getElementById('nhHeroStageDetail');
    const summary = document.getElementById('nhHeroSummary');
    const link = document.getElementById('nhHeroLink');
    if (title) title.textContent = slide.title;
    if (stage) stage.textContent = slide.stage;
    if (detail) detail.textContent = slide.stageDetail;
    if (summary) summary.textContent = slide.summary;
    if (link) {
      link.href = slide.href;
      link.childNodes[0].nodeValue = `${slide.cta} `;
    }
    document.querySelectorAll('.nh-carousel-dot').forEach((dot, index) => {
      dot.classList.toggle('is-active', index === dashboard.slideIndex);
      dot.setAttribute('aria-selected', String(index === dashboard.slideIndex));
    });
  }

  function renderCalendar() {
    const title = document.getElementById('nhCalendarTitle');
    const container = document.getElementById('nhCalendarDays');
    if (!title || !container) return;
    const year = dashboard.calendarDate.getFullYear();
    const month = dashboard.calendarDate.getMonth();
    title.textContent = `${year}년 ${month + 1}월`;
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const previousLastDate = new Date(year, month, 0).getDate();
    const eventDates = new Set((dashboard.activeProject?.id ? (window.WETHUS?.listProjectSchedule?.(dashboard.activeProject.id) || []) : [])
      .map((item) => String(item?.date || '').slice(0, 10))
      .filter(Boolean));
    const cells = [];
    for (let index = 0; index < 42; index += 1) {
      let day;
      let outside = false;
      let targetMonth = month;
      if (index < firstDay) {
        day = previousLastDate - firstDay + index + 1;
        outside = true;
        targetMonth = month - 1;
      } else if (index >= firstDay + lastDate) {
        day = index - firstDay - lastDate + 1;
        outside = true;
        targetMonth = month + 1;
      } else {
        day = index - firstDay + 1;
      }
      const cellDate = new Date(year, targetMonth, day);
      const dateKey = localDateKey(cellDate);
      const selected = dateKey === dashboard.selectedDate;
      const hasEvent = eventDates.has(dateKey);
      cells.push(`<button class="nh-calendar-day${outside ? ' is-outside' : ''}${selected ? ' is-selected' : ''}${hasEvent ? ' has-event' : ''}" type="button" data-calendar-day="${day}" data-calendar-date="${dateKey}" data-calendar-offset="${targetMonth - month}" aria-label="${cellDate.getFullYear()}년 ${cellDate.getMonth() + 1}월 ${day}일" aria-pressed="${selected}">${day}</button>`);
    }
    container.innerHTML = cells.join('');
    container.querySelectorAll('[data-calendar-day]').forEach((button) => {
      button.addEventListener('click', () => {
        const offset = Number(button.dataset.calendarOffset || 0);
        if (offset) {
          dashboard.calendarDate = new Date(year, month + offset, 1);
        }
        dashboard.selectedDay = Number(button.dataset.calendarDay || 1);
        dashboard.selectedDate = button.dataset.calendarDate || localDateKey(new Date(year, month, dashboard.selectedDay));
        renderCalendar();
        renderSchedule();
      });
    });
  }

  function renderSchedule() {
    const heading = document.getElementById('nhScheduleHeading');
    const list = document.getElementById('nhScheduleList');
    if (heading) heading.textContent = scheduleHeading();
    if (!list) return;
    const rows = scheduleRows();
    list.innerHTML = rows.length ? rows.map((row) => `
      <li><a class="nh-schedule-item" href="${escapeHtml(row.href)}">
        <span class="nh-schedule-icon"><i class="ph ${row.icon}" aria-hidden="true"></i></span>
        <span class="nh-schedule-time">${escapeHtml(row.time || '종일')}</span>
        <span class="nh-schedule-copy"><strong>${escapeHtml(row.title)}</strong><span>${escapeHtml(row.place)}</span></span>
        <span class="nh-schedule-dot" aria-hidden="true"></span>
      </a></li>
    `).join('') : `<li class="nh-schedule-empty"><span>이 날짜에는 일정이 없습니다.</span><a href="${escapeHtml(networkHref('schedule', { date: dashboard.selectedDate }))}">일정 추가</a></li>`;
  }

  function renderMessages(options = {}) {
    const container = document.getElementById('nhAiMessages');
    if (!container) return;
    const messages = readMessages();
    container.innerHTML = messages.map(messageMarkup).join('') + (options.typing ? `
      <article class="nh-message is-ai">
        <span class="nh-message-avatar"><span class="nh-ai-glyph" aria-hidden="true">W.</span></span>
        <div class="nh-message-bubble nh-typing" aria-label="WETHUS AI가 답변 작성 중"><span></span><span></span><span></span></div>
      </article>
    ` : '');
    bindMessageActions(container);
    requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
  }

  function renderTasks() {
    const list = document.getElementById('nhTaskList');
    if (list) list.innerHTML = buildTaskRows();
    bindTaskActions();
  }

  function showToast(message) {
    const region = document.getElementById('nhToastRegion');
    if (!region) return;
    const toast = document.createElement('div');
    toast.className = 'nh-toast';
    toast.textContent = message;
    region.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3200);
  }

  function toggleConnection(targetId) {
    if (!targetId) return;
    try {
      const result = window.WETHUS?.toggleConnection?.(targetId);
      const connected = !!result?.connected;
      document.querySelectorAll(`[data-connect-id="${CSS.escape(String(targetId))}"]`).forEach((button) => {
        button.classList.toggle('is-connected', connected);
        button.setAttribute('aria-pressed', String(connected));
        const icon = button.querySelector('i');
        if (icon) icon.className = `ph ${connected ? 'ph-check' : 'ph-user-plus'}`;
        if (button.classList.contains('nh-connect-button')) {
          button.lastChild.nodeValue = connected ? '연결 요청됨' : '연결';
        } else {
          button.lastChild.nodeValue = connected ? '요청 취소' : '연결 제안';
        }
      });
      showToast(connected ? '연결 요청을 보냈습니다.' : '연결 요청을 취소했습니다.');
    } catch (error) {
      showToast(error?.message || '연결 요청을 처리하지 못했습니다.');
    }
  }

  function bindMessageActions(container) {
    container.querySelectorAll('[data-connect-id]').forEach((button) => {
      button.addEventListener('click', () => toggleConnection(button.dataset.connectId));
    });
    container.querySelectorAll('[data-focus-person]').forEach((button) => {
      button.addEventListener('click', () => {
        const card = document.querySelector(`[data-person-id="${CSS.escape(String(button.dataset.focusPerson || ''))}"]`);
        if (!card) return;
        card.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        card.classList.add('is-highlighted');
        window.setTimeout(() => card.classList.remove('is-highlighted'), 1600);
      });
    });
    container.querySelectorAll('[data-apply-message]').forEach((button) => {
      button.addEventListener('click', () => applyMessageToProject(button.dataset.applyMessage));
    });
  }

  function applyMessageToProject(messageId) {
    if (!dashboard.activeProject?.id) {
      showToast('먼저 프로젝트를 시작해주세요.');
      return;
    }
    const messages = readMessages();
    const target = messages.find((message) => String(message.id) === String(messageId));
    if (!target || !Array.isArray(target.actions) || target.applied) return;
    target.actions.slice(0, 5).forEach((title, index) => {
      window.WETHUS?.addProjectTask?.(dashboard.activeProject.id, {
        title,
        dueAt: addDays(localDateKey(new Date()), 3 + index),
        source: 'network-home-ai'
      });
    });
    dashboard.hub = window.WETHUS?.getProjectHub?.(dashboard.activeProject.id) || dashboard.hub || {};
    window.WETHUS?.recordSemanticEvent?.({
      action: 'ai_recommendation_applied',
      targetType: 'project',
      targetId: dashboard.activeProject.id,
      projectId: dashboard.activeProject.id,
      visibility: 'team',
      metadata: { actions: target.actions.slice(0, 5), source: 'network-home' }
    });
    target.applied = true;
    writeMessages(messages);
    renderMessages();
    renderTasks();
    showToast('AI 제안을 프로젝트 작업에 반영했습니다.');
  }

  function bindTaskActions() {
    document.querySelectorAll('[data-task-check]').forEach((button) => {
      button.addEventListener('click', () => {
        const taskId = String(button.dataset.taskCheck || '');
        const task = projectTaskRows().find((item) => String(item.id) === taskId);
        if (!task || !dashboard.activeProject?.id) return;
        const updated = window.WETHUS?.setProjectTaskCompleted?.(dashboard.activeProject.id, task.id, !task.completed);
        dashboard.hub = window.WETHUS?.getProjectHub?.(dashboard.activeProject.id) || dashboard.hub;
        renderTasks();
        renderCalendar();
        renderSchedule();
        showToast(updated?.completed ? '작업을 완료 처리했습니다.' : '작업을 다시 진행 중으로 바꿨습니다.');
      });
    });
    document.querySelectorAll('[data-task-open]').forEach((button) => {
      button.addEventListener('click', () => {
        location.href = projectHubHref({ tab: 'overview', focus: 'tasks', taskId: button.dataset.taskOpen || '' });
      });
    });
  }

  async function prepareAttachment(file) {
    const maxBytes = 256 * 1024;
    const extension = String(file?.name || '').split('.').pop().toLowerCase();
    const allowedExtensions = new Set(['txt', 'md', 'markdown', 'csv', 'json', 'log']);
    const textMime = /^(text\/|application\/(json|csv))/i.test(String(file?.type || ''));
    if (!allowedExtensions.has(extension) && !textMime) throw new Error('현재는 TXT, Markdown, CSV, JSON 파일을 읽을 수 있습니다.');
    if (Number(file?.size || 0) > maxBytes) throw new Error('파일은 256KB 이하로 첨부해주세요.');
    const content = String(await file.text()).replace(/\u0000/g, '').trim();
    if (!content) throw new Error('파일에 읽을 수 있는 텍스트가 없습니다.');
    const clipped = content.slice(0, 30000);
    const currentHub = dashboard.activeProject?.id
      ? (window.WETHUS?.getProjectHub?.(dashboard.activeProject.id) || dashboard.hub || {})
      : {};
    const currentMaterials = Array.isArray(currentHub.materials) ? currentHub.materials : [];
    const existingMaterial = currentMaterials.find((material) => (
      String(material?.name || '') === String(file.name || '첨부 파일') &&
      Number(material?.size || 0) === Number(file.size || 0) &&
      String(material?.snippet || '').slice(0, 6000) === clipped.slice(0, 6000)
    ));
    const attachment = {
      id: existingMaterial?.id || `network-attachment-${Date.now()}`,
      name: String(file.name || '첨부 파일').slice(0, 180),
      type: String(file.type || `text/${extension || 'plain'}`).slice(0, 120),
      size: Number(file.size || 0),
      content: clipped,
      truncated: clipped.length < content.length
    };
    if (dashboard.activeProject?.id) {
      const materials = [
        {
          id: attachment.id,
          name: attachment.name,
          type: attachment.type,
          size: attachment.size,
          snippet: clipped.slice(0, 6000),
          source: 'network-home-ai',
          createdAt: new Date().toISOString()
        },
        ...currentMaterials.filter((material) => (
          String(material?.id || '') !== String(attachment.id) && !(
            String(material?.name || '') === attachment.name &&
            Number(material?.size || 0) === attachment.size &&
            String(material?.snippet || '').slice(0, 6000) === clipped.slice(0, 6000)
          )
        ))
      ].slice(0, 80);
      dashboard.hub = window.WETHUS?.upsertProjectHub?.(dashboard.activeProject.id, { materials }) || currentHub;
      if (!existingMaterial) {
        window.WETHUS?.recordSemanticEvent?.({
          action: 'material_added',
          targetType: 'resource',
          targetId: attachment.id,
          projectId: dashboard.activeProject.id,
          visibility: 'team',
          metadata: { name: attachment.name, type: attachment.type, size: attachment.size, source: 'network-home-ai' }
        });
      }
    }
    return attachment;
  }

  function bindInteractions() {
    const centerColumn = document.querySelector('.nh-center-column');
    centerColumn?.addEventListener('keydown', (event) => {
      if (event.target !== centerColumn) return;

      const pageStep = Math.max(180, Math.round(centerColumn.clientHeight * 0.72));
      let nextTop = null;
      if (event.key === 'PageDown' || (event.key === ' ' && !event.shiftKey)) {
        nextTop = centerColumn.scrollTop + pageStep;
      } else if (event.key === 'PageUp' || (event.key === ' ' && event.shiftKey)) {
        nextTop = centerColumn.scrollTop - pageStep;
      } else if (event.key === 'Home') {
        nextTop = 0;
      } else if (event.key === 'End') {
        nextTop = centerColumn.scrollHeight;
      }

      if (nextTop === null) return;
      event.preventDefault();
      centerColumn.scrollTo({ top: nextTop, behavior: 'smooth' });
    });

    document.getElementById('nhHeroPrev')?.addEventListener('click', () => {
      dashboard.slideIndex = (dashboard.slideIndex - 1 + dashboard.slides.length) % dashboard.slides.length;
      renderHeroSlide();
    });
    document.getElementById('nhHeroNext')?.addEventListener('click', () => {
      dashboard.slideIndex = (dashboard.slideIndex + 1) % dashboard.slides.length;
      renderHeroSlide();
    });
    document.querySelectorAll('[data-slide-index]').forEach((button) => {
      button.addEventListener('click', () => {
        dashboard.slideIndex = Number(button.dataset.slideIndex || 0);
        renderHeroSlide();
      });
    });
    document.getElementById('nhCalendarPrev')?.addEventListener('click', () => {
      dashboard.calendarDate = new Date(dashboard.calendarDate.getFullYear(), dashboard.calendarDate.getMonth() - 1, 1);
      dashboard.selectedDay = 1;
      dashboard.selectedDate = localDateKey(dashboard.calendarDate);
      renderCalendar();
      renderSchedule();
    });
    document.getElementById('nhCalendarNext')?.addEventListener('click', () => {
      dashboard.calendarDate = new Date(dashboard.calendarDate.getFullYear(), dashboard.calendarDate.getMonth() + 1, 1);
      dashboard.selectedDay = 1;
      dashboard.selectedDate = localDateKey(dashboard.calendarDate);
      renderCalendar();
      renderSchedule();
    });
    document.getElementById('nhScheduleAll')?.addEventListener('click', () => {
      location.href = networkHref('schedule', { date: dashboard.selectedDate });
    });
    document.querySelectorAll('.nh-person-card [data-connect-id]').forEach((button) => {
      button.addEventListener('click', () => toggleConnection(button.dataset.connectId));
    });
    bindTaskActions();

    const adder = document.getElementById('nhTaskAdder');
    const addButton = document.getElementById('nhAddTask');
    const input = document.getElementById('nhTaskInput');
    addButton?.addEventListener('click', () => {
      adder?.classList.add('is-open');
      addButton.hidden = true;
      input?.focus();
    });
    document.getElementById('nhTaskCancel')?.addEventListener('click', () => {
      adder?.classList.remove('is-open');
      addButton.hidden = false;
      if (input) input.value = '';
    });
    adder?.addEventListener('submit', (event) => {
      event.preventDefault();
      const title = String(input?.value || '').trim();
      if (!title) return;
      if (!dashboard.activeProject?.id) {
        showToast('프로젝트를 먼저 시작해주세요.');
        return;
      }
      window.WETHUS?.addProjectTask?.(dashboard.activeProject.id, {
        title,
        dueAt: addDays(localDateKey(new Date()), 7),
        source: 'network-home'
      });
      dashboard.hub = window.WETHUS?.getProjectHub?.(dashboard.activeProject.id) || dashboard.hub;
      if (input) input.value = '';
      adder.classList.remove('is-open');
      addButton.hidden = false;
      renderTasks();
      renderCalendar();
      showToast('새 작업을 프로젝트에 추가했습니다.');
    });

    const more = document.getElementById('nhAiMore');
    const menu = document.getElementById('nhAiMenu');
    const historyPanel = document.getElementById('nhAiHistoryPanel');
    more?.addEventListener('click', () => {
      const open = menu?.classList.toggle('is-open');
      more.setAttribute('aria-expanded', String(!!open));
      if (historyPanel) historyPanel.hidden = true;
    });
    document.getElementById('nhAiHistory')?.addEventListener('click', () => {
      if (!historyPanel) return;
      historyPanel.hidden = !historyPanel.hidden;
      menu?.classList.remove('is-open');
      more?.setAttribute('aria-expanded', 'false');
    });
    document.getElementById('nhAiHistoryClose')?.addEventListener('click', () => { if (historyPanel) historyPanel.hidden = true; });
    document.querySelectorAll('[data-history-project]').forEach((button) => {
      button.addEventListener('click', () => {
        const next = dashboard.projects.find((project) => String(project.id) === String(button.dataset.historyProject));
        if (!next) return;
        persistSelectedProject(next.id);
        hydrateDashboard(next.id);
        renderShell();
      });
    });
    document.getElementById('nhAiReset')?.addEventListener('click', async () => {
      const confirmed = await (window.WETHUS?.uiConfirm?.('현재 프로젝트의 AI 대화 기록을 초기화할까요?', {
        title: '대화 기록 초기화',
        confirmText: '초기화',
        cancelText: '취소'
      }) ?? Promise.resolve(false));
      if (!confirmed) return;
      writeMessages(initialMessages());
      menu?.classList.remove('is-open');
      more?.setAttribute('aria-expanded', 'false');
      renderMessages();
      showToast('대화를 초기 상태로 되돌렸습니다.');
    });
    if (popoverDocumentHandler) document.removeEventListener('click', popoverDocumentHandler);
    popoverDocumentHandler = (event) => {
      if (menu?.classList.contains('is-open') && !menu.contains(event.target) && !more?.contains(event.target)) {
        menu.classList.remove('is-open');
        more?.setAttribute('aria-expanded', 'false');
      }
      const historyButton = document.getElementById('nhAiHistory');
      if (historyPanel && !historyPanel.hidden && !historyPanel.contains(event.target) && !historyButton?.contains(event.target)) historyPanel.hidden = true;
    };
    document.addEventListener('click', popoverDocumentHandler);

    document.getElementById('nhChatForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const chatInput = document.getElementById('nhChatInput');
      const text = String(chatInput?.value || '').trim();
      if (!text || dashboard.busy) return;
      chatInput.value = '';
      await sendChatMessage(text);
    });
    const attach = document.getElementById('nhAttachButton');
    const fileInput = document.getElementById('nhFileInput');
    attach?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file || dashboard.busy) return;
      try {
        const attachment = await prepareAttachment(file);
        await sendChatMessage(`${attachment.name} 파일의 실제 내용을 현재 프로젝트 기록과 함께 이해해서, 필요한 다음 행동을 정리해줘.`, {
          displayText: `${attachment.name} 파일을 첨부했어요.`,
          attachment
        });
      } catch (error) {
        showToast(error?.message || '파일을 읽지 못했습니다.');
      } finally {
        fileInput.value = '';
      }
    });
    document.getElementById('nhProjectSelect')?.addEventListener('change', (event) => {
      const next = dashboard.projects.find((project) => String(project.id) === String(event.target.value));
      if (!next || next.id === dashboard.activeProject?.id) return;
      persistSelectedProject(next.id);
      hydrateDashboard(next.id);
      renderShell();
    });
  }

  function fallbackAiReply(prompt) {
    const lowered = String(prompt || '').toLowerCase();
    const tasks = projectTasks();
    const activityCount = (window.WETHUS?.listSemanticEvents?.({ projectId: dashboard.activeProject?.id, limit: 20 }) || []).length;
    if (/누가|팀원|사람|연결|역할/.test(lowered)) {
      return {
        text: '현재 단계에서는 현장 운영과 인터뷰를 동시에 맡아본 실행형 팀원이 가장 필요해요. 박지훈님이 프로젝트 문맥과 가장 잘 맞습니다.',
        evidence: '팀 구성과 프로젝트 흐름을 함께 살펴봤어요.',
        personId: 'network-person-field'
      };
    }
    if (/우선|다음|이번 주|해야/.test(lowered)) {
      return {
        text: '최근 작업과 프로젝트 상태를 기준으로 다음 3가지를 먼저 끝내는 편이 좋습니다.',
        items: tasks.slice(0, 3),
        actions: tasks.slice(0, 3)
      };
    }
    if (/인사이트|요약|활동|진척/.test(lowered)) {
      return {
        text: dashboard.hub?.mentorSummary || '문제와 검증 대상은 선명합니다. 실행 담당과 측정 기준을 확정하면 다음 단계로 넘어갈 수 있어요.',
        evidence: `프로젝트 기록 ${activityCount + tasks.length}건의 흐름을 함께 읽었어요.`,
        actions: tasks.slice(0, 2)
      };
    }
    return {
      text: '현재 프로젝트 기록을 보면 실행 범위를 더 넓히기보다 이번 주 작업을 완료하고 인터뷰 근거를 쌓는 것이 우선이에요.',
      items: tasks.slice(0, 3),
      actions: tasks.slice(0, 3)
    };
  }

  function buildAgentMemoryContext() {
    const state = window.WETHUS?.getState?.() || {};
    const projects = dashboard.projects.filter((project) => project?.id).slice(0, 30);
    const projectIds = new Set(projects.map((project) => String(project.id)));
    const projectHubs = {};
    for (const projectId of projectIds) {
      projectHubs[projectId] = window.WETHUS?.getProjectHub?.(projectId) || state.projectHubs?.[projectId] || {};
    }
    const connections = window.WETHUS?.listConnections?.({ actorId: dashboard.actorId }) || [];
    const relatedUserIds = new Set([
      dashboard.actorId,
      ...connections.map((item) => String(item?.targetUserId || '')).filter(Boolean),
      ...projects.flatMap((project) => (Array.isArray(project?.teamMembers) ? project.teamMembers : []).map((member) => String(member?.id || ''))).filter(Boolean)
    ]);
    const users = (Array.isArray(state.users) ? state.users : [])
      .filter((user) => relatedUserIds.has(String(user?.id || '')))
      .map((user) => ({
        id: user.id,
        name: user.name,
        nickname: user.nickname,
        headline: user.headline,
        bio: user.bio,
        school: user.school,
        major: user.major,
        interestTags: user.interestTags,
        skills: user.skills,
        portfolioSummary: user.portfolioSummary || user.portfolioHighlights
      }));
    return {
      actor: {
        id: dashboard.actorId,
        name: dashboard.user?.name,
        nickname: dashboard.user?.nickname,
        headline: dashboard.user?.headline,
        bio: dashboard.user?.bio,
        school: dashboard.user?.school,
        major: dashboard.user?.major,
        interestTags: dashboard.user?.interestTags,
        skills: dashboard.user?.skills,
        portfolioSummary: dashboard.user?.portfolioSummary || dashboard.user?.portfolioHighlights
      },
      users,
      projects,
      focusProject: dashboard.activeProject,
      projectHubs,
      connections,
      events: window.WETHUS?.listSemanticEvents?.({ actorId: dashboard.actorId, limit: 300 }) || []
    };
  }

  function buildCurrentStatusSnapshot(project, hub) {
    const recentActivity = (Array.isArray(hub?.recentActivities) ? hub.recentActivities : [])
      .find((item) => String(item?.text || item?.summary || '').trim());
    const nextTodo = (Array.isArray(hub?.weeklyTodos) ? hub.weeklyTodos : [])
      .find((item) => typeof item === 'string' || !['done', 'completed'].includes(String(item?.status || '').toLowerCase()));
    const blockers = Array.isArray(hub?.blockers) ? hub.blockers : [];
    const stableDay = `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;
    return {
      project_id: project?.id,
      current_stage: project?.status || project?.phase || '진행 중',
      recent_activity_summary: String(recentActivity?.text || recentActivity?.summary || '').trim(),
      recent_activity_at: recentActivity?.createdAt || recentActivity?.occurredAt || '',
      blocker_summary: String(hub?.blocker || blockers[0]?.text || blockers[0]?.summary || blockers[0] || '').trim(),
      suggested_next_action: String(typeof nextTodo === 'string' ? nextTodo : nextTodo?.title || '').trim(),
      activity_health: recentActivity ? 'active' : 'idle',
      updated_at: recentActivity?.createdAt || recentActivity?.occurredAt || project?._updatedAt || project?.updatedAt || stableDay
    };
  }

  async function requestProjectMentor(prompt, attachment) {
    if (!dashboard.activeProject?.id || (previewMode && !isLocal)) {
      await new Promise((resolve) => setTimeout(resolve, 620));
      return fallbackAiReply(prompt);
    }
    const localBases = [`${location.protocol}//${location.hostname}:8787`, 'http://127.0.0.1:8787', 'http://localhost:8787'];
    const remoteBase = String(window.WETHUS_API_BASE || 'https://wethus-api.onrender.com').replace(/\/$/, '');
    const bases = Array.from(new Set((isLocal ? [...localBases, remoteBase] : [remoteBase]).filter(Boolean)));
    const activeHub = window.WETHUS?.getProjectHub?.(dashboard.activeProject.id) || dashboard.hub || {};
    const payload = {
      project: dashboard.activeProject,
      hub: activeHub,
      events: window.WETHUS?.listSemanticEvents?.({ projectId: dashboard.activeProject.id, limit: 30 }) || [],
      insights: [],
      statusSnapshot: buildCurrentStatusSnapshot(dashboard.activeProject, activeHub),
      trigger: 'network-home-chat',
      userPrompt: prompt,
      attachment: attachment || null,
      actorId: dashboard.actorId,
      sessionId: chatStorageKey(),
      memoryContext: buildAgentMemoryContext()
    };
    let lastError;
    for (const base of bases) {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), isLocal ? 70000 : 10000);
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (dashboard.actorId && (isLocal || window.WETHUS_SEND_EXPLICIT_ACTOR === true)) headers['x-user-id'] = dashboard.actorId;
        const response = await fetch(`${base}/ai/project-mentor`, {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data?.ok === false) throw new Error(data?.error || `AI 요청 실패 (${response.status})`);
        return {
          text: String(data.summary || data.priority || '').trim() || '프로젝트 기록을 확인했습니다.',
          items: Array.isArray(data.nextActions) ? data.nextActions.slice(0, 3) : [],
          actions: Array.isArray(data.nextActions) ? data.nextActions.slice(0, 3) : [],
          evidence: Number(data?.understanding?.evidenceCount || 0) > 0
            ? `프로젝트 기록 ${Number(data.understanding.evidenceCount)}건의 맥락과 관계를 함께 읽었어요.`
            : '현재 프로젝트 상황을 먼저 해석해 답했어요.',
          raw: data
        };
      } catch (error) {
        lastError = error;
      } finally {
        window.clearTimeout(timeout);
      }
    }
    const fallback = fallbackAiReply(prompt);
    fallback.evidence = fallback.evidence || '현재 프로젝트 상황을 바탕으로 답했어요.';
    fallback.fallbackReason = lastError?.message || '';
    return fallback;
  }

  async function sendChatMessage(prompt, options = {}) {
    dashboard.busy = true;
    const sendButton = document.getElementById('nhSendButton');
    const attachButton = document.getElementById('nhAttachButton');
    if (sendButton) sendButton.disabled = true;
    if (attachButton) attachButton.disabled = true;
    const messages = readMessages();
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: options.displayText || prompt,
      attachment: options.attachment || null,
      createdAt: new Date().toISOString()
    };
    messages.push(userMessage);
    writeMessages(messages);
    renderMessages({ typing: true });

    if (dashboard.activeProject?.id) {
      const currentHub = window.WETHUS?.getProjectHub?.(dashboard.activeProject.id) || dashboard.hub || {};
      const teamChat = [
        ...(Array.isArray(currentHub.teamChat) ? currentHub.teamChat : []),
        { id: userMessage.id, from: userLabel(dashboard.user), kind: 'human', channel: 'ai_mentor', text: prompt, createdAt: userMessage.createdAt }
      ].slice(-120);
      dashboard.hub = window.WETHUS?.upsertProjectHub?.(dashboard.activeProject.id, { teamChat }) || currentHub;
    }

    try {
      const response = await requestProjectMentor(prompt, options.attachment);
      const assistantMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        text: response.text,
        items: response.items || [],
        actions: response.actions || [],
        evidence: response.evidence || '',
        personId: response.personId || '',
        createdAt: new Date().toISOString()
      };
      const nextMessages = readMessages();
      nextMessages.push(assistantMessage);
      writeMessages(nextMessages);

      if (dashboard.activeProject?.id) {
        const currentHub = window.WETHUS?.getProjectHub?.(dashboard.activeProject.id) || dashboard.hub || {};
        const raw = response.raw || {};
        const teamChat = [
          ...(Array.isArray(currentHub.teamChat) ? currentHub.teamChat : []),
          { id: assistantMessage.id, from: 'WETHUS AI', kind: 'ai', channel: 'ai_mentor', text: [assistantMessage.text, ...(assistantMessage.items || [])].join('\n'), createdAt: assistantMessage.createdAt }
        ].slice(-120);
        dashboard.hub = window.WETHUS?.upsertProjectHub?.(dashboard.activeProject.id, {
          teamChat,
          mentorSummary: assistantMessage.text,
          mentorPriority: String(raw.priority || currentHub.mentorPriority || ''),
          mentorNextActions: assistantMessage.actions,
          mentorGrounding: Array.isArray(raw.grounding) ? raw.grounding.slice(0, 4) : currentHub.mentorGrounding
        }) || currentHub;
        window.WETHUS?.recordSemanticEvent?.({
          action: 'ai_mentor_message_created',
          targetType: 'project',
          targetId: dashboard.activeProject.id,
          projectId: dashboard.activeProject.id,
          visibility: 'team',
          metadata: { source: 'network-home', prompt: prompt.slice(0, 160) }
        });
      }
    } catch (error) {
      const nextMessages = readMessages();
      nextMessages.push({
        id: `ai-error-${Date.now()}`,
        role: 'ai',
        text: '응답을 완성하지 못했어요. 잠시 후 다시 시도하거나 프로젝트 허브에서 AI 멘토 상태를 확인해주세요.',
        createdAt: new Date().toISOString()
      });
      writeMessages(nextMessages);
      showToast(error?.message || 'AI 응답을 가져오지 못했습니다.');
    } finally {
      dashboard.busy = false;
      if (sendButton) sendButton.disabled = false;
      if (attachButton) attachButton.disabled = false;
      renderMessages();
    }
  }

  function hydrateDashboard(preferredProjectId = '') {
    dashboard.actorId = actorId();
    dashboard.user = window.WETHUS?.currentUser?.() || null;
    dashboard.projects = collectProjects();
    const wanted = preferredProjectId || selectedProjectId();
    dashboard.activeProject = dashboard.projects.find((project) => String(project.id) === String(wanted)) || dashboard.projects[0] || null;
    if (dashboard.activeProject?.id) persistSelectedProject(dashboard.activeProject.id);
    dashboard.hub = dashboard.activeProject?.id ? (window.WETHUS?.getProjectHub?.(dashboard.activeProject.id) || {}) : {};
    dashboard.people = collectPeople();
    if (!dashboard.selectedDate) dashboard.selectedDate = localDateKey(new Date());
    const selected = new Date(`${dashboard.selectedDate}T12:00:00`);
    if (!Number.isNaN(selected.getTime())) {
      dashboard.calendarDate = new Date(selected.getFullYear(), selected.getMonth(), 1);
      dashboard.selectedDay = selected.getDate();
    }
    dashboard.slides = createSlides();
    dashboard.slideIndex = 0;
  }

  async function init() {
    if (!window.WETHUS) return;
    ensurePreviewData();
    await restoreSessionIfNeeded();
    if (!actorId()) return;
    if (previewMode) ensurePreviewData();
    await Promise.allSettled([
      window.WETHUS.refreshNetworkPeople?.(),
      window.WETHUS.refreshNetworkConnections?.()
    ]);
    window.WETHUS.refreshGlobalNav?.();
    hydrateDashboard();
    renderShell();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      init().catch((error) => console.error('[network-home] initialization failed', error));
    }, { once: true });
  } else {
    init().catch((error) => console.error('[network-home] initialization failed', error));
  }
})();
