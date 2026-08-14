const NAV_ITEMS = [
  { id: 'for-you', label: 'For You', icon: 'sparkles', mobile: true },
  { id: 'people', label: 'People', icon: 'users', mobile: true },
  { id: 'projects', label: 'Projects', icon: 'blocks', mobile: true },
  { id: 'opportunities', label: 'Opportunities', icon: 'telescope' },
  { id: 'network', label: 'Network', icon: 'waypoints', mobile: true, signal: true },
  { id: 'my-wethus', label: 'My WETHUS', icon: 'circle-user-round', mobile: true }
];

const AVATARS = {
  seoyeon: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=180&q=80',
  minjun: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=180&q=80',
  yujin: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=180&q=80',
  dohyeon: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=180&q=80',
  jiwoo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=180&q=80'
};

const PEOPLE = [
  {
    id: 'seoyeon', name: '박서연', handle: '@seoyeon.builds', role: 'UX Researcher · Busan',
    bio: '청소년 금융 습관을 연구하고 인터뷰를 제품 언어로 바꾸는 리서처입니다.',
    skills: ['User Research', 'Figma', 'Interview'],
    reason: 'FocusFlow에 필요한 사용자 인터뷰 경험이 있고, 이번 주 2시간을 도울 수 있습니다.',
    image: AVATARS.seoyeon, filter: '리서치'
  },
  {
    id: 'minjun', name: '이민준', handle: '@minjun.codes', role: 'Frontend Builder · Daejeon',
    bio: '작게 출시하고 실제 사용 로그를 보며 빠르게 고치는 프론트엔드 개발자입니다.',
    skills: ['React', 'TypeScript', 'Analytics'],
    reason: '빠른 프로토타입 경험이 강하고 현재 프로젝트 단계와 가용 시간이 잘 맞습니다.',
    image: AVATARS.minjun, filter: '개발'
  },
  {
    id: 'yujin', name: '최유진', handle: '@yujin.makes', role: 'Product Designer · Incheon',
    bio: '교육 제품의 복잡한 흐름을 단순하게 만들고, 팀이 직접 검증할 화면을 설계합니다.',
    skills: ['Product Design', 'Prototype', 'Brand'],
    reason: '같은 교육 문제를 보지만 역할은 보완적입니다. 최근 두 프로젝트를 완주했습니다.',
    image: AVATARS.yujin, filter: '디자인'
  },
  {
    id: 'dohyeon', name: '정도현', handle: '@dohyeon.ops', role: 'Community Operator · Seoul',
    bio: '학교 밖 청소년 프로그램을 운영하며 파트너와 참가자를 연결하고 있습니다.',
    skills: ['Operations', 'Partnership', 'Community'],
    reason: 'FocusFlow의 학교 파일럿을 연결할 수 있고, 운영 방식이 현재 팀과 상호보완적입니다.',
    image: AVATARS.dohyeon, filter: '운영'
  },
  {
    id: 'jiwoo', name: '한지우', handle: '@jiwoo.science', role: 'Student Researcher · Suwon',
    bio: '환경 센서 데이터로 학교 안의 에너지 낭비를 찾는 프로젝트를 만들고 있습니다.',
    skills: ['Python', 'Data', 'Hardware'],
    reason: '데이터 수집 경험을 제공할 수 있고, 반대로 제품 인터뷰 도움을 찾고 있습니다.',
    image: AVATARS.jiwoo, filter: '연구'
  },
  {
    id: 'junho', name: '김준호', handle: '@junho.film', role: 'Creator · Jeju',
    bio: '지역의 작은 브랜드와 사람을 기록하는 짧은 다큐멘터리를 제작합니다.',
    skills: ['Film', 'Editing', 'Storytelling'],
    reason: '프로젝트 데모 스토리를 선명하게 만들 수 있고 다음 달 서울 협업이 가능합니다.',
    image: '', filter: '콘텐츠'
  }
];

const PROJECTS = [
  {
    id: 'focusflow', category: 'EDTECH · PRODUCTIVITY', title: 'FocusFlow', status: '이번 주 4개 활동',
    summary: '10대가 스스로 집중 루틴을 설계하고 회고할 수 있는 가벼운 학습 도구.',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1000&q=82',
    people: ['minjun', 'yujin'], members: 4, momentum: 72, need: 'UX Researcher',
    filters: ['내 관심사', '팀원 모집 중', '최근 활동']
  },
  {
    id: 'greengrid', category: 'CLIMATE · HARDWARE', title: 'GreenGrid Lab', status: '오늘 새 로그',
    summary: '교실의 전력 사용을 센서로 측정하고 학생이 직접 절감 실험을 설계합니다.',
    image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=1000&q=82',
    people: ['jiwoo', 'dohyeon'], members: 5, momentum: 64, need: 'Hardware Builder',
    filters: ['팀원 모집 중', '최근 활동', '우리 학교 밖']
  },
  {
    id: 'localframe', category: 'MEDIA · COMMUNITY', title: 'Local Frame', status: '3일 전 데모',
    summary: '사라지는 동네의 이야기를 청소년 제작자가 기록하고 상영하는 미디어 팀.',
    image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1000&q=82',
    people: ['junho', 'seoyeon'], members: 3, momentum: 81, need: 'Partnership',
    filters: ['팀원 모집 중', '우리 학교 밖']
  },
  {
    id: 'safe-route', category: 'CIVIC · DATA', title: 'Safe Route', status: 'ASK 해결 중',
    summary: '통학로 위험 지점을 학생 제보와 공개 데이터로 시각화하는 시민 프로젝트.',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1000&q=82',
    people: ['seoyeon', 'minjun'], members: 6, momentum: 58, need: 'Data Mentor',
    filters: ['내 관심사', '팀원 모집 중']
  }
];

const OPPORTUNITIES = [
  { id: 'next-builder-2026', logo: 'N', title: 'NEXT Builder Challenge 2026', org: 'NEXT Foundation', meta: ['팀 지원', '최대 300만원', '전국'], filters: ['Challenge', '지원금'], due: 'D-8', date: '8월 22일 마감', fit: 'FocusFlow와 높은 관련' },
  { id: 'youth-ai-lab', logo: 'AI', title: '청소년 AI 제품 실험 지원', org: 'Future Lab', meta: ['API Credit', '멘토링', '온라인'], filters: ['멘토링'], due: 'D-13', date: '8월 27일 마감', fit: 'AI/교육 관심 기반' },
  { id: 'seoul-impact-demo', logo: 'S', title: 'Seoul Impact Demo Day', org: 'Seoul Impact Hub', meta: ['데모', '파트너 연결', '서울'], filters: ['Challenge'], due: 'D-21', date: '9월 4일 마감', fit: '프로젝트 단계 적합' },
  { id: 'youth-maker-grant', logo: 'M', title: 'Youth Maker Space Grant', org: 'Make Together', meta: ['공간', '장비', '6주'], filters: ['지원금', '공간·장비'], due: '상시', date: '매월 선발', fit: 'GreenGrid Lab 추천' }
];

