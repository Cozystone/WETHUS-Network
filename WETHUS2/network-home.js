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
    busy: false
  };
  let existingNavHeightObserver = null;
  let existingNavResizeHandler = null;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));

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
    if (rawHub.networkHomeSeedVersion !== 1) {
      window.WETHUS.upsertProjectHub?.(project.id, {
        networkHomeSeedVersion: 1,
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
    }
  }

  function collectProjects() {
    const own = window.WETHUS?.myProjects?.() || [];
    const participating = window.WETHUS?.myParticipatingProjects?.() || [];
    const approved = window.WETHUS?.listProjects?.() || [];
    const relevant = uniqueProjects([...own, ...participating]);
    return relevant.length ? relevant : uniqueProjects(approved.slice(0, 4));
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
    const state = window.WETHUS?.getState?.() || {};
    const actual = (state.users || [])
      .filter((item) => item?.id && String(item.id) !== dashboard.actorId && !item.isAgent && item.role !== 'agent')
      .map((item, index) => ({
        id: String(item.id),
        name: userLabel(item),
        role: (Array.isArray(item.interestTags) && item.interestTags[0]) || demoPeople[index % demoPeople.length].role,
        school: [item.school, item.careerSummary].filter(Boolean).join(' · ') || demoPeople[index % demoPeople.length].school,
        summary: item.headline || item.bio || demoPeople[index % demoPeople.length].summary,
        profileImage: safeImageUrl(item.profileImage, demoPeople[index % demoPeople.length].profileImage),
        realUser: true
      }));

    const map = new Map();
    [...actual, ...demoPeople].forEach((person) => {
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
      href: `project-hub.html?projectId=${encodeURIComponent(project.id)}`,
      cta: '프로젝트 열기'
    }));

    if (!projectSlides.length) {
      projectSlides.push({
        id: 'start-project',
        title: '첫 프로젝트를 시작해보세요',
        summary: '아이디어를 등록하면 팀과 실행 기록, AI 멘토를 한곳에서 관리할 수 있어요.',
        stage: 'Start',
        stageDetail: '새 실행 만들기',
        image: generatedHero,
        href: 'founder.html',
        cta: '프로젝트 시작하기'
      });
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
        stageDetail: nextIndex === 1 ? '최근 기록 반영' : '새 연결 4명'
      });
    }
    return projectSlides.slice(0, 3);
  }

  function taskStorageKey() {
    return `wethus.networkHome.taskStatus.${dashboard.actorId}.${dashboard.activeProject?.id || 'general'}`;
  }

  function readTaskStatus() {
    try {
      const parsed = JSON.parse(localStorage.getItem(taskStorageKey()) || '{}');
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (_) {}
    const seeded = previewMode ? { 2: true } : {};
    try { localStorage.setItem(taskStorageKey(), JSON.stringify(seeded)); } catch (_) {}
    return seeded;
  }

  function writeTaskStatus(status) {
    try { localStorage.setItem(taskStorageKey(), JSON.stringify(status || {})); } catch (_) {}
  }

  function chatStorageKey() {
    return `wethus.networkHome.chat.v1.${dashboard.actorId}.${dashboard.activeProject?.id || 'general'}`;
  }

  function initialMessages() {
    const projectTitle = dashboard.activeProject?.title || '현재 프로젝트';
    const tasks = projectTasks();
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
        evidence: '유사 프로젝트 4건 · 인터뷰 15회 · 현장 운영 경험',
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
      if (Array.isArray(parsed) && parsed.length) return parsed.slice(-40);
    } catch (_) {}
    const seeded = initialMessages();
    writeMessages(seeded);
    return seeded;
  }

  function writeMessages(messages) {
    try { localStorage.setItem(chatStorageKey(), JSON.stringify((messages || []).slice(-40))); } catch (_) {}
  }

  function projectTasks() {
    const rows = Array.isArray(dashboard.hub?.weeklyTodos) ? dashboard.hub.weeklyTodos : [];
    const defaults = ['현장 운영 재개 계획', '사용자 인터뷰 5명 확정', '챌린지 지원 여부 결정'];
    return [...rows.map((item) => typeof item === 'string' ? item : item?.text).filter(Boolean), ...defaults]
      .filter((item, index, all) => all.indexOf(item) === index)
      .slice(0, 3);
  }

  function scheduleRows() {
    const tasks = projectTasks();
    return [
      { time: '10:00', title: '팀 스탠드업', place: 'WETHUS Room', icon: 'ph-calendar-dots' },
      { time: '13:00', title: tasks[1] || '사용자 인터뷰', place: '온라인 Zoom', icon: 'ph-chats-circle' },
      { time: '15:30', title: tasks[0] || '프로젝트 워크', place: '집중 세션', icon: 'ph-star' },
      { time: '18:00', title: '청년 창업가 정모', place: '강남 커뮤니티 라운지', icon: 'ph-sparkle' }
    ];
  }

  function dueDate(offset) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} (${weekdays[date.getDay()]})`;
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
          <h2>오늘 일정</h2>
          <button class="nh-link-button" id="nhScheduleAll" type="button">전체 보기 <i class="ph ph-caret-right" aria-hidden="true"></i></button>
        </div>
        <ul class="nh-schedule-list">
          ${rows.map((row) => `
            <li class="nh-schedule-item">
              <span class="nh-schedule-icon"><i class="ph ${row.icon}" aria-hidden="true"></i></span>
              <span class="nh-schedule-time">${escapeHtml(row.time)}</span>
              <span class="nh-schedule-copy"><strong>${escapeHtml(row.title)}</strong><span>${escapeHtml(row.place)}</span></span>
              <span class="nh-schedule-dot" aria-hidden="true"></span>
            </li>
          `).join('')}
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
    return new Set((window.WETHUS?.listConnections?.({ actorId: dashboard.actorId }) || []).map((row) => String(row.targetUserId || '')));
  }

  function buildPeople() {
    const connected = connectionIds();
    return `
      <section class="nh-panel nh-people-panel" aria-labelledby="nhPeopleTitle">
        <div class="nh-section-heading">
          <h2 id="nhPeopleTitle">추천 연결</h2>
          <a class="nh-link-button" href="profile.html">더 보기 <i class="ph ph-caret-right" aria-hidden="true"></i></a>
        </div>
        <div class="nh-people-grid">
          ${dashboard.people.map((person) => {
            const isConnected = connected.has(String(person.id));
            return `
              <article class="nh-person-card" data-person-id="${escapeHtml(person.id)}">
                <div class="nh-person-head">
                  <span class="nh-person-avatar"><img src="${escapeHtml(safeImageUrl(person.profileImage))}" alt="${escapeHtml(person.name)}" /></span>
                  <div>
                    <div class="nh-person-name-row"><strong class="nh-person-name">${escapeHtml(person.name)}</strong><span class="nh-person-role">${escapeHtml(person.role)}</span></div>
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
        </div>
      </section>
    `;
  }

  function buildTaskRows() {
    const tasks = projectTasks();
    const status = readTaskStatus();
    const icons = ['ph-file-pdf', 'ph-chart-bar', 'ph-check'];
    const people = dashboard.people.length ? dashboard.people : demoPeople;
    return tasks.map((title, index) => {
      const complete = !!status[index];
      const first = people[index % people.length];
      const second = people[(index + 2) % people.length];
      return `
        <div class="nh-task-row${complete ? ' is-complete' : ''}" data-task-index="${index}">
          <button class="nh-task-check" type="button" data-task-check="${index}" aria-label="${escapeHtml(title)} ${complete ? '완료 취소' : '완료 처리'}" aria-pressed="${complete}"><i class="ph ph-check" aria-hidden="true"></i></button>
          <span class="nh-task-icon"><i class="ph ${icons[index] || 'ph-check'}" aria-hidden="true"></i></span>
          <span class="nh-task-main"><strong class="nh-task-title">${escapeHtml(title)}</strong><span class="nh-task-status">${complete ? '완료' : '진행 중'}</span></span>
          <span class="nh-task-due">마감&nbsp; ${escapeHtml(dueDate(7 + index))}</span>
          <span class="nh-task-avatars" aria-label="담당자">
            <span class="nh-task-avatar"><img src="${escapeHtml(safeImageUrl(first.profileImage))}" alt="${escapeHtml(first.name)}" /></span>
            <span class="nh-task-avatar"><img src="${escapeHtml(safeImageUrl(second.profileImage))}" alt="${escapeHtml(second.name)}" /></span>
            ${index !== 1 ? `<span class="nh-task-avatar-more">+${index + 2}</span>` : ''}
          </span>
          <button class="nh-task-menu" type="button" data-task-open="${index}" aria-label="${escapeHtml(title)} 프로젝트 허브에서 열기"><i class="ph ph-dots-three-vertical" aria-hidden="true"></i></button>
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
                ${person ? `<button class="nh-secondary-button nh-apply-button" type="button" data-focus-person="${escapeHtml(person.id)}">${escapeHtml(person.name)} 보기</button><button class="nh-apply-button" type="button" data-connect-id="${escapeHtml(person.id)}">연결 제안</button>` : ''}
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
            <p class="nh-ai-status"><span class="nh-ai-status-dot" aria-hidden="true"></span>프로젝트 · 네트워크 문맥 연결됨</p>
          </div>
          <div class="nh-ai-header-actions">
            <button class="nh-icon-button" id="nhAiHistory" type="button" aria-label="대화 기록"><i class="ph ph-clock-counter-clockwise" aria-hidden="true"></i></button>
            <button class="nh-icon-button" id="nhAiMore" type="button" aria-label="AI 메뉴" aria-expanded="false"><i class="ph ph-dots-three-vertical" aria-hidden="true"></i></button>
          </div>
        </header>
        <div class="nh-ai-menu" id="nhAiMenu">
          <a href="${dashboard.activeProject?.id ? `project-hub.html?projectId=${encodeURIComponent(dashboard.activeProject.id)}` : 'project-hub.html'}"><i class="ph ph-layout" aria-hidden="true"></i>AI 멘토 허브 열기</a>
          <button id="nhAiReset" type="button"><i class="ph ph-arrow-counter-clockwise" aria-hidden="true"></i>대화 초기화</button>
        </div>
        <div class="nh-ai-messages" id="nhAiMessages" aria-live="polite"></div>
        <div class="nh-ai-composer">
          <div class="nh-suggestions" aria-label="빠른 질문">
            <button class="nh-chip-button" type="button" data-suggestion="이번 주 우선순위를 다시 정리해줘">우선순위 재정리</button>
            <button class="nh-chip-button" type="button" data-suggestion="지금 우리 팀에 필요한 사람을 추천해줘">팀원 추천</button>
            <button class="nh-chip-button" type="button" data-suggestion="최근 활동을 읽고 인사이트를 요약해줘">인사이트 요약</button>
          </div>
          <form class="nh-chat-form" id="nhChatForm">
            <input class="nh-chat-input" id="nhChatInput" maxlength="800" autocomplete="off" placeholder="WETHUS AI에게 물어보세요..." aria-label="WETHUS AI 메시지" />
            <button class="nh-attach-button" id="nhAttachButton" type="button" aria-label="파일 첨부"><i class="ph ph-paperclip" aria-hidden="true"></i></button>
            <button class="nh-send-button" id="nhSendButton" type="submit" aria-label="보내기"><i class="ph ph-paper-plane-tilt" aria-hidden="true"></i></button>
            <input id="nhFileInput" type="file" hidden />
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
    const today = new Date();
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
      const currentMonth = targetMonth === month;
      const selected = currentMonth && day === dashboard.selectedDay;
      const hasEvent = currentMonth && (day === today.getDate() || day === Math.min(lastDate, today.getDate() + 17));
      cells.push(`<button class="nh-calendar-day${outside ? ' is-outside' : ''}${selected ? ' is-selected' : ''}${hasEvent ? ' has-event' : ''}" type="button" data-calendar-day="${day}" data-calendar-offset="${targetMonth - month}" aria-label="${year}년 ${targetMonth + 1}월 ${day}일" aria-pressed="${selected}">${day}</button>`);
    }
    container.innerHTML = cells.join('');
    container.querySelectorAll('[data-calendar-day]').forEach((button) => {
      button.addEventListener('click', () => {
        const offset = Number(button.dataset.calendarOffset || 0);
        if (offset) {
          dashboard.calendarDate = new Date(year, month + offset, 1);
        }
        dashboard.selectedDay = Number(button.dataset.calendarDay || 1);
        renderCalendar();
      });
    });
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
    const currentHub = window.WETHUS?.getProjectHub?.(dashboard.activeProject.id) || dashboard.hub || {};
    const current = Array.isArray(currentHub.weeklyTodos) ? currentHub.weeklyTodos.map((item) => typeof item === 'string' ? item : item?.text).filter(Boolean) : [];
    const next = [...current, ...target.actions].filter((item, index, all) => all.indexOf(item) === index).slice(0, 12);
    dashboard.hub = window.WETHUS?.upsertProjectHub?.(dashboard.activeProject.id, { weeklyTodos: next }) || { ...currentHub, weeklyTodos: next };
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
        const index = Number(button.dataset.taskCheck || 0);
        const statuses = readTaskStatus();
        statuses[index] = !statuses[index];
        writeTaskStatus(statuses);
        const title = projectTasks()[index];
        if (statuses[index] && dashboard.activeProject?.id) {
          const currentHub = window.WETHUS?.getProjectHub?.(dashboard.activeProject.id) || dashboard.hub || {};
          const progress = [
            { id: `network-home-${Date.now()}`, text: `${title} 완료`, createdAt: new Date().toISOString() },
            ...(Array.isArray(currentHub.progress) ? currentHub.progress : [])
          ].slice(0, 60);
          dashboard.hub = window.WETHUS?.upsertProjectHub?.(dashboard.activeProject.id, { progress }) || currentHub;
          window.WETHUS?.recordSemanticEvent?.({
            action: 'task_completed',
            targetType: 'project',
            targetId: dashboard.activeProject.id,
            projectId: dashboard.activeProject.id,
            visibility: 'team',
            metadata: { title, source: 'network-home' }
          });
        }
        renderTasks();
        showToast(statuses[index] ? '작업을 완료 처리했습니다.' : '작업을 다시 진행 중으로 바꿨습니다.');
      });
    });
    document.querySelectorAll('[data-task-open]').forEach((button) => {
      button.addEventListener('click', () => {
        const href = dashboard.activeProject?.id
          ? `project-hub.html?projectId=${encodeURIComponent(dashboard.activeProject.id)}`
          : 'project-hub.html';
        location.href = href;
      });
    });
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
      renderCalendar();
    });
    document.getElementById('nhCalendarNext')?.addEventListener('click', () => {
      dashboard.calendarDate = new Date(dashboard.calendarDate.getFullYear(), dashboard.calendarDate.getMonth() + 1, 1);
      dashboard.selectedDay = 1;
      renderCalendar();
    });
    document.getElementById('nhScheduleAll')?.addEventListener('click', () => {
      location.href = dashboard.activeProject?.id
        ? `project-hub.html?projectId=${encodeURIComponent(dashboard.activeProject.id)}`
        : 'project-hub.html';
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
      const currentHub = window.WETHUS?.getProjectHub?.(dashboard.activeProject.id) || dashboard.hub || {};
      const todos = Array.isArray(currentHub.weeklyTodos) ? [...currentHub.weeklyTodos] : [];
      todos.push(title);
      dashboard.hub = window.WETHUS?.upsertProjectHub?.(dashboard.activeProject.id, { weeklyTodos: todos.slice(0, 12) }) || { ...currentHub, weeklyTodos: todos };
      window.WETHUS?.recordSemanticEvent?.({
        action: 'task_created',
        targetType: 'project',
        targetId: dashboard.activeProject.id,
        projectId: dashboard.activeProject.id,
        visibility: 'team',
        metadata: { title, source: 'network-home' }
      });
      if (input) input.value = '';
      adder.classList.remove('is-open');
      addButton.hidden = false;
      renderTasks();
      showToast('새 작업을 프로젝트에 추가했습니다.');
    });

    const more = document.getElementById('nhAiMore');
    const menu = document.getElementById('nhAiMenu');
    more?.addEventListener('click', () => {
      const open = menu?.classList.toggle('is-open');
      more.setAttribute('aria-expanded', String(!!open));
    });
    document.getElementById('nhAiHistory')?.addEventListener('click', () => {
      const messages = readMessages();
      document.getElementById('nhAiMessages')?.scrollTo({ top: 0, behavior: 'smooth' });
      showToast(`최근 대화 ${messages.length}건을 보관 중입니다.`);
    });
    document.getElementById('nhAiReset')?.addEventListener('click', () => {
      writeMessages(initialMessages());
      menu?.classList.remove('is-open');
      more?.setAttribute('aria-expanded', 'false');
      renderMessages();
      showToast('대화를 초기 상태로 되돌렸습니다.');
    });
    document.addEventListener('click', (event) => {
      if (!menu?.classList.contains('is-open')) return;
      if (menu.contains(event.target) || more?.contains(event.target)) return;
      menu.classList.remove('is-open');
      more?.setAttribute('aria-expanded', 'false');
    }, { once: true });

    document.querySelectorAll('[data-suggestion]').forEach((button) => {
      button.addEventListener('click', () => {
        const chatInput = document.getElementById('nhChatInput');
        if (!chatInput) return;
        chatInput.value = button.dataset.suggestion || '';
        chatInput.focus();
      });
    });
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
      await sendChatMessage(`${file.name} 파일을 참고해서 현재 프로젝트에 필요한 다음 행동을 정리해줘.`, {
        displayText: `${file.name} 파일을 첨부했어요.`,
        attachment: { name: file.name, type: file.type, size: file.size }
      });
      fileInput.value = '';
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
        evidence: `현재 작업 ${tasks.length}건 · 최근 활동 ${activityCount}건 기준`,
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
        evidence: `프로젝트 로그 ${activityCount}건과 작업 ${tasks.length}건을 함께 읽었습니다.`,
        actions: tasks.slice(0, 2)
      };
    }
    return {
      text: '현재 프로젝트 기록을 보면 실행 범위를 더 넓히기보다 이번 주 작업을 완료하고 인터뷰 근거를 쌓는 것이 우선이에요.',
      items: tasks.slice(0, 3),
      actions: tasks.slice(0, 3)
    };
  }

  async function requestProjectMentor(prompt, attachment) {
    if (previewMode || !dashboard.activeProject?.id) {
      await new Promise((resolve) => setTimeout(resolve, 620));
      return fallbackAiReply(prompt);
    }
    const localBases = [`${location.protocol}//${location.hostname}:8787`, 'http://127.0.0.1:8787', 'http://localhost:8787'];
    const remoteBase = String(window.WETHUS_API_BASE || 'https://wethus-api.onrender.com').replace(/\/$/, '');
    const bases = Array.from(new Set((isLocal ? [...localBases, remoteBase] : [remoteBase]).filter(Boolean)));
    const payload = {
      project: dashboard.activeProject,
      hub: window.WETHUS?.getProjectHub?.(dashboard.activeProject.id) || dashboard.hub || {},
      events: window.WETHUS?.listSemanticEvents?.({ projectId: dashboard.activeProject.id, limit: 30 }) || [],
      insights: [],
      statusSnapshot: {},
      trigger: 'network-home-chat',
      userPrompt: prompt,
      attachment: attachment || null
    };
    let lastError;
    for (const base of bases) {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), isLocal ? 8000 : 6000);
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (window.WETHUS_SEND_EXPLICIT_ACTOR === true && dashboard.actorId) headers['x-user-id'] = dashboard.actorId;
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
          evidence: Array.isArray(data.grounding) ? data.grounding.slice(0, 2).join(' · ') : '',
          raw: data
        };
      } catch (error) {
        lastError = error;
      } finally {
        window.clearTimeout(timeout);
      }
    }
    const fallback = fallbackAiReply(prompt);
    fallback.evidence = fallback.evidence || '현재 저장된 프로젝트 기록 기준';
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
        { id: userMessage.id, from: userLabel(dashboard.user), kind: 'human', text: prompt, createdAt: userMessage.createdAt }
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
          { id: assistantMessage.id, from: 'WETHUS AI', kind: 'ai', text: [assistantMessage.text, ...(assistantMessage.items || [])].join('\n'), createdAt: assistantMessage.createdAt }
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
    dashboard.slides = createSlides();
    dashboard.slideIndex = 0;
  }

  async function init() {
    if (!window.WETHUS) return;
    ensurePreviewData();
    await restoreSessionIfNeeded();
    if (!actorId()) return;
    if (previewMode) ensurePreviewData();
    window.WETHUS.refreshGlobalNav?.();
    hydrateDashboard();
    renderShell();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { init().catch(() => {}); }, { once: true });
  } else {
    init().catch(() => {});
  }
})();