const BASE_EVENTS = [
  { id: 'evt-1', actor: '박서연', action: 'contribution_created', icon: 'message-square-text', text: '<strong>박서연</strong>님이 FocusFlow 사용자 인터뷰 요약을 남겼습니다.', detail: '사용자 5명 · 핵심 패턴 3개', time: '18분 전', source: 'WETHUS', accent: true },
  { id: 'evt-2', actor: '이민준', action: 'task_completed', icon: 'check-check', text: '<strong>이민준</strong>님이 온보딩 프로토타입 v2를 완료했습니다.', detail: 'FocusFlow · GitHub에서 수집', time: '1시간 전', source: 'GitHub' },
  { id: 'evt-3', actor: 'GreenGrid Lab', action: 'ask_answered', icon: 'handshake', text: '<strong>GreenGrid Lab</strong>의 센서 조달 ASK가 해결됐습니다.', detail: '정도현님이 지역 Maker Space 연결', time: '3시간 전', source: 'Network', accent: true },
  { id: 'evt-4', actor: '최유진', action: 'project_joined', icon: 'user-round-plus', text: '<strong>최유진</strong>님이 Local Frame에 Product Designer로 합류했습니다.', detail: '상호보완 매칭으로 연결', time: '어제', source: 'WETHUS' }
];

const BASE_ASKS = [
  { id: 'ask-1', type: 'USER RESEARCH', text: '중학생 대상 인터뷰 질문 8개를 20분 정도 함께 검토해주실 분을 찾습니다.', person: '김안석', project: 'FocusFlow', fit: '도울 수 있는 멤버 4명', due: '이번 주' },
  { id: 'ask-2', type: 'HARDWARE', text: '교실 전력 측정용 센서 선택 경험이 있는 Maker의 조언이 필요합니다.', person: '한지우', project: 'GreenGrid Lab', fit: '도울 수 있는 멤버 2명', due: '2주 안' },
  { id: 'ask-3', type: 'PARTNERSHIP', text: '9월 소규모 상영회를 열 수 있는 서울 지역 공간을 찾고 있습니다.', person: '김준호', project: 'Local Frame', fit: '연결 가능한 공간 3곳', due: '이번 달' }
];

const state = {
  route: location.hash.replace('#', '') || 'for-you',
  peopleFilter: '전체',
  projectFilter: '전체',
  opportunityFilter: 'For You',
  connected: new Set(JSON.parse(localStorage.getItem('wethus.network.connected') || '[]')),
  saved: new Set(JSON.parse(localStorage.getItem('wethus.network.saved') || '[]')),
  savedOpportunities: new Set(JSON.parse(localStorage.getItem('wethus.network.saved-opportunities') || '[]')),
  asks: JSON.parse(localStorage.getItem('wethus.network.asks') || '[]'),
  events: JSON.parse(localStorage.getItem('wethus.network.events.v1') || '[]'),
  workspaceTab: 'activity'
};

const routeView = document.querySelector('#routeView');
const contextRail = document.querySelector('#contextRail');
const primaryNav = document.querySelector('#primaryNav');
const bottomNav = document.querySelector('#bottomNav');
const globalSearch = document.querySelector('#globalSearch');
const askDialog = document.querySelector('#askDialog');
const askForm = document.querySelector('#askForm');
const askText = document.querySelector('#askText');
const askCount = document.querySelector('#askCount');
const copilotDrawer = document.querySelector('#copilotDrawer');
const copilotThread = document.querySelector('#copilotThread');
const copilotForm = document.querySelector('#copilotForm');
const copilotInput = document.querySelector('#copilotInput');
const scrim = document.querySelector('#scrim');
const toast = document.querySelector('#toast');

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function icon(name) { return `<i data-lucide="${name}" aria-hidden="true"></i>`; }
function personById(id) { return PEOPLE.find(person => person.id === id) || PEOPLE[0]; }
function avatar(person, size = '') {
  const cls = size ? ` avatar--${size}` : '';
  if (person?.image) return `<span class="avatar${cls}"><img src="${esc(person.image)}" alt="" /></span>`;
  return `<span class="avatar${cls}">${esc((person?.name || '?').slice(0, 1))}</span>`;
}

function persist() {
  localStorage.setItem('wethus.network.connected', JSON.stringify([...state.connected]));
  localStorage.setItem('wethus.network.saved', JSON.stringify([...state.saved]));
  localStorage.setItem('wethus.network.saved-opportunities', JSON.stringify([...state.savedOpportunities]));
  localStorage.setItem('wethus.network.asks', JSON.stringify(state.asks));
  localStorage.setItem('wethus.network.events.v1', JSON.stringify(state.events));
}

function recordEvent(action, targetType, targetId, metadata = {}, visibility = 'network') {
  state.events.unshift({
    id: `evt-${Date.now()}`,
    actorId: 'person-kim-anseok',
    actor: '김안석',
    action,
    targetType,
    targetId,
    projectId: metadata.projectId || null,
    organizationId: null,
    context: metadata.context || state.route,
    source: 'wethus',
    visibility,
    occurredAt: new Date().toISOString(),
    metadata,
    schemaVersion: 1,
    icon: metadata.icon || 'activity',
    text: metadata.text || `<strong>김안석</strong>님이 새 활동을 기록했습니다.`,
    detail: metadata.detail || 'WETHUS Network',
    time: '방금',
    accent: true
  });
  state.events = state.events.slice(0, 30);
  persist();
}

function renderNav() {
  primaryNav.innerHTML = NAV_ITEMS.map(item => `
    <button class="nav-item ${state.route === item.id ? 'is-active' : ''}" type="button" data-route="${item.id}">
      ${icon(item.icon)}<span>${item.label}</span>${item.signal ? '<span class="nav-item__signal" aria-label="새 활동"></span>' : ''}
    </button>
  `).join('');
  bottomNav.innerHTML = NAV_ITEMS.filter(item => item.mobile).map(item => `
    <button class="${state.route === item.id ? 'is-active' : ''}" type="button" data-route="${item.id}">
      ${icon(item.icon)}<span>${item.label === 'my-wethus' ? 'My' : item.label}</span>
    </button>
  `).join('');
}

function pageHeading(kicker, title, description, action = '') {
  return `<header class="page-heading view-enter">
    <div class="page-heading__copy"><span class="eyebrow">${kicker}</span><h1>${title}</h1><p>${description}</p></div>
    ${action || `<div class="date-stamp">${icon('calendar-days')} 2026년 8월 14일</div>`}
  </header>`;
}

function sectionHead(title, description, route) {
  return `<div class="section-head"><div><h2>${title}</h2><p>${description}</p></div>${route ? `<button class="text-button" type="button" data-route="${route}">전체 보기 ${icon('arrow-right')}</button>` : ''}</div>`;
}

function eventRows(limit = 5) {
  const custom = state.events.map(event => ({ ...event, text: event.text || '<strong>김안석</strong>님의 활동이 기록됐습니다.' }));
  return [...custom, ...BASE_EVENTS].slice(0, limit).map(event => `
    <div class="activity-item" data-searchable="${esc(event.actor)} ${esc(event.action)}">
      <span class="activity-item__icon ${event.accent ? 'is-orange' : ''}">${icon(event.icon || 'activity')}</span>
      <div><p>${event.text}</p><small>${esc(event.detail || event.source || '')}</small></div>
      <time>${esc(event.time || '방금')}</time>
    </div>
  `).join('');
}

function askRows(limit = 3) {
  const custom = state.asks.map(ask => ({ ...ask, person: '김안석', fit: '라우팅 대상 분석 중' }));
  return [...custom, ...BASE_ASKS].slice(0, limit).map(ask => `
    <div class="ask-row" data-searchable="${esc(ask.text)} ${esc(ask.project)}">
      <div class="ask-row__top"><span class="ask-type">${esc(ask.type)}</span><span class="tag">${esc(ask.due)}</span></div>
      <p>${esc(ask.text)}</p>
      <div class="ask-row__foot"><span class="mini-person"><span class="avatar avatar--small">${esc(ask.person.slice(0,1))}</span>${esc(ask.person)} · ${esc(ask.project)}</span><span class="ask-fit">${esc(ask.fit)}</span></div>
    </div>
  `).join('');
}

function renderForYou() {
  return `${pageHeading('PERSONAL NETWORK BRIEF', '좋은 아침이에요, 김안석님.', '오늘의 활동과 관계를 바탕으로 다음 움직임을 정리했습니다.')}
    <section class="network-brief view-enter">
      <div class="network-brief__main">
        <span class="eyebrow">NEXT BEST ACTION</span>
        <h2>이번 주에는 사람을 더 모으기보다,<br /><em>인터뷰 5건을 끝내는 것</em>이 먼저입니다.</h2>
        <p>박서연님이 질문 검토를 도울 수 있고, FocusFlow 팀은 금요일 저녁에 함께 작업할 수 있습니다.</p>
        <div class="brief-actions">
          <button class="button button--primary" type="button" data-connect="seoyeon">박서연님에게 연결 요청 ${icon('arrow-up-right')}</button>
          <button class="button button--secondary" type="button" data-route="workspace">FocusFlow 열기</button>
        </div>
      </div>
      <div class="network-brief__signal">
        <div><div class="signal-head"><span>NETWORK PULSE</span><span class="signal-live">LIVE</span></div><div class="signal-number">12<small>이번 주 활동</small></div><div class="signal-caption">지난주보다 연결 가능한 근거가 4개 늘었습니다.</div></div>
        <div class="mini-bars" aria-label="최근 7일 활동 추이"><span style="height:20%"></span><span style="height:36%"></span><span style="height:28%"></span><span style="height:54%"></span><span style="height:43%"></span><span style="height:70%"></span><span style="height:94%"></span></div>
      </div>
    </section>

    ${sectionHead('지금 가치가 큰 움직임', '프로젝트와 네트워크의 현재 상태를 함께 봅니다.')}
    <section class="action-grid view-enter">
      <article class="action-card"><div class="action-card__top"><span class="action-icon">${icon('users')}</span><span class="action-card__meta">PEOPLE</span></div><h3>박서연님과 20분<br />인터뷰 질문 검토</h3><p>FocusFlow가 지금 필요로 하는 경험과 가용 시간이 맞습니다.</p><div class="action-card__footer"><span class="mini-person">${avatar(PEOPLE[0], 'small')} UX Researcher</span><button class="text-button" data-connect="seoyeon">연결 ${icon('arrow-right')}</button></div></article>
      <article class="action-card"><div class="action-card__top"><span class="action-icon">${icon('circle-help')}</span><span class="action-card__meta">OPEN ASK</span></div><h3>GreenGrid Lab의<br />센서 선택을 도울 수 있어요.</h3><p>지난 프로젝트의 하드웨어 조달 기록이 이 ASK와 연결됩니다.</p><div class="action-card__footer"><span class="tag">예상 15분</span><button class="text-button" data-help-ask>도움 주기 ${icon('arrow-right')}</button></div></article>
      <article class="action-card"><div class="action-card__top"><span class="action-icon">${icon('telescope')}</span><span class="action-card__meta">OPPORTUNITY</span></div><h3>NEXT Builder Challenge<br />마감까지 8일</h3><p>FocusFlow의 단계와 팀 구성이 지원 조건에 잘 맞습니다.</p><div class="action-card__footer"><span class="tag">최대 300만원</span><button class="text-button" data-route="opportunities">자세히 ${icon('arrow-right')}</button></div></article>
    </section>

    ${sectionHead('Network Activity', '행동이 기록되고 관계가 만들어지는 흐름입니다.', 'network')}
    <section class="content-grid view-enter">
      <article class="panel"><div class="panel__head"><h3>내 주변의 최근 활동</h3><button class="text-button" data-route="network">모두 보기 ${icon('arrow-right')}</button></div><div class="panel__body activity-list">${eventRows(5)}</div></article>
      <article class="panel"><div class="panel__head"><h3>내가 해결할 수 있는 ASK</h3><button class="icon-button" type="button" data-open-ask aria-label="ASK 추가">${icon('plus')}</button></div><div class="ask-list">${askRows(3)}</div></article>
    </section>

    ${sectionHead('계속 움직이는 프로젝트', '최근 실제 활동이 있는 팀만 보여줍니다.', 'projects')}
    <section class="project-grid view-enter">${PROJECTS.slice(0, 2).map(projectCard).join('')}</section>`;
}

function personCard(person) {
  const connected = state.connected.has(person.id);
  return `<article class="person-card" data-searchable="${esc(`${person.name} ${person.role} ${person.skills.join(' ')} ${person.bio}`)}" data-filter-value="${esc(person.filter)}">
    <div class="person-card__head">${avatar(person)}<div class="person-card__name"><h3>${esc(person.name)}</h3><p>${esc(person.role)}</p></div><button class="button button--small ${connected ? 'is-connected' : 'button--secondary'}" type="button" data-connect="${person.id}">${connected ? '연결됨' : '연결'}</button></div>
    <p class="person-card__bio">${esc(person.bio)}</p>
    <div class="tag-row">${person.skills.map(skill => `<span class="tag">${esc(skill)}</span>`).join('')}</div>
    <div class="match-reason">${icon('sparkles')}<span><strong>왜 지금 만나야 할까요?</strong><br />${esc(person.reason)}</span></div>
  </article>`;
}

function renderPeople() {
  const filters = ['전체', '개발', '디자인', '리서치', '운영', '연구', '콘텐츠'];
  return `${pageHeading('PEOPLE DISCOVERY', '함께 만들 사람을 발견하세요.', '관심사가 같은 사람보다, 지금 서로를 보완할 수 있는 사람을 먼저 보여드립니다.', `<button class="button button--primary" type="button" data-open-ask>${icon('radar')} 필요한 사람 찾기</button>`)}
    <div class="filter-row">${filters.map(filter => `<button class="filter-chip ${state.peopleFilter === filter ? 'is-active' : ''}" type="button" data-people-filter="${filter}">${filter}</button>`).join('')}</div>
    <section class="people-grid view-enter">${PEOPLE.map(personCard).join('')}</section>`;
}

function projectCard(project) {
  const saved = state.saved.has(project.id);
  return `<article class="project-card" data-searchable="${esc(`${project.title} ${project.category} ${project.summary} ${project.need}`)}" data-project-filters="${esc(project.filters.join('|'))}">
    <div class="project-card__visual"><img src="${esc(project.image)}" alt="" /><span class="project-card__status">${esc(project.status)}</span><button class="icon-button save-button ${saved ? 'is-saved' : ''}" type="button" data-save-project="${project.id}" aria-label="${saved ? '저장 취소' : '프로젝트 저장'}">${icon('bookmark')}</button></div>
    <div class="project-card__body"><div class="project-card__eyebrow"><span>${esc(project.category)}</span><span>${esc(project.need)} 모집</span></div><h3>${esc(project.title)}</h3><p>${esc(project.summary)}</p><div class="project-card__foot"><div class="project-people">${project.people.map(id => avatar(personById(id), 'small')).join('')}<span>+${project.members - project.people.length}명</span></div><div class="momentum"><div class="momentum__label"><span>Momentum</span><span>${project.momentum}%</span></div><div class="momentum__track"><span style="width:${project.momentum}%"></span></div></div><button class="text-button" type="button" data-open-project="${project.id}" aria-label="${esc(project.title)} 열기">${icon('arrow-up-right')}</button></div></div>
  </article>`;
}

function renderProjects() {
  const filters = ['전체', '내 관심사', '팀원 모집 중', '최근 활동', '우리 학교 밖'];
  return `${pageHeading('ACTIVE PROJECTS', '아이디어보다 움직임을 봅니다.', '최근 활동, 열린 역할, 필요한 도움을 기준으로 지금 합류할 팀을 찾습니다.', `<button class="button button--primary" type="button" data-start-project>${icon('plus')} 프로젝트 시작</button>`)}
    <div class="filter-row">${filters.map(filter => `<button class="filter-chip ${state.projectFilter === filter ? 'is-active' : ''}" type="button" data-project-filter="${filter}">${filter}</button>`).join('')}</div>
    <section class="project-grid view-enter">${PROJECTS.map(projectCard).join('')}</section>`;
}

function renderOpportunities() {
  const filters = ['For You', 'Challenge', '지원금', '멘토링', '공간·장비'];
  return `${pageHeading('OPPORTUNITY MATCH', '지금의 성장 방향에 맞는 기회.', '대회 이름보다 프로젝트 단계, 필요한 자원, 현재 활동을 바탕으로 추천합니다.', `<button class="button button--secondary" type="button" data-opportunity-pref>${icon('sliders-horizontal')} 관심 조건</button>`)}
    <div class="filter-row">${filters.map(filter => `<button class="filter-chip ${state.opportunityFilter === filter ? 'is-active' : ''}" type="button" data-opportunity-filter="${filter}">${filter}</button>`).join('')}</div>
    <section class="opportunity-list view-enter">${OPPORTUNITIES.map(item => `<article class="opportunity-row" data-searchable="${esc(`${item.title} ${item.org} ${item.meta.join(' ')}`)}" data-opportunity-filters="${esc(item.filters.join('|'))}"><span class="opportunity-logo">${esc(item.logo)}</span><div class="opportunity-copy"><h3>${esc(item.title)}</h3><p>${esc(item.org)} · ${esc(item.fit)}</p><div class="opportunity-meta">${item.meta.map(meta => `<span>${esc(meta)}</span>`).join('')}</div></div><div class="deadline"><strong>${esc(item.due)}</strong><small>${esc(item.date)}</small><button class="text-button ${state.savedOpportunities.has(item.id) ? 'is-saved' : ''}" type="button" data-save-opportunity="${esc(item.id)}">${state.savedOpportunities.has(item.id) ? '저장됨' : '저장'} ${icon('bookmark')}</button></div></article>`).join('')}</section>`;
}

function networkAskCard(ask) {
  const person = PEOPLE.find(item => ask.person.includes(item.name.slice(1))) || { name: ask.person, image: '' };
  return `<article class="network-ask" data-searchable="${esc(`${ask.text} ${ask.project}`)}"><div class="network-ask__person">${avatar(person, 'small')}<div><strong>${esc(ask.person)}</strong><small>${esc(ask.project)} · ${esc(ask.due)}</small></div></div><p>${esc(ask.text)}</p><div class="network-ask__bottom"><span>${esc(ask.fit)}</span><button class="button button--small button--secondary" type="button" data-help-ask>도움 주기</button></div></article>`;
}

function renderNetwork() {
  const allAsks = [...state.asks.map(ask => ({ ...ask, person: '김안석', fit: '라우팅 대상 분석 중' })), ...BASE_ASKS];
  return `${pageHeading('ASK / OFFER', '필요와 가능성이 만나는 곳.', '무엇을 찾는지 말하면 WETHUS가 해결 가능성이 높은 사람과 자원을 연결합니다.', `<button class="button button--primary" type="button" data-open-ask>${icon('plus')} ASK 올리기</button>`)}
    <section class="network-board view-enter"><div class="board-column"><div class="board-column__title"><h2>Open ASK</h2><span>${allAsks.length}</span></div>${allAsks.map(networkAskCard).join('')}</div><div class="board-column"><div class="board-column__title"><h2>Offers near you</h2><span>4</span></div>${PEOPLE.slice(0,4).map(person => `<article class="offer-card">${avatar(person)}<div class="offer-card__body"><h3>${esc(person.name)} · ${esc(person.skills[0])}</h3><p>${esc(person.name)}님이 이번 주 30분을 도울 수 있습니다.</p><div class="tag-row">${person.skills.slice(0,2).map(skill => `<span class="tag">${esc(skill)}</span>`).join('')}</div></div><button class="text-button" type="button" data-connect="${person.id}">${state.connected.has(person.id) ? '연결됨' : '연결'}</button></article>`).join('')}</div></section>
    ${sectionHead('Semantic Activity', '포트폴리오와 추천의 근거가 되는 활동 기록입니다.')}
    <article class="panel"><div class="panel__body activity-list">${eventRows(8)}</div></article>`;
}

function renderMyWethus() {
  return `${pageHeading('LIVING PORTFOLIO', 'My WETHUS', '소개문보다 실제 활동이 나를 설명합니다.', `<button class="button button--secondary" type="button" data-share-profile>${icon('share-2')} 공개 프로필</button>`)}
    <section class="profile-hero view-enter"><span class="avatar avatar--large avatar--kim">김</span><div><h2 class="profile-name">김안석</h2><p class="profile-handle">@anseok.builds · Builder · Seoul</p><p class="profile-bio">청소년이 아이디어를 팀과 실행으로 바꾸는 방법을 만들고 있습니다. 현재 FocusFlow에서 제품 방향과 초기 사용자 검증을 맡고 있습니다.</p></div><div class="profile-actions"><button class="button button--secondary" type="button" data-edit-profile>프로필 수정</button><button class="button button--primary" type="button" data-open-ask>ASK 올리기</button></div></section>
    <section class="profile-stats view-enter"><div class="profile-stat"><strong>2</strong><span>Built</span></div><div class="profile-stat"><strong>11</strong><span>Contributions</span></div><div class="profile-stat"><strong>7</strong><span>Worked with</span></div><div class="profile-stat"><strong>3</strong><span>Helped</span></div></section>
    <section class="portfolio-grid view-enter"><article class="panel journey"><h2>Journey</h2>${[
      ['2026.08', '사용자 인터뷰 5건 완료', 'FocusFlow의 핵심 문제를 집중 루틴으로 좁혔습니다.'],
      ['2026.07', 'FocusFlow 시작', '제품 방향과 초기 사용자 검증을 맡았습니다.'],
      ['2026.06', 'GreenGrid Lab 센서 조달 지원', '지역 Maker Space와 팀을 연결했습니다.'],
      ['2026.04', '첫 프로젝트 회고 공개', '실패 원인과 다음 시도를 팀 기록으로 남겼습니다.']
    ].map(row => `<div class="journey-row"><time>${row[0]}</time><span class="journey-dot"></span><div class="journey-copy"><strong>${row[1]}</strong><p>${row[2]}</p></div></div>`).join('')}</article><div class="portfolio-side"><article class="panel portfolio-card"><span class="eyebrow">CURRENTLY BUILDING</span><h2>FocusFlow</h2><p class="profile-bio">10대가 자신의 집중 루틴을 만들고 회고하는 도구.</p><div class="portfolio-card__row"><span>역할</span><strong>Product · Founder</strong></div><div class="portfolio-card__row"><span>최근 활동</span><strong>오늘</strong></div><button class="button button--secondary" type="button" data-route="workspace">Workspace 열기</button></article><article class="panel portfolio-card"><span class="eyebrow">ASK / OFFER</span><h2>지금 찾는 것</h2><div class="tag-row"><span class="tag">UX Research</span><span class="tag">학교 파일럿</span></div><h2 style="margin-top:20px">도울 수 있는 것</h2><div class="tag-row"><span class="tag">초기 제품 기획</span><span class="tag">팀 운영</span></div></article><article class="panel portfolio-card"><span class="eyebrow">WORKED WITH</span><h2>다시 함께할 사람</h2><div class="project-people">${PEOPLE.slice(0,4).map(person => avatar(person)).join('')}<span>7명</span></div></article></div></section>`;
}

function renderWorkspace() {
  return `<section class="workspace-head view-enter"><button class="workspace-head__back" type="button" data-route="projects">${icon('arrow-left')} Projects</button><div class="workspace-head__main"><div><span class="eyebrow">PROJECT WORKSPACE</span><h1>FocusFlow</h1><p>10대가 스스로 집중 루틴을 설계하고 회고할 수 있는 가벼운 학습 도구.</p><div class="workspace-status"><span>활동 중</span><span>팀 4명</span><span>연동 3개</span><span>Open ASK 1개</span></div></div><div class="workspace-head__actions"><button class="button button--secondary" type="button" data-log-activity>${icon('plus')} 활동 기록</button><button class="button button--primary" type="button" data-copilot>${icon('sparkles')} AI Brief</button></div></div></section>
    <section class="workspace-grid view-enter"><div class="workspace-main"><article class="panel focus-card"><span class="eyebrow">THIS WEEK'S FOCUS</span><h2>인터뷰 5건을 끝내고, 반복되는 집중 방해 패턴을 한 문장으로 정의합니다.</h2><p>최근 활동 7건과 Notion 문서 3개에서 정리됨 · 팀이 직접 수정할 수 있습니다.</p></article><div class="workspace-tabs"><button class="${state.workspaceTab === 'activity' ? 'is-active' : ''}" data-workspace-tab="activity">Activity</button><button class="${state.workspaceTab === 'tasks' ? 'is-active' : ''}" data-workspace-tab="tasks">Tasks</button><button class="${state.workspaceTab === 'files' ? 'is-active' : ''}" data-workspace-tab="files">Files</button><button class="${state.workspaceTab === 'team' ? 'is-active' : ''}" data-workspace-tab="team">Team</button></div><article class="panel"><div class="panel__head"><h3>${state.workspaceTab === 'activity' ? '최근 기여와 활동' : `${state.workspaceTab.toUpperCase()} 보기`}</h3><button class="text-button" type="button" data-log-activity>${icon('plus')} 기록 추가</button></div><div class="panel__body">${workspaceTabContent()}</div></article></div><aside class="workspace-side"><article class="panel portfolio-card"><span class="eyebrow">MOMENTUM</span><h2>활동은 이어지고 있습니다.</h2><div class="momentum" style="margin:14px 0;min-width:100%"><div class="momentum__label"><span>최근 14일</span><span>꾸준함</span></div><div class="momentum__track"><span style="width:72%"></span></div></div><p class="profile-bio">다만 사용자 근거가 코드 작업보다 늦습니다. 이번 주는 인터뷰에 집중하세요.</p></article><article class="panel portfolio-card"><span class="eyebrow">CONNECTED TOOLS</span><h2>Activity sources</h2><div class="tool-stack">${[['Github','github','12분 전 동기화'],['Figma','figma','1시간 전 동기화'],['Notion','notebook-pen','오늘 09:40 동기화']].map(tool => `<div class="tool-row"><span class="tool-row__icon">${icon(tool[1])}</span><span class="tool-row__copy"><strong>${tool[0]}</strong><small>${tool[2]}</small></span><span class="tool-row__status">LIVE</span></div>`).join('')}</div></article><article class="panel portfolio-card"><span class="eyebrow">EVIDENCE GAPS</span><h2>다음 판단에 필요한 것</h2><div class="evidence-list"><div class="evidence-item"><strong>사용자 근거</strong><span>인터뷰 3건이 더 필요합니다.</span></div><div class="evidence-item"><strong>행동 데이터</strong><span>프로토타입 재방문 로그가 없습니다.</span></div></div></article></aside></section>`;
}

function workspaceTabContent() {
  if (state.workspaceTab === 'activity') return [
    [PEOPLE[0], '인터뷰 질문지의 유도 질문 3개를 수정했습니다.', '18분 전'],
    [PEOPLE[1], '온보딩 프로토타입 v2를 GitHub에 배포했습니다.', '1시간 전'],
    [PEOPLE[2], '집중 루틴 선택 화면의 Figma 시안을 공유했습니다.', '어제'],
    [{ name: '김안석', image: '' }, '이번 주 목표를 인터뷰 5건으로 변경했습니다.', '어제']
  ].map(row => `<div class="contribution-row">${row[0].name === '김안석' ? '<span class="avatar avatar--small avatar--kim">김</span>' : avatar(row[0], 'small')}<div class="contribution-row__copy"><strong>${esc(row[0].name)}</strong><span>${esc(row[1])}</span></div><time>${esc(row[2])}</time></div>`).join('');
  if (state.workspaceTab === 'tasks') return `<div class="contribution-row"><span class="activity-item__icon is-orange">${icon('check')}</span><div class="contribution-row__copy"><strong>인터뷰 대상 5명 모집</strong><span>김안석 · 3/5 완료</span></div><time>금요일</time></div><div class="contribution-row"><span class="activity-item__icon">${icon('circle')}</span><div class="contribution-row__copy"><strong>반복 패턴 한 문장으로 정리</strong><span>팀 공동 작업</span></div><time>토요일</time></div>`;
  if (state.workspaceTab === 'files') return `<div class="contribution-row"><span class="activity-item__icon">${icon('file-text')}</span><div class="contribution-row__copy"><strong>사용자 인터뷰 노트</strong><span>Notion · 3개 문서</span></div><time>오늘</time></div><div class="contribution-row"><span class="activity-item__icon">${icon('figma')}</span><div class="contribution-row__copy"><strong>FocusFlow Prototype v2</strong><span>Figma · 14 frames</span></div><time>어제</time></div>`;
  return PEOPLE.slice(0,4).map(person => `<div class="contribution-row">${avatar(person, 'small')}<div class="contribution-row__copy"><strong>${esc(person.name)}</strong><span>${esc(person.role.split(' · ')[0])}</span></div><button class="text-button" data-connect="${person.id}">메시지</button></div>`).join('');
}

function renderContextRail() {
  const routeContext = {
    'for-you': ['오늘의 문맥', 'FocusFlow', '인터뷰 검증 주간'],
    people: ['추천 기준', '상호보완성', '역할 · 단계 · 가용 시간'],
    projects: ['프로젝트 신호', '최근 활동 우선', '실제 로그가 있는 팀'],
    opportunities: ['기회 매칭', 'FocusFlow', '단계 · 필요 자원 · 마감'],
    network: ['Network pulse', 'ASK 4개', '이번 주 해결률 68%'],
    'my-wethus': ['Portfolio source', '11 Contributions', '활동에서 자동 정리'],
    workspace: ['Project context', 'FocusFlow', '최근 14일 활동 기반']
  }[state.route] || ['Network context', 'WETHUS', '활동 기반 연결'];
  contextRail.innerHTML = `<div class="context-title"><strong>${routeContext[0]}</strong><span>CONTEXT ON</span></div>
    <article class="context-card"><div class="context-card__label"><span>CURRENTLY BUILDING</span>${icon('blocks')}</div><h3>${routeContext[1]}</h3><p>${routeContext[2]}</p><div class="pulse-row"><span>최근 활동</span><strong>오늘</strong></div><div class="pulse-row"><span>Open ASK</span><strong>1</strong></div><button class="button button--secondary" type="button" data-route="workspace">Workspace 열기</button></article>
    <article class="context-card"><div class="context-card__label"><span>PEOPLE TO KNOW</span>${icon('user-round-search')}</div><div class="context-person">${avatar(PEOPLE[0])}<div class="context-person__copy"><strong>박서연</strong><small>UX Researcher · 이번 주 가능</small></div></div><div class="context-divider"></div><p>사용자 인터뷰 경험이 지금 FocusFlow의 빈틈을 채웁니다.</p><button class="button ${state.connected.has('seoyeon') ? 'is-connected' : 'button--secondary'}" type="button" data-connect="seoyeon">${state.connected.has('seoyeon') ? '연결됨' : '연결 요청'}</button></article>
    <article class="context-card"><div class="context-card__label"><span>NETWORK HEALTH</span>${icon('activity')}</div><div class="pulse-row"><span>이번 주 활동</span><strong>12</strong></div><div class="pulse-row"><span>새로운 협업</span><strong>3</strong></div><div class="pulse-row"><span>해결된 ASK</span><strong>2</strong></div></article>
    <article class="context-card"><div class="context-card__label"><span>PRIVACY</span>${icon('shield-check')}</div><h3>일의 기록만 사용합니다.</h3><p>개인 DM, 위치, 민감정보는 추천에 사용하지 않습니다.</p></article>`;
}

function renderRoute() {
  const renderers = {
    'for-you': renderForYou,
    people: renderPeople,
    projects: renderProjects,
    opportunities: renderOpportunities,
    network: renderNetwork,
    'my-wethus': renderMyWethus,
    workspace: renderWorkspace
  };
  const renderer = renderers[state.route] || renderForYou;
  routeView.innerHTML = renderer();
  renderNav();
  renderContextRail();
  globalSearch.value = '';
  applyCollectionVisibility();
  window.scrollTo({ top: 0, behavior: 'instant' });
  refreshIcons();
}

function refreshIcons() { window.lucide?.createIcons({ attrs: { 'stroke-width': 1.8 } }); }

function navigate(route) {
  state.route = route;
  if (location.hash !== `#${route}`) history.pushState(null, '', `#${route}`);
  renderRoute();
  document.querySelector('#mainContent')?.focus({ preventScroll: true });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

function toggleConnect(id) {
  const person = personById(id);
  if (state.connected.has(id)) {
    state.connected.delete(id);
    showToast(`${person.name}님과의 연결 요청을 취소했습니다.`);
  } else {
    state.connected.add(id);
    recordEvent('connection_created', 'person', id, { icon: 'user-round-check', text: `<strong>김안석</strong>님이 ${esc(person.name)}님에게 연결을 요청했습니다.`, detail: `${esc(person.skills[0])} · 상호보완 매칭` });
    showToast(`${person.name}님에게 연결 요청을 보냈습니다.`);
  }
  persist();
  renderRoute();
}

function toggleSavedProject(id) {
  const project = PROJECTS.find(item => item.id === id);
  if (state.saved.has(id)) {
    state.saved.delete(id);
    showToast(`${project.title} 저장을 취소했습니다.`);
  } else {
    state.saved.add(id);
    recordEvent('project_saved', 'project', id, { projectId: id, icon: 'bookmark-check', text: `<strong>김안석</strong>님이 ${esc(project.title)} 프로젝트를 저장했습니다.`, detail: '관심 프로젝트' }, 'private');
    showToast(`${project.title}를 My WETHUS에 저장했습니다.`);
  }
  persist();
  renderRoute();
}

function toggleSavedOpportunity(id) {
  const opportunity = OPPORTUNITIES.find(item => item.id === id);
  if (!opportunity) return;
  if (state.savedOpportunities.has(id)) {
    state.savedOpportunities.delete(id);
    showToast(`${opportunity.title} 저장을 취소했습니다.`);
  } else {
    state.savedOpportunities.add(id);
    recordEvent('opportunity_saved', 'opportunity', id, { icon: 'bookmark-check', text: `<strong>김안석</strong>님이 ${esc(opportunity.title)} 기회를 저장했습니다.`, detail: `${esc(opportunity.org)} · ${esc(opportunity.due)}` }, 'private');
    showToast(`${opportunity.title}를 My WETHUS에 저장했습니다.`);
  }
  persist();
  renderRoute();
}

function openCopilot(prompt = '') {
  copilotDrawer.classList.add('is-open');
  copilotDrawer.setAttribute('aria-hidden', 'false');
  scrim.classList.add('is-open');
  if (!copilotThread.children.length) {
    copilotThread.innerHTML = `<div class="copilot-message"><strong>현재 프로젝트와 네트워크를 함께 읽었습니다.</strong><br /><br />FocusFlow는 개발보다 사용자 근거가 한 박자 늦습니다. 이번 주에는 인터뷰 5건을 끝내고, 박서연님에게 질문 검토를 요청하는 것이 가장 가치가 큽니다.</div><div class="copilot-suggestions"><button type="button" data-copilot-prompt="이번 주 계획을 세워줘">이번 주 계획을 세워줘</button><button type="button" data-copilot-prompt="지금 만나야 할 사람은?">지금 만나야 할 사람은?</button><button type="button" data-copilot-prompt="프로젝트의 빈 근거를 알려줘">프로젝트의 빈 근거를 알려줘</button></div>`;
  }
  if (prompt) copilotInput.value = prompt;
  refreshIcons();
  setTimeout(() => copilotInput.focus(), 80);
}

function closeCopilot() {
  copilotDrawer.classList.remove('is-open');
  copilotDrawer.setAttribute('aria-hidden', 'true');
  scrim.classList.remove('is-open');
}

function copilotReply(prompt) {
  const normalized = prompt.toLowerCase();
  if (normalized.includes('사람') || normalized.includes('만나')) return '<strong>박서연님을 먼저 추천합니다.</strong><br /><br />관심사가 같아서가 아니라, FocusFlow의 현재 빈칸인 사용자 인터뷰 경험을 채울 수 있고 이번 주 가용 시간이 겹치기 때문입니다.';
  if (normalized.includes('근거') || normalized.includes('빈')) return '<strong>가장 큰 빈칸은 재방문 행동 데이터입니다.</strong><br /><br />인터뷰는 2건 있지만 실제 프로토타입을 다시 연 사용자가 몇 명인지 기록이 없습니다. 다음 배포에 간단한 재방문 이벤트를 붙이세요.';
  if (normalized.includes('계획') || normalized.includes('이번 주')) return '<strong>이번 주는 세 단계면 충분합니다.</strong><br /><br />1. 질문지 검토<br />2. 인터뷰 5건 완료<br />3. 반복 패턴을 한 문장으로 정리<br /><br />새 기능 개발은 그 다음으로 미루는 편이 좋습니다.';
  return '<strong>현재 문맥에서 가장 가치가 큰 행동은 사용자 근거를 늘리는 일입니다.</strong><br /><br />질문을 프로젝트, 사람, 기회 중 하나로 조금 더 좁혀주면 실행 순서까지 정리해드릴게요.';
}

function applyCollectionVisibility() {
  const query = globalSearch.value.trim().toLowerCase();
  document.querySelectorAll('[data-searchable]').forEach(element => {
    const matchesSearch = !query || element.dataset.searchable.toLowerCase().includes(query);
    let matchesFilter = true;
    if (element.classList.contains('person-card')) {
      matchesFilter = state.peopleFilter === '전체' || element.dataset.filterValue === state.peopleFilter;
    } else if (element.classList.contains('project-card') && state.route === 'projects') {
      matchesFilter = state.projectFilter === '전체' || element.dataset.projectFilters.split('|').includes(state.projectFilter);
    } else if (element.classList.contains('opportunity-row')) {
      matchesFilter = state.opportunityFilter === 'For You' || element.dataset.opportunityFilters.split('|').includes(state.opportunityFilter);
    }
    element.hidden = !(matchesSearch && matchesFilter);
  });
}

document.addEventListener('click', event => {
  const routeButton = event.target.closest('[data-route]');
  if (routeButton) { event.preventDefault(); navigate(routeButton.dataset.route); return; }

  const connectButton = event.target.closest('[data-connect]');
  if (connectButton) { toggleConnect(connectButton.dataset.connect); return; }

  const saveButton = event.target.closest('[data-save-project]');
  if (saveButton) { toggleSavedProject(saveButton.dataset.saveProject); return; }

  if (event.target.closest('[data-open-project]')) { navigate('workspace'); return; }
  if (event.target.closest('[data-open-ask]')) { askDialog.showModal(); askText.focus(); return; }
  if (event.target.closest('[data-close-dialog]')) { askDialog.close(); return; }
  if (event.target.closest('[data-copilot]')) { openCopilot(); return; }
  if (event.target.closest('[data-close-copilot]')) { closeCopilot(); return; }

  const promptButton = event.target.closest('[data-copilot-prompt]');
  if (promptButton) { copilotInput.value = promptButton.dataset.copilotPrompt; copilotForm.requestSubmit(); return; }

  const filterButton = event.target.closest('[data-people-filter]');
  if (filterButton) {
    state.peopleFilter = filterButton.dataset.peopleFilter;
    document.querySelectorAll('[data-people-filter]').forEach(button => button.classList.toggle('is-active', button.dataset.peopleFilter === state.peopleFilter));
    applyCollectionVisibility();
    return;
  }

  const projectFilterButton = event.target.closest('[data-project-filter]');
  if (projectFilterButton) {
    state.projectFilter = projectFilterButton.dataset.projectFilter;
    document.querySelectorAll('[data-project-filter]').forEach(button => button.classList.toggle('is-active', button.dataset.projectFilter === state.projectFilter));
    applyCollectionVisibility();
    return;
  }

  const opportunityFilterButton = event.target.closest('[data-opportunity-filter]');
  if (opportunityFilterButton) {
    state.opportunityFilter = opportunityFilterButton.dataset.opportunityFilter;
    document.querySelectorAll('[data-opportunity-filter]').forEach(button => button.classList.toggle('is-active', button.dataset.opportunityFilter === state.opportunityFilter));
    applyCollectionVisibility();
    return;
  }

  const tabButton = event.target.closest('[data-workspace-tab]');
  if (tabButton) { state.workspaceTab = tabButton.dataset.workspaceTab; renderRoute(); return; }

  if (event.target.closest('[data-help-ask]')) { recordEvent('member_helped', 'ask', 'open-ask', { icon: 'handshake', text: '<strong>김안석</strong>님이 ASK에 도움을 제안했습니다.', detail: '15분 조언 · 연결 대기' }); showToast('도움 제안을 보냈습니다. 상대가 수락하면 DM이 열립니다.'); renderContextRail(); return; }
  if (event.target.closest('[data-log-activity]')) { recordEvent('contribution_created', 'project', 'focusflow', { projectId: 'focusflow', icon: 'activity', text: '<strong>김안석</strong>님이 FocusFlow 활동을 기록했습니다.', detail: '수동 기록 · 팀 공개' }, 'team'); showToast('활동이 팀 타임라인과 Living Portfolio에 기록됐습니다.'); if (state.route === 'workspace') renderRoute(); return; }
  if (event.target.closest('[data-start-project]')) { window.open('https://www.wethus.co.kr/founder.html', '_blank', 'noopener,noreferrer'); return; }
  if (event.target.closest('[data-share-profile]')) { navigator.clipboard?.writeText(location.href.split('#')[0] + '#my-wethus'); showToast('공개 프로필 링크를 복사했습니다.'); return; }
  if (event.target.closest('[data-edit-profile]')) { window.open('https://www.wethus.co.kr/profile.html', '_blank', 'noopener,noreferrer'); return; }
  const saveOpportunityButton = event.target.closest('[data-save-opportunity]');
  if (saveOpportunityButton) { toggleSavedOpportunity(saveOpportunityButton.dataset.saveOpportunity); return; }
  if (event.target.closest('[data-opportunity-pref]')) { showToast('관심 분야와 필요한 자원을 바탕으로 추천 조건을 조정합니다.'); }
});

askText.addEventListener('input', () => { askCount.textContent = askText.value.length; });
askForm.addEventListener('submit', event => {
  event.preventDefault();
  const text = askText.value.trim();
  if (!text) return;
  const project = document.querySelector('#askProject').value;
  const due = document.querySelector('#askDue').value;
  const visibility = new FormData(askForm).get('visibility') || 'network';
  const ask = { id: `ask-${Date.now()}`, type: 'NEW ASK', text, project, due, visibility, createdAt: new Date().toISOString() };
  state.asks.unshift(ask);
  recordEvent('ask_created', 'ask', ask.id, { projectId: project === 'FocusFlow' ? 'focusflow' : null, icon: 'circle-help', text: '<strong>김안석</strong>님이 새로운 ASK를 만들었습니다.', detail: `${esc(project)} · ${esc(due)}` }, visibility);
  persist();
  askText.value = '';
  askCount.textContent = '0';
  askDialog.close();
  showToast('ASK가 기록됐고 연결 가능한 멤버를 찾고 있습니다.');
  if (state.route === 'network' || state.route === 'for-you') renderRoute();
});

copilotForm.addEventListener('submit', event => {
  event.preventDefault();
  const prompt = copilotInput.value.trim();
  if (!prompt) return;
  const userMessage = document.createElement('div');
  userMessage.className = 'copilot-message is-user';
  userMessage.textContent = prompt;
  copilotThread.append(userMessage);
  copilotInput.value = '';
  const reply = document.createElement('div');
  reply.className = 'copilot-message';
  reply.innerHTML = copilotReply(prompt);
  setTimeout(() => { copilotThread.append(reply); copilotThread.scrollTop = copilotThread.scrollHeight; }, 220);
  copilotThread.scrollTop = copilotThread.scrollHeight;
});

globalSearch.addEventListener('input', () => {
  applyCollectionVisibility();
});
globalSearch.addEventListener('keydown', event => {
  if (event.key === 'Enter' && globalSearch.value.trim() && !['people', 'projects', 'network', 'opportunities'].includes(state.route)) {
    const query = globalSearch.value;
    navigate('people');
    globalSearch.value = query;
    globalSearch.dispatchEvent(new Event('input'));
  }
});

document.addEventListener('keydown', event => {
  if (event.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') { event.preventDefault(); globalSearch.focus(); }
  if (event.key === 'Escape') { closeCopilot(); if (askDialog.open) askDialog.close(); }
});
window.addEventListener('popstate', () => { state.route = location.hash.replace('#', '') || 'for-you'; renderRoute(); });

renderRoute();
