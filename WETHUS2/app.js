// WETHUS MVP App State + Gemini integration (dev)
(function () {
  const KEY = 'wethus_v1';
  const GLOBAL_PROJECTS_KEY = 'wethus_global_projects_v1';
  const NETWORK_PEOPLE_KEY = 'wethus_network_people_v1';
  const DEFAULT_GEMINI_KEY = '';
  const DEFAULT_OPENAI_KEY = '';
  const ADMIN_MODE_USER_ID = 'admin-mode';
  const IS_LOCAL_WETHUS = typeof location !== 'undefined' && ['localhost', '127.0.0.1'].includes(location.hostname);
  const IS_NETWORK_PREVIEW = typeof location !== 'undefined'
    && /^wethus-network-integrated-preview(?:-[a-z0-9]+)?\.vercel\.app$/i.test(location.hostname);
  const CLOUD_BASE_CANDIDATES = (IS_NETWORK_PREVIEW ? [] : [
    IS_LOCAL_WETHUS ? `${location.protocol}//${location.hostname}:8787` : '',
    (typeof window !== 'undefined' && window.WETHUS_API_BASE) ? window.WETHUS_API_BASE : '',
    'https://wethus-api.onrender.com/api',
    'https://wethus-api.onrender.com'
  ]).filter(Boolean).map(x => String(x).replace(/\/$/, '').replace(/\/api$/, ''));
  let cloudSyncTimer = null;
  let cloudAutoPullTimer = null;
  let restoredServerSessionActorId = '';

  function sanitizeCategoryName(raw) {
    const cleaned = String(raw || '')
      .replace(/\byouth\b/ig, '')
      .replace(/youth/ig, '')
      .replace(/[-_/|]+$/g, '')
      .trim();
    const key = cleaned.toLowerCase();
    const map = {
      film: 'Film',
      startup: 'Startup',
      science: 'Science',
      policy: 'Policy',
      campaign: 'Campaign',
      creative: 'Creative',
      app: 'App',
      artculture: 'ArtCulture',
      art: 'Art',
      culture: 'Culture'
    };
    return map[key] || cleaned;
  }

  function isYouthByAge(age, verifiedAt) {
    const n = Number(age);
    if (!Number.isFinite(n)) return false;
    if (!verifiedAt) return false;
    return n < 19;
  }

  function normalizeYouthTag(user = {}) {
    const byAge = isYouthByAge(user.age, user.ageVerifiedAt);
    return !!(user.youthTag || byAge);
  }

  function getUserTrack(user = {}) {
    return normalizeYouthTag(user) ? 'Youth' : 'Open';
  }

  const INTEREST_CATALOG = [
    { tag: 'AI/앱', category: 'Startup', keywords: ['AI', '앱', 'MVP', '자동화'] },
    { tag: '콘텐츠/미디어', category: 'Film', keywords: ['영상', '콘텐츠', '숏폼', '브랜드'] },
    { tag: '사회문제', category: 'Policy', keywords: ['지역', '정책', '캠페인', '문제해결'] },
    { tag: '교육', category: 'App', keywords: ['학습', '학교', '멘토링', '커뮤니티'] },
    { tag: '환경', category: 'Science', keywords: ['기후', '데이터', '측정', '캠페인'] },
    { tag: '커머스/브랜드', category: 'Startup', keywords: ['브랜드', '판매', '고객', '실험'] },
    { tag: '바이오/헬스', category: 'Science', keywords: ['건강', '바이오', '습관', '케어'] },
    { tag: '데이터/리서치', category: 'Science', keywords: ['데이터', '조사', '대시보드', '리서치'] }
  ];

  function normalizeInterestTags(input) {
    const allowed = new Set(INTEREST_CATALOG.map(i => i.tag));
    const arr = Array.isArray(input) ? input : String(input || '').split(',');
    return Array.from(new Set(arr.map(v => String(v || '').trim()).filter(v => allowed.has(v)))).slice(0, 8);
  }

  function isYouthProject(project, users = []) {
    const founder = users.find(u => u.id === project?.founderId);
    return !!(project?.youthProjectTag || (founder && normalizeYouthTag(founder)));
  }

  function uid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  const seedProjects = [
    {
      id: uid(),
      title: '지역상점 숏다큐 스튜디오 파일럿',
      category: 'Film',
      summary: '로컬 상점을 주제로 6주 안에 숏다큐 3편 제작·배포.',
      desc: '로컬 상점의 문제와 이야기를 짧은 다큐 형식으로 제작해 인스타·유튜브 쇼츠로 배포합니다. 프리프로덕션 2주, 촬영 2주, 후반/배포 2주로 운영합니다.\n\n단순 영상 제작이 아니라 조회·완시율·문의 전환 같은 반응 데이터를 함께 수집해 다음 포맷을 개선합니다.',
      status: '모집 중',
      teamSize: '4인이상',
      roles: '촬영 1 · 편집 2 · 배우 1',
      duration: '8주',
      image: 'https://picsum.photos/seed/wethus-film/1200/700',
      founderId: 'system',
      createdAt: new Date().toISOString()
    },
    {
      id: uid(),
      title: '고등학생 팀 협업 앱 MVP 실험',
      category: 'App',
      summary: '학교 프로젝트 운영 불편을 해결하는 앱 MVP 제작.',
      desc: '초기 인터뷰 10건을 통해 문제를 정의하고, 2주 단위로 기능 실험을 반복합니다. MVP 범위는 팀 모집/할 일/진행 체크 기능까지로 제한합니다.\n\n첫 스프린트는 사용자 플로우 설계, 두 번째 스프린트는 실제 프로토타입 배포를 목표로 합니다.',
      status: '기획 중',
      teamSize: '3인',
      roles: 'PM 1 · 프론트 1 · 디자이너 1',
      duration: '6주',
      image: 'https://picsum.photos/seed/wethus-app/1200/700',
      founderId: 'system',
      createdAt: new Date().toISOString()
    },
    {
      id: uid(),
      title: '교실 공기질 센서 데이터랩',
      category: 'Science',
      summary: '교실 CO2·미세먼지 측정 후 시각화 대시보드와 개선 제안 제작.',
      desc: '교실/복도/강당의 공기질 데이터를 직접 측정하고 시간대별 패턴을 분석합니다.\n\n최종 산출물은 시각화 리포트, 개선 액션 제안, 발표 자료 3종이며 학교 적용 가능성을 검증합니다.',
      status: '기획 중',
      teamSize: '3인',
      roles: '실험 1 · 데이터 1 · 문서 1',
      duration: '5주',
      image: 'https://picsum.photos/seed/wethus-science/1200/700',
      founderId: 'system',
      createdAt: new Date().toISOString()
    },
    {
      id: uid(),
      title: '통학 안전 데이터 제안팀',
      category: 'Policy',
      summary: '등하교 위험구간 데이터를 수집해 학교·지자체 제안서로 연결.',
      desc: '학생 제보, 지도 데이터, 현장 사진을 결합해 통학 위험구간을 지도화합니다. 인터뷰/리서치/문서/발표 파트를 나눠 실행합니다.\n\n산출물은 제안서 PDF, 발표 슬라이드, 위험구간 인포그래픽 3종입니다.',
      status: '기획 중',
      teamSize: '2인',
      roles: '리서처 2 · 문서 1 · 발표 1',
      duration: '5주',
      image: 'https://picsum.photos/seed/wethus-policy/1200/700',
      founderId: 'system',
      createdAt: new Date().toISOString()
    },
    {
      id: uid(),
      title: '교내 플라스틱 저감 실행 캠페인팀',
      category: 'Campaign',
      summary: '텀블러/리필 스테이션 실험으로 교내 플라스틱 사용량 감축 도전.',
      desc: '캠페인 메시지 설계, 참여형 챌린지, 오프라인 부스 운영까지 통합 진행합니다.\n\n주차별로 참여율과 감축량을 추적해 실제 행동 변화가 있는지 검증합니다.',
      status: '진행 중',
      teamSize: '4인이상',
      roles: '기획 1 · 영상 2 · 운영 1',
      duration: '7주',
      image: 'https://picsum.photos/seed/wethus-campaign/1200/700',
      founderId: 'system',
      createdAt: new Date().toISOString()
    },
    {
      id: uid(),
      title: '청소년 로컬 브랜드 런칭 실험',
      category: 'Startup',
      summary: '작은 제품을 실제 판매까지 연결하는 창업 실험.',
      desc: '아이템 선정부터 브랜딩, 판매 채널 테스트까지 6주 내 완료를 목표로 합니다.\n\n운영/디자인/콘텐츠 제작 역할을 모집합니다.',
      status: '피보팅',
      teamSize: '3인',
      roles: '브랜딩 1 · 운영 1 · 콘텐츠 2',
      duration: '6주',
      image: 'https://picsum.photos/seed/wethus-startup/1200/700',
      founderId: 'system',
      createdAt: new Date().toISOString()
    },
    {
      id: uid(),
      title: '청소년 전시/출판 크리에이티브 프로젝트',
      category: 'Creative',
      summary: '인터뷰 기반 아카이브 전시와 소책자 제작.',
      desc: '주제 리서치, 인터뷰, 에디토리얼 디자인, 전시 설치까지 경험하는 프로젝트입니다.\n\n글/디자인/촬영 파트가 함께 작업합니다.',
      status: '모집 중',
      teamSize: '1인',
      roles: '에디터 1 · 디자이너 1 · 촬영 1',
      duration: '8주',
      image: 'https://picsum.photos/seed/wethus-creative/1200/700',
      founderId: 'system',
      createdAt: new Date().toISOString()
    },
    {
      id: uid(),
      title: '청소년 사회문제 인터랙티브 웹다큐 팀',
      category: 'Film',
      summary: '인터뷰와 데이터 시각화를 결합한 웹다큐 제작.',
      desc: '기획-취재-편집을 3스프린트로 나눠 진행하며 최종 웹다큐 페이지 공개를 목표로 합니다.',
      status: '기획 중',
      teamSize: '3인',
      roles: '취재 1 · 편집 1 · 개발 1',
      duration: '7주',
      image: 'https://picsum.photos/seed/wethus-webdoc/1200/700',
      founderId: 'system',
      createdAt: new Date().toISOString()
    },
    {
      id: uid(),
      title: '동네 소상공인 방문경험 개선 스쿼드',
      category: 'Policy',
      summary: '학생 소비자 관점 인터뷰 기반으로 상점 방문경험 개선안 도출.',
      desc: '현장 인터뷰와 간단한 고객 여정 분석을 통해 동네 상점의 불편 포인트를 정리합니다.\n\n리포트와 함께 바로 실행 가능한 개선 체크리스트를 상점에 제안합니다.',
      status: '모집 중',
      teamSize: '2인',
      roles: '데이터 1 · 리서치 1 · 문서 1',
      duration: '6주',
      image: 'https://picsum.photos/seed/wethus-datalab/1200/700',
      founderId: 'system',
      createdAt: new Date().toISOString()
    },
    {
      id: uid(),
      title: '청소년 커뮤니티 서비스 브랜딩 스프린트',
      category: 'Startup',
      summary: '서비스 포지셔닝과 브랜드 키트 제작 단기 스프린트.',
      desc: '문제정의-브랜드메시지-랜딩검증까지 4주 스프린트로 빠르게 실험합니다.',
      status: '진행 중',
      teamSize: '3인',
      roles: '브랜딩 1 · 콘텐츠 1 · 운영 1',
      duration: '4주',
      image: 'https://picsum.photos/seed/wethus-brand/1200/700',
      founderId: 'system',
      createdAt: new Date().toISOString(),
      youthProjectTag: true,
      projectTrack: 'Youth'
    },
    {
      id: uid(),
      title: '청소년 다큐 사운드 디자인 랩',
      category: 'Film',
      summary: '현장음 수집과 사운드 편집 중심 단편 오디오팀',
      desc: '인터뷰 기반 다큐 프로젝트의 사운드 파트를 집중 운영합니다.',
      status: '모집 중',
      teamSize: '2인',
      roles: '사운드 1 · 편집 1',
      duration: '4주',
      image: 'https://picsum.photos/seed/wethus-film2/1200/700',
      founderId: 'system',
      createdAt: new Date().toISOString(),
      youthProjectTag: true,
      projectTrack: 'Youth'
    },
    {
      id: uid(),
      title: '청소년 지역문제 해결 앱 스쿼드',
      category: 'App',
      summary: '지역 불편 신고와 해결 추적 앱 MVP 팀',
      desc: '기획-디자인-프론트 개발로 1차 MVP를 5주 내 배포합니다.',
      status: '기획 중',
      teamSize: '3인',
      roles: '기획 1 · 디자인 1 · 개발 1',
      duration: '5주',
      image: 'https://picsum.photos/seed/wethus-app2/1200/700',
      founderId: 'system',
      createdAt: new Date().toISOString(),
      youthProjectTag: true,
      projectTrack: 'Youth'
    },
    {
      id: uid(),
      title: '청소년 기후데이터 실험실',
      category: 'Science',
      summary: '기후 데이터 수집·시각화 기반 탐구 보고서 팀',
      desc: '센서 측정 데이터와 공공데이터를 결합해 인사이트를 도출합니다.',
      status: '모집 중',
      teamSize: '3인',
      roles: '데이터 1 · 실험 1 · 문서 1',
      duration: '6주',
      image: 'https://picsum.photos/seed/wethus-science2/1200/700',
      founderId: 'system',
      createdAt: new Date().toISOString(),
      youthProjectTag: true,
      projectTrack: 'Youth'
    },
    {
      id: uid(),
      title: '청소년 복지정책 리서치 워킹그룹',
      category: 'Policy',
      summary: '현장 인터뷰 기반 청소년 복지 개선 제안팀',
      desc: '학교/지역 인터뷰를 토대로 정책 제안서와 요약 브리프를 제작합니다.',
      status: '기획 중',
      teamSize: '2인',
      roles: '리서치 1 · 문서 1',
      duration: '5주',
      image: 'https://picsum.photos/seed/wethus-policy2/1200/700',
      founderId: 'system',
      createdAt: new Date().toISOString(),
      youthProjectTag: true,
      projectTrack: 'Youth'
    },
    {
      id: uid(),
      title: '청소년 학교연계 인식개선 캠페인팀',
      category: 'Campaign',
      summary: '학교와 지역을 연결하는 오프라인 캠페인 프로젝트',
      desc: '캠페인 메시지 설계부터 콘텐츠 제작, 현장 운영까지 진행합니다.',
      status: '모집 중',
      teamSize: '4인이상',
      roles: '기획 1 · 콘텐츠 2 · 운영 1',
      duration: '6주',
      image: 'https://picsum.photos/seed/wethus-campaign2/1200/700',
      founderId: 'system',
      createdAt: new Date().toISOString(),
      youthProjectTag: true,
      projectTrack: 'Youth'
    },
    {
      id: uid(),
      title: '청소년 로컬굿즈 스타트업 프리팀',
      category: 'Startup',
      summary: '지역 스토리 기반 굿즈 실험 판매 프로젝트',
      desc: '브랜딩-제작-판매 테스트까지 작게 실행하는 창업 예비팀입니다.',
      status: '기획 중',
      teamSize: '3인',
      roles: '브랜딩 1 · 운영 1 · 제작 1',
      duration: '6주',
      image: 'https://picsum.photos/seed/wethus-startup2/1200/700',
      founderId: 'system',
      createdAt: new Date().toISOString(),
      youthProjectTag: true,
      projectTrack: 'Youth'
    },
    {
      id: uid(),
      title: '학생 창작 굿즈 마켓 파일럿',
      category: 'Creative',
      summary: '학생 창작물을 굿즈로 제작해 소규모 판매까지 검증하는 팀',
      desc: '일러스트·사진·문구 콘텐츠를 굿즈로 제작하고, 교내/플리마켓에서 실제 판매 반응을 테스트합니다.',
      status: '모집 중',
      teamSize: '3인',
      roles: '에디터 1 · 디자이너 1 · 촬영 1',
      duration: '7주',
      image: 'https://picsum.photos/seed/wethus-creative2/1200/700',
      founderId: 'system',
      createdAt: new Date().toISOString(),
      youthProjectTag: true,
      projectTrack: 'Youth'
    }
  ];

  const seedNotifications = [
    {
      id: uid(),
      type: 'team_request',
      title: '새 팀 참여 요청이 도착했습니다',
      body: '프로젝트 지원서를 확인해보세요.',
      sender: 'WETHUS',
      href: 'profile.html',
      unread: true,
      createdAt: new Date(Date.now() - 3600 * 1000 * 6).toISOString(),
      userId: null
    }
  ];

  function normalizeStatus(status) {
    const s = String(status || '').replace(/\s+/g, '');
    if (s === '구인중' || s === '모집중') return '모집 중';
    if (s === '팀빌딩' || s === '기획중' || s === '초기팀빌딩' || s === '검토대기') return '기획 중';
    if (s === '진행중') return '진행 중';
    if (s === '피보팅') return '피보팅';
    return '기획 중';
  }

  function normalizeCategory(category, title = '', summary = '') {
    const raw = String(category || '').trim();
    const c = raw.toLowerCase();
    const blob = `${String(title || '').toLowerCase()} ${String(summary || '').toLowerCase()}`;

    if (/^(startup|스타트업|창업|business|비즈니스|app|앱)$/i.test(raw)) return 'Startup';
    if (/^(film|영상|영화|creative|크리에이티브|art|예술|culture|문화|전시|출판)$/i.test(raw)) return 'Film';
    if (/^(policy|정책|law|법|society|사회)$/i.test(raw)) return 'Policy';
    if (/^(campaign|캠페인)$/i.test(raw)) return 'Campaign';
    if (/^(math|sci|science|research|data|수학|과학|연구|데이터)$/i.test(raw)) return 'Science';

    if (/(스타트업|창업|비즈니스|app|앱|mvp|startup|business)/.test(c)) return 'Startup';
    if (/(film|creative|art|culture|영화|영상|전시|출판|예술|문화)/.test(c)) return 'Film';
    if (/(policy|law|society|정책|법|사회)/.test(c)) return 'Policy';
    if (/(campaign|캠페인)/.test(c)) return 'Campaign';
    if (/(math|sci|science|research|data|수학|과학|연구|데이터|경진대회)/.test(c)) return 'Science';

    if (/(스타트업|창업|비즈니스|app|앱|mvp|startup|business)/.test(blob)) return 'Startup';
    if (/(영화|영상|전시|출판|예술|문화|film|creative|art|culture)/.test(blob)) return 'Film';
    if (/(정책|법|사회|policy|law|society)/.test(blob)) return 'Policy';
    if (/(캠페인|campaign)/.test(blob)) return 'Campaign';
    if (/(수학|과학|연구|데이터|경진대회|math|sci|science|research|data)/.test(blob)) return 'Science';

    return 'Startup';
  }

  function addDays(dateStr, days) {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function canonicalProjectCategory(category, title = '', summary = '') {
    const raw = String(category || '').trim();
    const c = raw.toLowerCase();
    const blob = `${String(title || '').toLowerCase()} ${String(summary || '').toLowerCase()}`;

    if (/^(startup|business)$/i.test(raw) || /^(startup|business)$/.test(c)) return 'Startup';
    if (/^(app|ai|mvp|product)$/i.test(raw) || /^(app|ai|mvp|product)$/.test(c)) return 'App';
    if (/^(film|movie|video)$/i.test(raw) || /^(film|movie|video)$/.test(c)) return 'Film';
    if (/^(creative|art|culture)$/i.test(raw) || /^(creative|art|culture)$/.test(c)) return 'Creative';
    if (/^(policy|law|society)$/i.test(raw) || /^(policy|law|society)$/.test(c)) return 'Policy';
    if (/^(campaign)$/i.test(raw) || /^(campaign)$/.test(c)) return 'Campaign';
    if (/^(science|research|math|sci|data)$/i.test(raw) || /^(science|research|math|sci|data)$/.test(c)) return 'Science';

    if (/(app|ai|mvp|product)/.test(c)) return 'App';
    if (/(startup|business)/.test(c)) return 'Startup';
    if (/(film|movie|video)/.test(c)) return 'Film';
    if (/(creative|art|culture|design|brand|exhibit|publish)/.test(c)) return 'Creative';
    if (/(policy|law|society)/.test(c)) return 'Policy';
    if (/(campaign)/.test(c)) return 'Campaign';
    if (/(science|research|math|sci|data)/.test(c)) return 'Science';

    if (/(app|ai|mvp|product)/.test(blob)) return 'App';
    if (/(startup|business)/.test(blob)) return 'Startup';
    if (/(film|movie|video)/.test(blob)) return 'Film';
    if (/(creative|art|culture|design|brand|exhibit|publish)/.test(blob)) return 'Creative';
    if (/(policy|law|society)/.test(blob)) return 'Policy';
    if (/(campaign)/.test(blob)) return 'Campaign';
    if (/(science|research|math|sci|data)/.test(blob)) return 'Science';

    return normalizeCategory(category, title, summary);
  }

  function normalizeThemeCategory(category, title = '', summary = '') {
    const normalized = canonicalProjectCategory(category, title, summary);
    if (normalized === 'Science') return 'MathSci';
    if (normalized === 'Film' || normalized === 'Creative') return 'ArtCulture';
    if (normalized === 'Policy' || normalized === 'Campaign') return 'SocietyLaw';
    return 'StartupBusiness';
  }

  function defaultTeamForProject(title, founderName) {
    const leader = { id: uid(), name: founderName || '대표', role: '대표', bio: '프로젝트 리딩 및 의사결정', isLeader: true };
    const presets = {
      '지역상점 숏다큐 스튜디오 파일럿': [
        leader,
        { id: uid(), name: '서진', role: '촬영', bio: '다큐/숏폼 촬영 경험' },
        { id: uid(), name: '민재', role: '편집', bio: '프리미어/다빈치 편집' },
        { id: uid(), name: '하린', role: '배우', bio: '연기 워크숍 참여' }
      ],
      '고등학생 팀 협업 앱 MVP 실험': [
        leader,
        { id: uid(), name: '유진', role: '디자인', bio: '모바일 UX 설계' },
        { id: uid(), name: '도윤', role: '프론트', bio: 'React/Next 개발' }
      ],
      '통학 안전 데이터 제안팀': [
        leader,
        { id: uid(), name: '지우', role: '리서치', bio: '데이터 정리/인터뷰' },
        { id: uid(), name: '현서', role: '문서', bio: '보고서 작성/편집' }
      ]
    };
    return presets[title] || [
      leader,
      { id: uid(), name: '가온', role: '운영', bio: '프로젝트 운영 지원' },
      { id: uid(), name: '로아', role: '콘텐츠', bio: '콘텐츠 기획/제작' }
    ];
  }

  function load() {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const init = {
        users: [],
        projects: seedProjects,
        currentUserId: null,
        devMode: false,
        applications: [],
        planRequests: [],
        bookmarks: [],
        profileFollows: [],
        notifications: seedNotifications,
        dmThreads: [
          {
            id: uid(),
            targetName: '운영팀',
            messages: [{ id: uid(), from: 'WETHUS', text: 'WETHUS에 오신 걸 환영합니다. 최신 공지와 승인은 여기로 안내됩니다.', createdAt: new Date().toISOString() }]
          }
        ],
        agents: [],
        agentActivityLogs: [],
        semanticEvents: [],
        asks: [],
        offers: [],
        connections: [],
        incomingConnections: [],
        geminiApiKey: ''
      };
      localStorage.setItem(KEY, JSON.stringify(init));
      return init;
    }
    const parsed = JSON.parse(raw);
    if (!parsed.geminiApiKey) parsed.geminiApiKey = '';
    if (!Array.isArray(parsed.applications)) parsed.applications = [];
    if (!Array.isArray(parsed.planRequests)) parsed.planRequests = [];
    if (!Array.isArray(parsed.bookmarks)) parsed.bookmarks = [];
    if (!Array.isArray(parsed.profileFollows)) parsed.profileFollows = [];
    if (!Array.isArray(parsed.notifications)) parsed.notifications = [];
    parsed.notifications = parsed.notifications.filter(n => !(n?.type === 'founder_submitted' && n?.userId == null));
    if (!parsed.notifications.length) {
      parsed.notifications = seedNotifications.slice();
    }

    if (!Array.isArray(parsed.dmThreads)) parsed.dmThreads = [];
    if (!parsed.dmThreads.length) {
      parsed.dmThreads = [
        {
          id: uid(),
          targetName: '운영팀',
          messages: [{ id: uid(), from: 'WETHUS', text: 'WETHUS에 오신 걸 환영합니다. 최신 공지와 승인은 여기로 안내됩니다.', createdAt: new Date().toISOString() }]
        }
      ];
    }

    if (!Array.isArray(parsed.agents)) parsed.agents = [];
    if (!Array.isArray(parsed.agentActivityLogs)) parsed.agentActivityLogs = [];
    if (!Array.isArray(parsed.semanticEvents)) parsed.semanticEvents = [];
    if (!Array.isArray(parsed.asks)) parsed.asks = [];
    if (!Array.isArray(parsed.offers)) parsed.offers = [];
    if (!Array.isArray(parsed.connections)) parsed.connections = [];
    if (!Array.isArray(parsed.incomingConnections)) parsed.incomingConnections = [];

    if (!Array.isArray(parsed.projects)) parsed.projects = [];
    let changed = false;

    if (Array.isArray(parsed.users)) {
      parsed.users = parsed.users.map(u => {
        const next = { ...u };
        if (!next.plan) next.plan = 'free';
        if (next.plan === 'master') next.plan = 'pro';
        // 기존 사용자 데이터(과거 버전)는 온보딩 완료로 간주해 강제 리다이렉트를 방지
        if (next.onboardingComplete === undefined) next.onboardingComplete = true;
        if (next.age === undefined) next.age = null;
        if (next.ageVerifiedAt === undefined) next.ageVerifiedAt = null;
        if (next.youthTag === undefined) next.youthTag = normalizeYouthTag(next);
        if (next.userTrack === undefined) next.userTrack = getUserTrack(next);
        if (next.school === undefined) next.school = '';
        if (next.careerRaw === undefined) next.careerRaw = '';
        if (next.careerSummary === undefined) next.careerSummary = '';
        if (next.headline === undefined) next.headline = '';
        if (next.lookingFor === undefined) next.lookingFor = '';
        if (next.portfolioHighlights === undefined) next.portfolioHighlights = '';
        if (next.startupBelief === undefined) next.startupBelief = '';
        if (next.profileUpdatedAt === undefined) next.profileUpdatedAt = next.createdAt || null;
        next.interestTags = normalizeInterestTags(next.interestTags || next.interests || []);
        Object.assign(next, normalizeProfileLinks(next));
        return next;
      });
    }

    const likePreset = {
      '지역상점 숏다큐 스튜디오 파일럿': 42,
      '고등학생 팀 협업 앱 MVP 실험': 35,
      '통학 안전 데이터 제안팀': 28,
      '교내 플라스틱 저감 실행 캠페인팀': 24,
      '청소년 로컬 브랜드 런칭 실험': 20,
      '청소년 전시/출판 크리에이티브 프로젝트': 18
    };

    parsed.projects = parsed.projects.map(p => {
      const next = { ...p };
      if (typeof next.likes !== 'number') {
        next.likes = likePreset[next.title] ?? Math.floor(Math.random() * 12) + 3;
        changed = true;
      }
      if (!Array.isArray(next.comments)) {
        next.comments = [];
        changed = true;
      }
      if (!Array.isArray(next.likedBy)) {
        next.likedBy = [];
        changed = true;
      }
      if (!Array.isArray(next.teamMembers) || !next.teamMembers.length) {
        next.teamMembers = defaultTeamForProject(next.title, '대표');
        changed = true;
      }
      if (!next.teamSize) {
        const pool = ['1인', '2인', '3인', '4인이상'];
        next.teamSize = pool[Math.floor(Math.random() * pool.length)];
        changed = true;
      }
      const normalized = normalizeStatus(next.status);
      if (normalized !== next.status) {
        next.status = normalized;
        changed = true;
      }
      const normalizedCategory = canonicalProjectCategory(next.category, next.title, next.summary || next.fullDescription || '');
      if (normalizedCategory !== next.category) {
        next.category = normalizedCategory;
        changed = true;
      }
      const normalizedThemeCategory = normalizeThemeCategory(next.category, next.title, next.summary || next.fullDescription || '');
      if (normalizedThemeCategory !== next.normalizedCategory) {
        next.normalizedCategory = normalizedThemeCategory;
        changed = true;
      }
      if (!next.status) {
        const stages = ['모집 중', '기획 중', '진행 중', '피보팅'];
        next.status = stages[Math.floor(Math.random() * stages.length)];
        changed = true;
      }
      if (!next.moderationStatus) {
        next.moderationStatus = 'approved';
        changed = true;
      }
      if (next.moderationReason === undefined) {
        next.moderationReason = '';
        changed = true;
      }
      if (!next.startDate) {
        next.startDate = String(next.createdAt || new Date().toISOString()).slice(0, 10);
        changed = true;
      }
      if (typeof next.ongoingNow !== 'boolean') {
        if (next.endDate) {
          next.ongoingNow = false;
        } else if (next.status === '진행 중' || next.status === '피보팅') {
          next.ongoingNow = true;
        } else {
          next.endDate = addDays(next.startDate, 56);
          next.ongoingNow = false;
        }
        changed = true;
      }
      if (next.ongoingNow && next.endDate) {
        next.endDate = null;
        changed = true;
      }
      const rawCategory = String(next.category || '').trim();
      const cleanedCategory = sanitizeCategoryName(rawCategory);
      if (cleanedCategory !== rawCategory) {
        next.category = cleanedCategory || '기타';
        changed = true;
      }
      const founder = Array.isArray(parsed.users) ? parsed.users.find(u => u.id === next.founderId) : null;
      if (!next.founderEmail && founder?.email) {
        next.founderEmail = String(founder.email).toLowerCase();
        changed = true;
      }
      if (next.youthProjectTag === undefined) {
        next.youthProjectTag = next.founderId === 'system' ? true : !!(founder && normalizeYouthTag(founder));
        changed = true;
      }
      if (next.projectTrack === undefined && next.youthProjectTag) {
        next.projectTrack = 'Youth';
        changed = true;
      }
      return next;
    });

    if (changed) localStorage.setItem(KEY, JSON.stringify(parsed));

    return parsed;
  }

  function save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function appendSemanticEvent(state, input = {}) {
    const targetState = state && typeof state === 'object' ? state : load();
    targetState.semanticEvents = Array.isArray(targetState.semanticEvents) ? targetState.semanticEvents : [];
    const actorId = String(input.actorId || targetState.currentUserId || (targetState.devMode ? 'dev-temp' : '')).trim() || null;
    const event = {
      id: input.id || uid(),
      actorId,
      action: String(input.action || 'activity_recorded').trim(),
      targetType: String(input.targetType || 'activity').trim(),
      targetId: String(input.targetId || '').trim() || null,
      projectId: String(input.projectId || '').trim() || null,
      organizationId: String(input.organizationId || '').trim() || null,
      context: String(input.context || '').trim() || null,
      source: String(input.source || 'wethus').trim(),
      visibility: String(input.visibility || 'network').trim(),
      metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {},
      occurredAt: input.occurredAt || new Date().toISOString(),
      schemaVersion: 1
    };
    targetState.semanticEvents.unshift(event);
    targetState.semanticEvents = targetState.semanticEvents.slice(0, 1000);
    return event;
  }

  function recordSemanticEvent(input = {}) {
    const s = load();
    const event = appendSemanticEvent(s, input);
    save(s);
    scheduleCloudSync('semantic-event');
    return event;
  }

  function listSemanticEvents(options = {}) {
    const s = load();
    const actorId = String(options.actorId || '').trim();
    const projectId = String(options.projectId || '').trim();
    const actions = Array.isArray(options.actions) ? new Set(options.actions.map(String)) : null;
    const limit = Math.max(1, Math.min(200, Number(options.limit || 50)));
    return (s.semanticEvents || [])
      .filter((event) => !actorId || String(event?.actorId || '') === actorId)
      .filter((event) => !projectId || String(event?.projectId || '') === projectId)
      .filter((event) => !actions || actions.has(String(event?.action || '')))
      .sort((a, b) => new Date(b?.occurredAt || 0) - new Date(a?.occurredAt || 0))
      .slice(0, limit);
  }

  function createAsk(payload = {}) {
    const s = load();
    const actorId = s.currentUserId || (s.devMode ? 'dev-temp' : null);
    if (!actorId) throw new Error('로그인이 필요합니다.');
    const text = String(payload.text || '').trim();
    if (!text) throw new Error('필요한 도움을 입력해주세요.');
    s.asks = Array.isArray(s.asks) ? s.asks : [];
    const ask = {
      id: uid(),
      actorId,
      projectId: String(payload.projectId || '').trim() || null,
      text,
      category: String(payload.category || 'General').trim(),
      due: String(payload.due || '일정 무관').trim(),
      visibility: String(payload.visibility || 'network').trim(),
      status: 'open',
      createdAt: new Date().toISOString(),
      resolvedAt: null
    };
    s.asks.unshift(ask);
    appendSemanticEvent(s, {
      actorId,
      action: 'ask_created',
      targetType: 'ask',
      targetId: ask.id,
      projectId: ask.projectId,
      visibility: ask.visibility,
      metadata: { text: ask.text, category: ask.category, due: ask.due }
    });
    save(s);
    scheduleCloudSync('ask-created');
    return ask;
  }

  function listAsks(options = {}) {
    const s = load();
    const actorId = String(options.actorId || '').trim();
    const status = String(options.status || '').trim();
    return (s.asks || [])
      .filter((ask) => !actorId || String(ask?.actorId || '') === actorId)
      .filter((ask) => !status || String(ask?.status || '') === status)
      .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));
  }

  function updateAskStatus(askId, status = 'resolved') {
    const s = load();
    const actorId = s.currentUserId || (s.devMode ? 'dev-temp' : null);
    const ask = (s.asks || []).find((item) => String(item?.id || '') === String(askId || ''));
    if (!ask) return null;
    if (String(ask.actorId || '') !== String(actorId || '') && !isAdminActor()) throw new Error('ASK 수정 권한이 없습니다.');
    ask.status = status;
    ask.resolvedAt = status === 'resolved' ? new Date().toISOString() : null;
    appendSemanticEvent(s, {
      actorId,
      action: status === 'resolved' ? 'ask_answered' : 'ask_updated',
      targetType: 'ask',
      targetId: ask.id,
      projectId: ask.projectId,
      visibility: ask.visibility,
      metadata: { status }
    });
    save(s);
    scheduleCloudSync('ask-updated');
    return ask;
  }

  function createOffer(payload = {}) {
    const s = load();
    const actorId = s.currentUserId || (s.devMode ? 'dev-temp' : null);
    if (!actorId) throw new Error('로그인이 필요합니다.');
    const text = String(payload.text || '').trim();
    if (!text) throw new Error('도울 수 있는 내용을 입력해주세요.');
    s.offers = Array.isArray(s.offers) ? s.offers : [];
    const offer = {
      id: uid(),
      actorId,
      text,
      category: String(payload.category || 'General').trim(),
      availability: String(payload.availability || '협의 가능').trim(),
      visibility: String(payload.visibility || 'network').trim(),
      status: 'active',
      createdAt: new Date().toISOString()
    };
    s.offers.unshift(offer);
    appendSemanticEvent(s, {
      actorId,
      action: 'offer_created',
      targetType: 'offer',
      targetId: offer.id,
      visibility: offer.visibility,
      metadata: { text: offer.text, category: offer.category, availability: offer.availability }
    });
    save(s);
    scheduleCloudSync('offer-created');
    return offer;
  }

  function listOffers(options = {}) {
    const s = load();
    const actorId = String(options.actorId || '').trim();
    return (s.offers || [])
      .filter((offer) => !actorId || String(offer?.actorId || '') === actorId)
      .filter((offer) => options.includeInactive || String(offer?.status || '') === 'active')
      .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));
  }

  function publicNetworkPerson(user = {}) {
    const id = String(user?.id || '').trim();
    if (!id) return null;
    return {
      id,
      name: String(user?.name || user?.nickname || 'WETHUS 사용자').trim(),
      nickname: String(user?.nickname || '').trim(),
      headline: String(user?.headline || '').trim(),
      bio: String(user?.bio || '').trim(),
      school: String(user?.school || '').trim(),
      major: String(user?.major || '').trim(),
      lookingFor: String(user?.lookingFor || '').trim(),
      portfolioHighlights: String(user?.portfolioHighlights || '').trim(),
      interestTags: Array.isArray(user?.interestTags) ? user.interestTags.slice(0, 8) : [],
      skills: Array.isArray(user?.skills) ? user.skills.slice(0, 12) : [],
      profileImage: String(user?.profileImage || '').trim(),
      instagramUrl: String(user?.instagramUrl || '').trim(),
      githubUrl: String(user?.githubUrl || '').trim(),
      linkedinUrl: String(user?.linkedinUrl || '').trim(),
      portfolioUrl: String(user?.portfolioUrl || '').trim(),
      profileUpdatedAt: user?.profileUpdatedAt || user?.updatedAt || user?.createdAt || ''
    };
  }

  function readNetworkPeopleCache() {
    try {
      const parsed = JSON.parse(localStorage.getItem(NETWORK_PEOPLE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.map(publicNetworkPerson).filter(Boolean) : [];
    } catch (_) {
      return [];
    }
  }

  function listNetworkPeople(options = {}) {
    const s = load();
    const actorId = String(options.actorId || currentActorId() || '').trim();
    const query = String(options.query || '').trim().toLowerCase();
    const role = String(options.role || '').trim().toLowerCase();
    const map = new Map();
    [...readNetworkPeopleCache(), ...(Array.isArray(s.users) ? s.users : [])].forEach((user) => {
      const person = publicNetworkPerson(user);
      if (!person || person.id === actorId) return;
      map.set(person.id, { ...(map.get(person.id) || {}), ...person });
    });
    return Array.from(map.values())
      .filter((person) => {
        if (!query) return true;
        return [person.name, person.nickname, person.headline, person.bio, person.school, person.major, person.lookingFor, ...(person.interestTags || []), ...(person.skills || [])]
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .filter((person) => !role || [person.headline, person.lookingFor, ...(person.interestTags || []), ...(person.skills || [])].join(' ').toLowerCase().includes(role))
      .sort((a, b) => new Date(b?.profileUpdatedAt || 0) - new Date(a?.profileUpdatedAt || 0));
  }

  async function refreshNetworkPeople(options = {}) {
    if (IS_NETWORK_PREVIEW) return listNetworkPeople(options);
    const bases = Array.from(new Set(CLOUD_BASE_CANDIDATES));
    const query = String(options.query || '').trim();
    for (const base of bases) {
      try {
        const url = new URL('/network/people', base);
        if (query) url.searchParams.set('q', query);
        const headers = IS_LOCAL_WETHUS && currentActorId() ? { 'x-user-id': currentActorId() } : {};
        const response = await fetch(url.toString(), { credentials: 'include', headers });
        if (!response.ok) continue;
        const payload = await response.json().catch(() => ({}));
        const people = Array.isArray(payload?.people) ? payload.people.map(publicNetworkPerson).filter(Boolean) : [];
        localStorage.setItem(NETWORK_PEOPLE_KEY, JSON.stringify(people.slice(0, 200)));
        return listNetworkPeople(options);
      } catch (_) {}
    }
    return listNetworkPeople(options);
  }

  function postNetworkAction(pathname, body = {}) {
    if (IS_NETWORK_PREVIEW) return Promise.resolve({ ok: true, preview: true });
    const bases = Array.from(new Set(CLOUD_BASE_CANDIDATES));
    return (async () => {
      let lastError = null;
      for (const base of bases) {
        try {
          const headers = { 'Content-Type': 'application/json' };
          if (IS_LOCAL_WETHUS && currentActorId()) headers['x-user-id'] = currentActorId();
          const response = await fetch(new URL(pathname, base).toString(), {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify(body)
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || payload?.ok === false) throw new Error(payload?.error || `network request failed (${response.status})`);
          return payload;
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError || new Error('network request failed');
    })();
  }

  function toggleConnection(targetUserId) {
    const s = load();
    const actorId = s.currentUserId || (s.devMode ? 'dev-temp' : null);
    const targetId = String(targetUserId || '').trim();
    if (!actorId) throw new Error('로그인이 필요합니다.');
    if (!targetId || targetId === String(actorId)) throw new Error('연결할 사용자를 확인해주세요.');
    s.connections = Array.isArray(s.connections) ? s.connections : [];
    const index = s.connections.findIndex((item) => String(item?.actorId || '') === String(actorId) && String(item?.targetUserId || '') === targetId);
    let connected = false;
    let row = null;
    if (index >= 0) {
      row = s.connections[index];
      s.connections.splice(index, 1);
      appendSemanticEvent(s, {
        actorId,
        action: 'connection_cancelled',
        targetType: 'person',
        targetId,
        visibility: 'private'
      });
    } else {
      row = { id: uid(), actorId, targetUserId: targetId, status: 'requested', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      s.connections.unshift(row);
      connected = true;
      appendSemanticEvent(s, {
        actorId,
        action: 'connection_created',
        targetType: 'person',
        targetId,
        visibility: 'private'
      });
    }
    save(s);
    scheduleCloudSync('connection-toggled');
    postNetworkAction('/network/connections/toggle', {
      requestId: row?.id || '',
      targetUserId: targetId,
      connected
    }).catch(() => {});
    return { connected, connection: connected ? row : null };
  }

  function listConnections(options = {}) {
    const s = load();
    const actorId = String(options.actorId || s.currentUserId || '').trim();
    const direction = String(options.direction || 'outgoing').toLowerCase();
    if (direction === 'incoming') {
      return (s.incomingConnections || []).filter((item) => !actorId || String(item?.targetUserId || '') === actorId);
    }
    return (s.connections || []).filter((item) => !actorId || String(item?.actorId || '') === actorId);
  }

  function respondToConnection(requestId, status) {
    const normalized = status === 'accepted' ? 'accepted' : 'declined';
    const s = load();
    const actorId = currentActorId();
    const row = (s.incomingConnections || []).find((item) => String(item?.id || '') === String(requestId || ''));
    if (!row || String(row?.targetUserId || '') !== String(actorId || '')) throw new Error('연결 요청을 찾을 수 없습니다.');
    row.status = normalized;
    row.updatedAt = new Date().toISOString();
    appendSemanticEvent(s, {
      actorId,
      action: normalized === 'accepted' ? 'connection_accepted' : 'connection_declined',
      targetType: 'person',
      targetId: row.actorId,
      visibility: 'private'
    });
    save(s);
    scheduleCloudSync('connection-response');
    postNetworkAction('/network/connections/respond', { requestId: row.id, status: normalized }).catch(() => {});
    return { ...row };
  }

  async function refreshNetworkConnections() {
    if (IS_NETWORK_PREVIEW) return {
      outgoing: listConnections({ direction: 'outgoing' }),
      incoming: listConnections({ direction: 'incoming' })
    };
    const bases = Array.from(new Set(CLOUD_BASE_CANDIDATES));
    for (const base of bases) {
      try {
        const headers = IS_LOCAL_WETHUS && currentActorId() ? { 'x-user-id': currentActorId() } : {};
        const response = await fetch(new URL('/network/connections', base).toString(), { credentials: 'include', headers });
        if (!response.ok) continue;
        const payload = await response.json().catch(() => ({}));
        const s = load();
        if (Array.isArray(payload?.outgoing)) s.connections = payload.outgoing;
        if (Array.isArray(payload?.incoming)) s.incomingConnections = payload.incoming;
        save(s);
        return { outgoing: s.connections || [], incoming: s.incomingConnections || [] };
      } catch (_) {}
    }
    return {
      outgoing: listConnections({ direction: 'outgoing' }),
      incoming: listConnections({ direction: 'incoming' })
    };
  }

  function normalizeProfileText(value) {
    return String(value || '').trim();
  }

  function normalizeProfileLinks(raw = {}) {
    const normalize = (value) => {
      const text = String(value || '').trim();
      if (!text) return '';
      if (/^https?:\/\//i.test(text)) return text;
      if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(text)) return `https://${text}`;
      return '';
    };
    return {
      instagramUrl: normalize(raw.instagramUrl),
      githubUrl: normalize(raw.githubUrl),
      linkedinUrl: normalize(raw.linkedinUrl),
      portfolioUrl: normalize(raw.portfolioUrl)
    };
  }

  function findUserProfile(ref = {}) {
    const s = load();
    const users = Array.isArray(s.users) ? s.users : [];
    const idCandidates = [ref?.userId, ref?.id].map((value) => String(value || '').trim()).filter(Boolean);
    if (idCandidates.length) {
      const byId = users.find((user) => idCandidates.includes(String(user?.id || '').trim()));
      if (byId) return byId;
    }
    const nameCandidates = [ref?.name, ref?.nickname].map((value) => String(value || '').trim()).filter(Boolean);
    if (!nameCandidates.length) return null;
    return users.find((user) => {
      const userName = String(user?.name || '').trim();
      const userNickname = String(user?.nickname || '').trim();
      return nameCandidates.includes(userName) || nameCandidates.includes(userNickname);
    }) || null;
  }

  function getProfileProofSummary(ref = {}) {
    const user = findUserProfile(ref) || null;
    const source = user || ref || {};
    const links = normalizeProfileLinks(source);
    const externalLinks = [
      { label: 'Portfolio', href: links.portfolioUrl },
      { label: 'GitHub', href: links.githubUrl },
      { label: 'LinkedIn', href: links.linkedinUrl },
      { label: 'Instagram', href: links.instagramUrl }
    ].filter((item) => item.href);
    const proofLines = String(source.portfolioHighlights || source.careerSummary || '')
      .split('\n')
      .map((line) => line.replace(/^[•\-]\s*/, '').trim())
      .filter(Boolean);
    const publicProjects = user
      ? listProjects({ includePending: true, includeRejected: false }).filter((project) => {
          if (!project) return false;
          const founderMatch = String(project.founderId || '').trim() === String(user.id || '').trim();
          const founderNameMatch = String(project.founderName || '').trim() === String(user.name || '').trim();
          const memberMatch = Array.isArray(project.teamMembers) && project.teamMembers.some((member) => {
            const memberId = String(member?.userId || member?.id || '').trim();
            const memberName = String(member?.name || '').trim();
            return memberId === String(user.id || '').trim() || memberName === String(user.name || '').trim();
          });
          return founderMatch || founderNameMatch || memberMatch;
        })
      : [];
    const approvedProjects = publicProjects.filter((project) => String(project?.moderationStatus || 'approved') === 'approved');
    const projectLikes = publicProjects.reduce((sum, project) => sum + Number(project?.likes || 0), 0);
    const projectComments = publicProjects.reduce((sum, project) => sum + (Array.isArray(project?.comments) ? project.comments.length : 0), 0);
    const signalChecks = [
      { key: 'headline', label: '한 줄 소개', ready: !!String(source.headline || source.bio || '').trim() },
      { key: 'proof', label: '실행 근거', ready: proofLines.length >= 2 },
      { key: 'links', label: '외부 링크', ready: externalLinks.length >= 1 },
      { key: 'projects', label: '프로젝트 기록', ready: approvedProjects.length >= 1 },
      { key: 'school', label: '학교/소속', ready: !!String(source.school || '').trim() },
      { key: 'response', label: '프로젝트 반응', ready: projectLikes + projectComments > 0 },
      { key: 'founder', label: 'Founder 인증', ready: !!source.founderVerified }
    ];
    const readySignals = signalChecks.filter((item) => item.ready);
    const suggestedSignals = signalChecks.filter((item) => !item.ready);
    return {
      hasProfile: !!user,
      userId: String(user?.id || ref?.userId || ref?.id || '').trim(),
      headline: String(source.headline || source.bio || '').trim(),
      proofCount: proofLines.length,
      externalLinkCount: externalLinks.length,
      externalLinkLabels: externalLinks.map((item) => item.label),
      featuredLinkLabel: externalLinks[0]?.label || '',
      featuredLinkHref: externalLinks[0]?.href || '',
      projectCount: publicProjects.length,
      approvedProjectCount: approvedProjects.length,
      reactionCount: projectLikes + projectComments,
      founderVerified: !!source.founderVerified,
      school: String(source.school || '').trim(),
      evidenceCount: readySignals.length,
      evidenceTotal: signalChecks.length,
      evidenceSignals: signalChecks.map(({ key, label, ready }) => ({ key, label, ready })),
      suggestedEvidenceLabels: suggestedSignals.map((item) => item.label)
    };
  }

  function getState() {
    return load();
  }

  function setCurrentUser(userId, devMode = false) {
    const s = load();
    s.currentUserId = userId;
    s.devMode = devMode;
    save(s);
  }

  function ensureLocalDevUser(options = {}) {
    const isLocal = typeof location !== 'undefined' && ['localhost', '127.0.0.1'].includes(location.hostname);
    if (!isLocal && options.force !== true) throw new Error('Local dev login is only available on localhost.');
    const s = load();
    const requestedId = String(options.id || 'dev-temp').trim() || 'dev-temp';
    let user = s.users.find(u => String(u.id || '') === requestedId);
    if (!user) {
      user = {
        id: requestedId,
        name: options.name || 'WETHUS Local Tester',
        nickname: options.nickname || 'LocalTester',
        email: options.email || 'local.tester@wethus.dev',
        password: '',
        passwordHash: '',
        bio: 'Local development account for browser QA.',
        founderVerified: true,
        profileImage: '',
        plan: 'master',
        age: 19,
        ageVerifiedAt: new Date().toISOString(),
        youthTag: true,
        userTrack: 'Youth',
        school: 'WETHUS Lab',
        careerRaw: '',
        careerSummary: 'Local QA account',
        headline: 'WETHUS local test founder',
        startupBelief: '',
        lookingFor: '',
        portfolioHighlights: '',
        interestTags: ['AI/Tech', 'Startup'],
        instagramUrl: '',
        githubUrl: '',
        linkedinUrl: '',
        portfolioUrl: '',
        onboardingComplete: true,
        createdAt: new Date().toISOString()
      };
      s.users.push(user);
    } else {
      user.onboardingComplete = true;
      user.plan = user.plan || 'master';
      user.founderVerified = true;
      user.email = user.email || options.email || 'local.tester@wethus.dev';
      user.nickname = user.nickname || options.nickname || 'LocalTester';
      user.name = user.name || options.name || 'WETHUS Local Tester';
      user.interestTags = normalizeInterestTags(user.interestTags || ['AI/Tech', 'Startup']);
    }
    s.currentUserId = user.id;
    s.devMode = true;
    save(s);
    return user;
  }

  function logout() {
    const s = load();
    s.currentUserId = null;
    s.devMode = false;
    save(s);
    try {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('wethus.hub.selected.')) localStorage.removeItem(k);
      });
    } catch (_) {}
    const base = currentCloudApiBase();
    if (base) {
      fetch(`${String(base).replace(/\/$/, '')}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      }).catch(() => {});
    }
  }

  function currentUser() {
    const s = load();
    return s.users.find(u => u.id === s.currentUserId) || null;
  }

  function currentPlan() {
    const u = currentUser();
    return u?.plan || 'free';
  }

  function setCurrentUserPlan(plan) {
    const s = load();
    const u = s.users.find(x => x.id === s.currentUserId);
    if (!u) return false;
    const p = String(plan || 'free').toLowerCase();
    if (p === 'premium') u.plan = 'premium';
    else if (p === 'pro') u.plan = 'pro';
    else if (p === 'master') u.plan = 'master';
    else u.plan = 'free';
    save(s);
    return true;
  }

  function listPlanRequests(options = {}) {
    const s = load();
    const actor = currentActorId();
    const requestedPlan = String(options?.plan || '').trim().toLowerCase();
    const mineOnly = options?.mineOnly !== false;
    return (Array.isArray(s.planRequests) ? s.planRequests : [])
      .filter((request) => {
        if (!request) return false;
        if (mineOnly && actor && request.userId !== actor) return false;
        if (requestedPlan && String(request.requestedPlan || '').toLowerCase() !== requestedPlan) return false;
        return true;
      })
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
  }

  function requestPlanUpgrade(plan, note = '') {
    const s = load();
    const actor = currentActorId();
    if (!actor) throw new Error('로그인이 필요합니다.');
    const user = currentUser();
    if (!user) throw new Error('사용자 정보를 찾을 수 없습니다.');
    const requestedPlan = String(plan || '').trim().toLowerCase();
    if (!['premium', 'pro', 'master'].includes(requestedPlan)) {
      throw new Error('요청 가능한 플랜이 아닙니다.');
    }
    s.planRequests = Array.isArray(s.planRequests) ? s.planRequests : [];
    const existing = s.planRequests.find((request) =>
      request?.userId === actor &&
      String(request?.requestedPlan || '').toLowerCase() === requestedPlan &&
      String(request?.status || '').toLowerCase() === 'pending'
    );
    if (existing) return existing;

    const now = new Date().toISOString();
    const request = {
      id: uid(),
      userId: actor,
      userEmail: String(user.email || '').trim().toLowerCase(),
      userName: user.nickname || user.name || '사용자',
      currentPlan: currentPlan(),
      requestedPlan,
      note: String(note || '').trim(),
      status: 'pending',
      createdAt: now,
      updatedAt: now
    };
    s.planRequests.unshift(request);
    s.notifications = s.notifications || [];
    s.notifications.unshift({
      id: uid(),
      type: 'plan_request_submitted',
      title: `${requestedPlan.toUpperCase()} 플랜 요청 접수`,
      body: '운영팀이 요청 내용을 검토한 뒤 계정 상태를 안내합니다.',
      href: 'pricing.html',
      sender: 'WETHUS 운영팀',
      unread: true,
      createdAt: now,
      userId: actor
    });
    s.notifications.unshift({
      id: uid(),
      type: 'plan_request_admin',
      title: `${requestedPlan.toUpperCase()} 플랜 요청 도착`,
      body: `${request.userName} · ${request.userEmail || '이메일 없음'}${request.note ? ` · 메모: ${request.note}` : ''}`,
      href: 'pricing.html',
      sender: 'WETHUS',
      unread: true,
      createdAt: now,
      userId: ADMIN_MODE_USER_ID
    });
    save(s);
    if (request.userEmail) syncCloudState(request.userEmail).catch(() => {});
    return request;
  }

  function localPasswordSalt(user) {
    return `${String(user?.id || '')}:${String(user?.email || '').trim().toLowerCase()}`;
  }

  async function sha256Hex(text) {
    if (!window.crypto?.subtle || typeof TextEncoder === 'undefined') {
      throw new Error('이 브라우저에서는 안전한 로컬 비밀번호 저장을 사용할 수 없습니다.');
    }
    const bytes = new TextEncoder().encode(String(text || ''));
    const digest = await window.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function makeLocalPasswordHash(user, password) {
    return `local_sha256$${await sha256Hex(`${localPasswordSalt(user)}:${String(password || '')}`)}`;
  }

  function constantTimeTextEqual(a, b) {
    const left = String(a || '');
    const right = String(b || '');
    let diff = left.length ^ right.length;
    const max = Math.max(left.length, right.length);
    for (let i = 0; i < max; i += 1) {
      diff |= left.charCodeAt(i % left.length || 0) ^ right.charCodeAt(i % right.length || 0);
    }
    return diff === 0;
  }

  async function verifyLocalPassword(user, password) {
    if (!user?.passwordHash) return false;
    return constantTimeTextEqual(user.passwordHash, await makeLocalPasswordHash(user, password));
  }

  function oauthLoginGoogle({ sub, email, name, picture }) {
    const s = load();
    let isNew = false;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    let user = s.users.find(u => (u.googleSub && u.googleSub === sub) || (u.email && String(u.email).toLowerCase() === normalizedEmail));
    if (!user) {
      isNew = true;
      user = {
        id: uid(),
        name: name || email?.split('@')[0] || 'Google User',
        nickname: (name || email?.split('@')[0] || 'google_user').replace(/\s+/g, ''),
        email: normalizedEmail,
        password: '',
        bio: '',
        founderVerified: false,
        profileImage: picture || '',
        plan: 'free',
        googleSub: sub,
        age: null,
        ageVerifiedAt: null,
        youthTag: false,
        userTrack: 'Open',
        school: '',
        careerRaw: '',
        careerSummary: '',
        headline: '',
        startupBelief: '',
        lookingFor: '',
        portfolioHighlights: '',
        interestTags: [],
        instagramUrl: '',
        githubUrl: '',
        linkedinUrl: '',
        portfolioUrl: '',
        onboardingComplete: false,
        createdAt: new Date().toISOString()
      };
      s.users.push(user);
    } else {
      user.googleSub = sub || user.googleSub;
      user.name = name || user.name;
      user.profileImage = picture || user.profileImage;
      if (user.ageVerifiedAt && Number.isFinite(Number(user.age))) {
        user.youthTag = normalizeYouthTag(user);
        user.userTrack = getUserTrack(user);
      }
    }
    s.currentUserId = user.id;
    s.devMode = false;
    save(s);
    return { user, isNew };
  }

  async function registerUser({ name, nickname, email, password, age = null, ageVerifiedAt = null, interestTags = [] }) {
    const isLocal = typeof location !== 'undefined' && ['localhost', '127.0.0.1'].includes(location.hostname);
    if (!isLocal) throw new Error('로컬 계정 fallback은 개발 환경에서만 사용할 수 있습니다.');
    const s = load();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const exists = s.users.find(u => String(u.email || '').toLowerCase() === normalizedEmail);
    if (exists) throw new Error('이미 가입된 이메일입니다.');
    if (String(password || '').length < 8) throw new Error('비밀번호는 8자 이상이어야 합니다.');
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) throw new Error('비밀번호는 영문+숫자를 포함해야 합니다.');
    const user = {
      id: uid(),
      name,
      nickname: nickname || name,
      email: normalizedEmail,
      password: '',
      passwordHash: '',
      bio: '',
      founderVerified: false,
      profileImage: '',
      plan: 'free',
      age: age == null ? null : Number(age),
      ageVerifiedAt: ageVerifiedAt || null,
      youthTag: isYouthByAge(age, ageVerifiedAt),
      userTrack: isYouthByAge(age, ageVerifiedAt) ? 'Youth' : 'Open',
      school: '',
      careerRaw: '',
      careerSummary: '',
      headline: '',
      startupBelief: '',
      lookingFor: '',
      portfolioHighlights: '',
      interestTags: normalizeInterestTags(interestTags),
      instagramUrl: '',
      githubUrl: '',
      linkedinUrl: '',
      portfolioUrl: '',
      onboardingComplete: false,
      createdAt: new Date().toISOString()
    };
    user.passwordHash = await makeLocalPasswordHash(user, password);
    s.users.push(user);
    s.currentUserId = user.id;
    s.devMode = false;
    save(s);
    return user;
  }

  async function loginUser({ email, password }) {
    const isLocal = typeof location !== 'undefined' && ['localhost', '127.0.0.1'].includes(location.hostname);
    if (!isLocal) throw new Error('로컬 계정 fallback은 개발 환경에서만 사용할 수 있습니다.');
    const s = load();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const user = s.users.find(u => String(u.email || '').toLowerCase() === normalizedEmail);
    if (!user) throw new Error('가입된 계정이 없습니다.');
    if (user.passwordHash) {
      if (!(await verifyLocalPassword(user, password))) throw new Error('비밀번호가 일치하지 않습니다.');
    } else if (user.password) {
      if (user.password !== password) throw new Error('비밀번호가 일치하지 않습니다.');
      user.passwordHash = await makeLocalPasswordHash(user, password);
      user.password = '';
    } else {
      throw new Error('Google 가입 계정입니다. Google 로그인 후 앱 비밀번호를 먼저 설정해주세요.');
    }
    s.currentUserId = user.id;
    s.devMode = false;
    save(s);
    return user;
  }

  async function registerOrLogin(payload) {
    const s = load();
    const user = s.users.find(u => u.email === payload.email);
    if (user) return loginUser({ email: payload.email, password: payload.password });
    return registerUser(payload);
  }

  function sanitizeAccountProjects(state, email) {
    const next = { ...(state || {}) };
    const users = Array.isArray(next.users) ? next.users : [];
    const me = users.find(u => String(u?.email || '').toLowerCase() === email) || null;
    const isAdminEmail = email === 'admin@wethus.ai';
    const isAdminRole = String(me?.role || '').toLowerCase() === 'admin';

    // 관리자 계정은 검수 큐 포함 전체 프로젝트를 볼 수 있어야 한다.
    if (isAdminEmail || isAdminRole) {
      next.projects = Array.isArray(next.projects) ? next.projects : [];
      return next;
    }

    const currentId = next.currentUserId || me?.id || null;
    const projects = Array.isArray(next.projects) ? next.projects : [];
    next.projects = projects.filter(p => {
      if (!p || !p.id) return false;
      const founderEmail = String(p.founderEmail || '').toLowerCase();
      if (founderEmail && founderEmail === email) return true;
      if (currentId && p.founderId === currentId) return true;
      return false;
    });
    return next;
  }

  function mergeRecordsByKey(remoteItems, localItems, keyFn) {
    const map = new Map();
    (Array.isArray(remoteItems) ? remoteItems : []).forEach(item => {
      const key = keyFn(item);
      if (key) map.set(key, item);
    });
    (Array.isArray(localItems) ? localItems : []).forEach(item => {
      const key = keyFn(item);
      if (!key) return;
      const prev = map.get(key);
      map.set(key, prev ? { ...prev, ...item } : item);
    });
    return Array.from(map.values());
  }

  function mergeAccountState(localState, remoteState) {
    const local = localState && typeof localState === 'object' ? localState : {};
    const remote = remoteState && typeof remoteState === 'object' ? remoteState : {};
    return {
      ...remote,
      ...local,
      users: mergeRecordsByKey(remote.users, local.users, (user) => String(user?.email || user?.id || '').toLowerCase()),
      projects: mergeRecordsByKey(remote.projects, local.projects, (project) => String(project?.id || '')),
      applications: mergeRecordsByKey(remote.applications, local.applications, (application) => String(application?.id || '')),
      planRequests: mergeRecordsByKey(remote.planRequests, local.planRequests, (request) => String(request?.id || '')),
      bookmarks: mergeRecordsByKey(remote.bookmarks, local.bookmarks, (bookmark) => String(bookmark?.id || `${bookmark?.userId || ''}:${bookmark?.projectId || ''}`)),
      notifications: mergeRecordsByKey(remote.notifications, local.notifications, (notification) => String(notification?.id || '')),
      dmThreads: mergeRecordsByKey(remote.dmThreads, local.dmThreads, (thread) => String(thread?.id || '')),
      agents: mergeRecordsByKey(remote.agents, local.agents, (agent) => String(agent?.id || '')),
      agentActivityLogs: mergeRecordsByKey(remote.agentActivityLogs, local.agentActivityLogs, (log) => String(log?.id || '')),
      semanticEvents: mergeRecordsByKey(remote.semanticEvents, local.semanticEvents, (event) => String(event?.id || '')),
      asks: mergeRecordsByKey(remote.asks, local.asks, (ask) => String(ask?.id || '')),
      offers: mergeRecordsByKey(remote.offers, local.offers, (offer) => String(offer?.id || '')),
      connections: mergeRecordsByKey(remote.connections, local.connections, (connection) => String(connection?.id || `${connection?.actorId || ''}:${connection?.targetUserId || ''}`)),
      incomingConnections: mergeRecordsByKey(remote.incomingConnections, local.incomingConnections, (connection) => String(connection?.id || `${connection?.actorId || ''}:${connection?.targetUserId || ''}`)),
      projectViews: mergeRecordsByKey(remote.projectViews, local.projectViews, (view) => String(view?.id || '')),
      currentUserId: local.currentUserId || remote.currentUserId || null
    };
  }

  function addProject(payload) {
    const s = load();
    if (!s.currentUserId && !s.devMode) throw new Error('로그인이 필요합니다.');
    const actor = s.currentUserId || 'dev-temp';
    const me = s.users.find(u => u.id === s.currentUserId);
    const moderationStatus = payload?.moderationStatus || 'approved';
    const category = canonicalProjectCategory(payload?.category || '', payload?.title || '', payload?.summary || payload?.fullDescription || '');
    const normalizedCategory = payload?.normalizedCategory || normalizeThemeCategory(category, payload?.title || '', payload?.summary || payload?.fullDescription || '');
    const founderYouth = !!(me && normalizeYouthTag(me));
    const project = {
      id: uid(),
      founderId: actor,
      founderEmail: String(me?.email || '').toLowerCase(),
      teamMembers: [{ id: uid(), name: me?.nickname || me?.name || '대표', role: '대표', bio: '프로젝트 대표', isLeader: true }],
      createdAt: new Date().toISOString(),
      moderationStatus,
      moderationReason: payload?.moderationReason || '',
      moderationReviewedAt: payload?.moderationReviewedAt || new Date().toISOString(),
      youthProjectTag: founderYouth,
      projectTrack: founderYouth ? 'Youth' : 'Open',
      ...payload
    };
    project.category = category;
    project.normalizedCategory = normalizedCategory;
    s.projects.unshift(project);
    appendSemanticEvent(s, {
      actorId: actor,
      action: 'project_created',
      targetType: 'project',
      targetId: project.id,
      projectId: project.id,
      visibility: moderationStatus === 'approved' ? 'network' : 'private',
      metadata: { title: project.title || '', category: project.category || '', moderationStatus }
    });
    s.notifications = s.notifications || [];
    s.notifications.unshift({
      id: uid(),
      type: 'founder_submitted',
      title: '신청 완료',
      body: moderationStatus === 'manual_review'
        ? 'AI가 수동 검토 필요로 판단했습니다. 운영자 확인 후 승인 여부가 안내됩니다.'
        : 'AI 검토 중입니다. 보통 2~3분 내 반영되며, 운영자 확인이 필요하면 1일 내 승인 여부를 확인할 수 있습니다.',
      href: 'notifications.html',
      sender: 'WETHUS',
      unread: true,
      createdAt: new Date().toISOString(),
      userId: actor
    });

    if (moderationStatus === 'manual_review') {
      s.notifications.unshift({
        id: uid(),
        type: 'manual_review_required',
        title: '수동 검수 요청',
        body: `${project.title} 프로젝트에 수동 검수가 필요합니다.`,
        href: `admin.html?projectId=${encodeURIComponent(project.id)}`,
        sender: me?.nickname || me?.name || '신청자',
        unread: true,
        createdAt: new Date().toISOString(),
        userId: ADMIN_MODE_USER_ID
      });
    }

    save(s);
    scheduleCloudSync('save');
    return project;
  }

  function listProjects(options = {}) {
    const local = load().projects || [];
    let globals = [];
    try {
      globals = JSON.parse(localStorage.getItem(GLOBAL_PROJECTS_KEY) || '[]');
      if (!Array.isArray(globals)) globals = [];
    } catch (_) { globals = []; }
    const map = new Map();
    for (const p of globals) {
      if (p?.id) map.set(String(p.id), p);
    }
    for (const p of local) {
      if (p?.id) map.set(String(p.id), p);
    }

    const includePending = !!options.includePending;
    const includeRejected = !!options.includeRejected;
    return Array.from(map.values()).filter((p) => {
      const status = String(p?.moderationStatus || 'approved');
      const visibility = String(p?.visibility || '').toLowerCase();
      if (p?.deletedAt || status === 'deleted' || visibility === 'deleted') return false;
      if (status === 'approved') return true;
      if (status === 'manual_review') return includePending;
      if (status === 'rejected') return includeRejected;
      return false;
    });
  }

  function listExploreProjects() {
    const s = load();
    const actor = currentActorId();
    const me = (s.users || []).find((user) => user.id === actor) || null;
    const myEmail = String(me?.email || '').toLowerCase();
    const isMine = (project) => !!(actor && (
      String(project?.founderId || '') === String(actor) ||
      (myEmail && String(project?.founderEmail || '').toLowerCase() === myEmail)
    ));

    return listProjects({ includePending: true, includeRejected: true }).filter((project) => {
      const status = String(project?.moderationStatus || 'approved');
      if (status === 'approved') return true;
      return isMine(project);
    });
  }

  function getProjectById(projectId, options = {}) {
    if (!projectId) return null;
    const includePending = options.includePending !== false;
    const includeRejected = options.includeRejected !== false;
    return listProjects({ includePending, includeRejected }).find((project) => String(project?.id || '') === String(projectId)) || null;
  }

  function ensureHubState(s) {
    if (!s.projectHubs || typeof s.projectHubs !== 'object') s.projectHubs = {};
    return s.projectHubs;
  }

  function projectTaskId(title) {
    const normalized = String(title || '').trim().replace(/\s+/g, ' ').toLowerCase();
    let hash = 2166136261;
    for (let index = 0; index < normalized.length; index += 1) {
      hash ^= normalized.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `task-${(hash >>> 0).toString(36)}`;
  }

  function normalizeProjectTask(value, index, hub = {}) {
    const source = value && typeof value === 'object' ? value : { title: value };
    const title = String(source?.title || source?.text || '').trim();
    if (!title) return null;
    const id = String(source?.id || projectTaskId(title)).trim();
    const meta = hub?.taskMeta && typeof hub.taskMeta === 'object' ? (hub.taskMeta[id] || {}) : {};
    const status = hub?.taskStatus && typeof hub.taskStatus === 'object' ? hub.taskStatus[id] : null;
    const completed = status && typeof status === 'object' ? !!status.completed : !!status;
    return {
      id,
      title,
      description: String(source?.description || meta?.description || '').trim(),
      completed,
      completedAt: status && typeof status === 'object' ? (status.completedAt || '') : '',
      dueAt: source?.dueAt || meta?.dueAt || '',
      time: source?.time || meta?.time || '',
      location: source?.location || meta?.location || '',
      assigneeIds: Array.isArray(source?.assigneeIds) ? source.assigneeIds : (Array.isArray(meta?.assigneeIds) ? meta.assigneeIds : []),
      createdAt: source?.createdAt || meta?.createdAt || '',
      order: index
    };
  }

  function getProjectHub(projectId) {
    const s = load();
    const hubs = ensureHubState(s);
    const base = hubs[projectId] || {};
    return {
      goal: base.goal || '',
      weeklyTodos: Array.isArray(base.weeklyTodos) ? base.weeklyTodos : [],
      recentActivities: Array.isArray(base.recentActivities) ? base.recentActivities : [],
      blocker: base.blocker || '',
      tools: Array.isArray(base.tools) ? base.tools : [],
      teamChat: Array.isArray(base.teamChat) ? base.teamChat : [],
      progress: Array.isArray(base.progress) ? base.progress : [],
      materials: Array.isArray(base.materials) ? base.materials : [],
      aiMentors: Array.isArray(base.aiMentors) ? base.aiMentors : [],
      workLogs: Array.isArray(base.workLogs) ? base.workLogs : [],
      workLogsSig: base.workLogsSig || '',
      mentorSummary: base.mentorSummary || '',
      mentorPriority: base.mentorPriority || '',
      mentorMode: base.mentorMode || '',
      mentorInput: base.mentorInput || '',
      mentorChangeLog: base.mentorChangeLog || '',
      mentorBlockers: Array.isArray(base.mentorBlockers) ? base.mentorBlockers : [],
      mentorNextActions: Array.isArray(base.mentorNextActions) ? base.mentorNextActions : [],
      mentorQuestions: Array.isArray(base.mentorQuestions) ? base.mentorQuestions : [],
      mentorToolActions: Array.isArray(base.mentorToolActions) ? base.mentorToolActions : [],
      mentorEvidenceGaps: Array.isArray(base.mentorEvidenceGaps) ? base.mentorEvidenceGaps : [],
      mentorGrounding: Array.isArray(base.mentorGrounding) ? base.mentorGrounding : [],
      mentorRuns: Array.isArray(base.mentorRuns) ? base.mentorRuns : [],
      taskMeta: base.taskMeta && typeof base.taskMeta === 'object' ? base.taskMeta : {},
      taskStatus: base.taskStatus && typeof base.taskStatus === 'object' ? base.taskStatus : {},
      schedule: Array.isArray(base.schedule) ? base.schedule : [],
      updatedAt: base.updatedAt || ''
    };
  }

  function upsertProjectHub(projectId, patch = {}) {
    const s = load();
    const hubs = ensureHubState(s);
    const prev = hubs[projectId] || {};
    hubs[projectId] = {
      ...prev,
      ...patch,
      updatedAt: new Date().toISOString()
    };
    save(s);
    scheduleCloudSync('project-hub');
    return hubs[projectId];
  }

  function listProjectTasks(projectId, options = {}) {
    if (!projectId) return [];
    const hub = getProjectHub(projectId);
    const rows = (Array.isArray(hub.weeklyTodos) ? hub.weeklyTodos : [])
      .map((value, index) => normalizeProjectTask(value, index, hub))
      .filter(Boolean);
    return options.includeCompleted === false ? rows.filter((task) => !task.completed) : rows;
  }

  function addProjectTask(projectId, payload = {}) {
    const title = String(typeof payload === 'string' ? payload : payload?.title || '').trim();
    if (!projectId || !title) throw new Error('프로젝트와 작업명을 확인해주세요.');
    const s = load();
    const hubs = ensureHubState(s);
    const previous = hubs[projectId] || {};
    const existingRows = Array.isArray(previous.weeklyTodos) ? previous.weeklyTodos : [];
    const existingTitles = existingRows.map((item) => String(typeof item === 'string' ? item : item?.title || item?.text || '').trim());
    const id = projectTaskId(title);
    const now = new Date().toISOString();
    const taskMeta = previous.taskMeta && typeof previous.taskMeta === 'object' ? { ...previous.taskMeta } : {};
    taskMeta[id] = {
      ...(taskMeta[id] || {}),
      id,
      title,
      description: String(payload?.description || taskMeta[id]?.description || '').trim(),
      dueAt: payload?.dueAt || taskMeta[id]?.dueAt || '',
      time: String(payload?.time || taskMeta[id]?.time || '').trim(),
      location: String(payload?.location || taskMeta[id]?.location || '').trim(),
      assigneeIds: Array.isArray(payload?.assigneeIds) ? payload.assigneeIds.slice(0, 12) : (taskMeta[id]?.assigneeIds || []),
      createdAt: taskMeta[id]?.createdAt || now,
      createdBy: taskMeta[id]?.createdBy || currentActorId() || ''
    };
    hubs[projectId] = {
      ...previous,
      weeklyTodos: existingTitles.includes(title) ? existingRows : [title, ...existingRows].slice(0, 30),
      taskMeta,
      updatedAt: now
    };
    appendSemanticEvent(s, {
      action: existingTitles.includes(title) ? 'task_updated' : 'task_created',
      targetType: 'task',
      targetId: id,
      projectId,
      visibility: 'team',
      metadata: { title, dueAt: taskMeta[id].dueAt, source: payload?.source || 'wethus' }
    });
    save(s);
    scheduleCloudSync('project-task');
    return normalizeProjectTask(title, 0, hubs[projectId]);
  }

  function setProjectTaskCompleted(projectId, taskRef, completed) {
    if (!projectId) throw new Error('프로젝트를 확인해주세요.');
    const s = load();
    const hubs = ensureHubState(s);
    const previous = hubs[projectId] || {};
    const tasks = (Array.isArray(previous.weeklyTodos) ? previous.weeklyTodos : [])
      .map((value, index) => normalizeProjectTask(value, index, previous))
      .filter(Boolean);
    const task = tasks.find((item) => item.id === String(taskRef || '') || item.title === String(taskRef || ''));
    if (!task) throw new Error('작업을 찾을 수 없습니다.');
    const nextCompleted = completed === undefined ? !task.completed : !!completed;
    const now = new Date().toISOString();
    const taskStatus = previous.taskStatus && typeof previous.taskStatus === 'object' ? { ...previous.taskStatus } : {};
    taskStatus[task.id] = {
      completed: nextCompleted,
      completedAt: nextCompleted ? now : '',
      completedBy: nextCompleted ? (currentActorId() || '') : ''
    };
    const progress = Array.isArray(previous.progress) ? [...previous.progress] : [];
    if (nextCompleted) {
      progress.unshift({ id: uid(), text: `${task.title} 완료`, taskId: task.id, createdAt: now });
    }
    hubs[projectId] = { ...previous, taskStatus, progress: progress.slice(0, 80), updatedAt: now };
    appendSemanticEvent(s, {
      action: nextCompleted ? 'task_completed' : 'task_reopened',
      targetType: 'task',
      targetId: task.id,
      projectId,
      visibility: 'team',
      metadata: { title: task.title, source: 'wethus' }
    });
    save(s);
    scheduleCloudSync('project-task-status');
    return { ...task, completed: nextCompleted, completedAt: nextCompleted ? now : '' };
  }

  function listProjectSchedule(projectId, options = {}) {
    if (!projectId) return [];
    const hub = getProjectHub(projectId);
    const rows = (Array.isArray(hub.schedule) ? hub.schedule : []).map((item) => ({ ...item, kind: item?.kind || 'event' }));
    for (const task of listProjectTasks(projectId)) {
      if (!task.dueAt) continue;
      rows.push({
        id: `schedule-${task.id}`,
        projectId,
        taskId: task.id,
        title: task.title,
        date: String(task.dueAt).slice(0, 10),
        time: task.time || '',
        location: task.location || '프로젝트 작업',
        completed: task.completed,
        kind: 'task'
      });
    }
    const from = String(options.from || '').slice(0, 10);
    const to = String(options.to || '').slice(0, 10);
    return rows
      .filter((item) => !from || String(item?.date || '').slice(0, 10) >= from)
      .filter((item) => !to || String(item?.date || '').slice(0, 10) <= to)
      .sort((a, b) => `${a?.date || ''}T${a?.time || '23:59'}`.localeCompare(`${b?.date || ''}T${b?.time || '23:59'}`));
  }

  function addProjectScheduleItem(projectId, payload = {}) {
    const title = String(payload?.title || '').trim();
    const date = String(payload?.date || '').slice(0, 10);
    if (!projectId || !title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('일정 제목과 날짜를 확인해주세요.');
    const s = load();
    const hubs = ensureHubState(s);
    const previous = hubs[projectId] || {};
    const now = new Date().toISOString();
    const item = {
      id: uid(),
      projectId,
      title,
      date,
      time: String(payload?.time || '').trim(),
      location: String(payload?.location || '').trim(),
      kind: String(payload?.kind || 'event').trim(),
      createdAt: now,
      createdBy: currentActorId() || ''
    };
    hubs[projectId] = {
      ...previous,
      schedule: [item, ...(Array.isArray(previous.schedule) ? previous.schedule : [])].slice(0, 120),
      updatedAt: now
    };
    appendSemanticEvent(s, {
      action: 'schedule_created',
      targetType: 'schedule',
      targetId: item.id,
      projectId,
      visibility: 'team',
      metadata: { title, date, time: item.time, location: item.location }
    });
    save(s);
    scheduleCloudSync('project-schedule');
    return item;
  }

  function addHubActivity(projectId, text) {
    const hub = getProjectHub(projectId);
    const next = [{ id: uid(), text: String(text || ''), createdAt: new Date().toISOString() }, ...(hub.recentActivities || [])].slice(0, 30);
    upsertProjectHub(projectId, { recentActivities: next });
    recordSemanticEvent({
      action: 'contribution_created',
      targetType: 'project',
      targetId: projectId,
      projectId,
      visibility: 'team',
      metadata: { summary: String(text || '').trim().slice(0, 240) }
    });
    return next;
  }

  function myProjects() {
    const s = load();
    return s.projects.filter(p => p.founderId === s.currentUserId || (s.devMode && p.founderId === 'dev-temp'));
  }

  function goLoginIfGuest(extra = {}) {
    const actor = currentActorId();
    if (actor) return false;
    if (typeof location !== 'undefined') {
      setAuthReturnState(extra);
      location.href = 'login.html?next=' + encodeURIComponent(location.pathname + location.search);
    }
    return true;
  }

  function emitProjectUiSync(detail = {}) {
    try {
      if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function' || typeof CustomEvent !== 'function') return;
      window.dispatchEvent(new CustomEvent('wethus:project-ui-sync', {
        detail: {
          scope: 'projects',
          ...detail,
          emittedAt: new Date().toISOString()
        }
      }));
    } catch (_) {}
  }

  function toggleLike(projectId) {
    const target = getProjectById(projectId);
    if (!target) return null;
    const s = load();

    const actorId = s.currentUserId || (s.devMode ? 'dev-temp' : null);
    if (!actorId) {
      goLoginIfGuest({ modalProjectId: projectId });
      return { likes: target.likes || 0, liked: false };
    }

    const likedBy = Array.isArray(target.likedBy) ? [...target.likedBy] : [];
    const idx = likedBy.indexOf(actorId);
    const liked = idx === -1;

    if (liked) {
      likedBy.push(actorId);
    } else {
      likedBy.splice(idx, 1);
    }

    const result = mutateProjectCaches(projectId, (project) => ({
      ...project,
      likedBy,
      likes: likedBy.length,
      _liked: liked
    }));
    emitProjectUiSync({ reason: 'like_toggled', projectId, liked, likes: result.project?.likes || likedBy.length });
    recordSemanticEvent({
      actorId,
      action: liked ? 'project_liked' : 'project_unliked',
      targetType: 'project',
      targetId: projectId,
      projectId,
      visibility: 'private'
    });
    postProjectInteraction(`/projects/${encodeURIComponent(projectId)}/likes/toggle`)
      .then(() => {
        refreshServerLikes().catch(() => {});
      })
      .catch(() => {
        refreshServerLikes().catch(() => {});
      });
    scheduleCloudSync('save');
    return { likes: result.project?.likes || likedBy.length, liked };
  }

  function isBookmarked(projectId) {
    const s = load();
    const actor = currentActorId();
    if (!actor) return false;
    return (s.bookmarks || []).some(b => b.projectId === projectId && b.userId === actor);
  }

  function mergeServerBookmarks(rows, options = {}) {
    const actor = currentActorId();
    if (!actor) return [];
    const s = load();
    const incoming = (Array.isArray(rows) ? rows : [])
      .map((row) => {
        if (!row || typeof row !== 'object') return null;
        const projectId = String(row.projectId || '').trim();
        const userId = String(row.userId || actor).trim();
        const id = String(row.id || `${userId}:${projectId}`).trim();
        if (!projectId || !userId) return null;
        return {
          ...row,
          id,
          projectId,
          userId,
          createdAt: row.createdAt || new Date().toISOString()
        };
      })
      .filter(Boolean);
    const replaceCurrentUser = options.replaceCurrentUser !== false;
    const retained = replaceCurrentUser
      ? (s.bookmarks || []).filter((bookmark) => String(bookmark?.userId || '') !== actor)
      : [...(s.bookmarks || [])];
    const byId = new Map(retained.map((bookmark) => [String(bookmark?.id || ''), bookmark]));
    incoming.forEach((bookmark) => {
      byId.set(String(bookmark.id), { ...(byId.get(String(bookmark.id)) || {}), ...bookmark });
    });
    s.bookmarks = Array.from(byId.values());
    save(s);
    emitProjectUiSync({ reason: 'bookmarks_synced' });
    return s.bookmarks;
  }

  async function refreshServerBookmarks() {
    const actor = currentActorId();
    if (!actor) return [];
    const base = currentCloudApiBase();
    if (!base) return load().bookmarks || [];
    const response = await fetch(`${String(base).replace(/\/$/, '')}/me/bookmarks`, {
      headers: actorRequestHeaders(),
      credentials: 'include'
    });
    if (!response.ok) throw new Error(`bookmark sync failed (${response.status})`);
    const payload = await response.json().catch(() => ({}));
    if (!payload?.ok) throw new Error(payload?.error || 'bookmark sync failed');
    return mergeServerBookmarks(payload.bookmarks || []);
  }

  function mergeServerLikedProjects(rows) {
    const actor = currentActorId();
    if (!actor) return [];
    const likedIds = new Set((Array.isArray(rows) ? rows : []).map((row) => String(row?.id || '')).filter(Boolean));
    const updateProject = (project) => {
      if (!project?.id) return project;
      const likedBy = Array.isArray(project.likedBy) ? [...project.likedBy] : [];
      const actorIdx = likedBy.indexOf(actor);
      const shouldLike = likedIds.has(String(project.id));
      if (shouldLike && actorIdx === -1) likedBy.push(actor);
      if (!shouldLike && actorIdx !== -1) likedBy.splice(actorIdx, 1);
      return {
        ...project,
        likedBy,
        likes: likedBy.length,
        _liked: shouldLike
      };
    };

    const s = load();
    s.projects = (s.projects || []).map(updateProject);
    try {
      const globals = JSON.parse(localStorage.getItem(GLOBAL_PROJECTS_KEY) || '[]');
      if (Array.isArray(globals)) {
        localStorage.setItem(GLOBAL_PROJECTS_KEY, JSON.stringify(globals.map(updateProject)));
      }
    } catch (_) {}
    save(s);
    emitProjectUiSync({ reason: 'likes_synced' });
    return listProjects({ includePending: true, includeRejected: true }).filter((project) => likedIds.has(String(project?.id || '')));
  }

  async function refreshServerLikes() {
    const actor = currentActorId();
    if (!actor) return [];
    const base = currentCloudApiBase();
    if (!base) return myLikedProjects();
    const response = await fetch(`${String(base).replace(/\/$/, '')}/me/liked-projects`, {
      headers: actorRequestHeaders(),
      credentials: 'include'
    });
    if (!response.ok) throw new Error(`liked project sync failed (${response.status})`);
    const payload = await response.json().catch(() => ({}));
    if (!payload?.ok) throw new Error(payload?.error || 'liked project sync failed');
    return mergeServerLikedProjects(payload.projects || []);
  }

  function toggleBookmark(projectId) {
    const s = load();
    const actor = currentActorId();
    if (!actor) {
      goLoginIfGuest({ modalProjectId: projectId });
      throw new Error('로그인이 필요합니다.');
    }
    s.bookmarks = s.bookmarks || [];
    const idx = s.bookmarks.findIndex(b => b.projectId === projectId && b.userId === actor);
    let bookmarked = false;
    if (idx === -1) {
      s.bookmarks.push({ id: uid(), projectId, userId: actor, createdAt: new Date().toISOString() });
      bookmarked = true;
    } else {
      s.bookmarks.splice(idx, 1);
      bookmarked = false;
    }
    appendSemanticEvent(s, {
      actorId: actor,
      action: bookmarked ? 'project_bookmarked' : 'project_bookmark_removed',
      targetType: 'project',
      targetId: projectId,
      projectId,
      visibility: 'private'
    });
    save(s);
    emitProjectUiSync({ reason: 'bookmark_toggled', projectId, bookmarked });
    postProjectInteraction(`/projects/${encodeURIComponent(projectId)}/bookmarks/toggle`)
      .then((payload) => {
        if (payload?.bookmark) {
          mergeServerBookmarks(payload.bookmarked ? [payload.bookmark] : [], { replaceCurrentUser: false });
        } else {
          refreshServerBookmarks().catch(() => {});
        }
      })
      .catch(() => {
        refreshServerBookmarks().catch(() => {});
      });
    scheduleCloudSync('save');
    return { bookmarked };
  }

  function myBookmarkedProjects() {
    const s = load();
    const actor = currentActorId();
    if (!actor) return [];
    const ids = new Set((s.bookmarks || []).filter(b => b.userId === actor).map(b => b.projectId));
    return listProjects({ includePending: true, includeRejected: true }).filter(p => ids.has(p.id));
  }

  function myLikedProjects() {
    const actor = currentActorId();
    if (!actor) return [];
    return listProjects({ includePending: true, includeRejected: true }).filter(p => Array.isArray(p.likedBy) && p.likedBy.includes(actor));
  }

  function mutateProjectCaches(projectId, updater) {
    const s = load();
    let changed = false;
    const applyUpdate = (project) => {
      if (!project) return project;
      const next = updater ? updater({ ...project }) : project;
      changed = true;
      return next || project;
    };

    const localIdx = (s.projects || []).findIndex(p => p && p.id === projectId);
    if (localIdx >= 0) {
      s.projects[localIdx] = applyUpdate(s.projects[localIdx]);
    }

    let globals = [];
    try {
      globals = JSON.parse(localStorage.getItem(GLOBAL_PROJECTS_KEY) || '[]');
      if (!Array.isArray(globals)) globals = [];
    } catch (_) { globals = []; }
    const globalIdx = globals.findIndex(p => p && p.id === projectId);
    if (globalIdx >= 0) {
      globals[globalIdx] = applyUpdate(globals[globalIdx]);
      try { localStorage.setItem(GLOBAL_PROJECTS_KEY, JSON.stringify(globals)); } catch (_) {}
    }

    if (changed) save(s);
    return {
      state: s,
      project: localIdx >= 0 ? s.projects[localIdx] : (globalIdx >= 0 ? globals[globalIdx] : null)
    };
  }

  function mergeRemoteProject(project) {
    if (!project || typeof project !== 'object') return null;
    const projectId = String(project.id || '').trim();
    if (!projectId) return null;
    const merged = mutateProjectCaches(projectId, (current) => ({ ...current, ...project }));
    emitProjectUiSync({ reason: 'project_merged', projectId });
    if (merged?.project) return merged.project;

    const s = load();
    s.projects = Array.isArray(s.projects) ? [...s.projects, { ...project }] : [{ ...project }];
    save(s);
    emitProjectUiSync({ reason: 'project_merged', projectId });

    try {
      const globals = JSON.parse(localStorage.getItem(GLOBAL_PROJECTS_KEY) || '[]');
      const nextGlobals = Array.isArray(globals) ? [...globals] : [];
      if (!nextGlobals.some((row) => String(row?.id || '') === projectId)) {
        nextGlobals.push({ ...project });
        localStorage.setItem(GLOBAL_PROJECTS_KEY, JSON.stringify(nextGlobals));
      }
    } catch (_) {}

    return { ...project };
  }

  function currentCloudApiBase() {
    return Array.from(new Set(CLOUD_BASE_CANDIDATES))[0] || '';
  }

  function actorRequestHeaders(extraHeaders = {}) {
    const headers = { ...extraHeaders };
    const actorId = currentActorId();
    const shouldSendExplicitActor = window.WETHUS_SEND_EXPLICIT_ACTOR === true;
    if (actorId && shouldSendExplicitActor) headers['x-user-id'] = actorId;
    return headers;
  }

  function postProjectInteraction(path, options = {}) {
    const actorId = currentActorId();
    if (!actorId) return;
    const base = currentCloudApiBase();
    if (!base) return;
    return fetch(`${String(base).replace(/\/$/, '')}${path}`, {
      method: options.method || 'POST',
      headers: actorRequestHeaders({
        'Content-Type': 'application/json'
      }),
      credentials: 'include',
      body: options.body ? JSON.stringify(options.body) : undefined
    }).then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || `request failed (${response.status})`);
      }
      return payload;
    });
  }

  async function fetchAccountEndpoint(path, options = {}) {
    const base = currentCloudApiBase();
    if (!base) throw new Error('cloud api unavailable');
    const response = await fetch(`${String(base).replace(/\/$/, '')}${path}`, {
      method: options.method || 'GET',
      headers: actorRequestHeaders({
        'Content-Type': 'application/json'
      }),
      credentials: 'include',
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) throw new Error(payload?.error || `account request failed (${response.status})`);
    return payload;
  }

  async function exportAccountData() {
    return fetchAccountEndpoint('/me/data-export');
  }

  async function listPrelaunchSignups() {
    const base = currentCloudApiBase();
    if (!base) throw new Error('cloud api unavailable');
    const response = await fetch(`${String(base).replace(/\/$/, '')}/prelaunch/signups`, {
      method: 'GET',
      headers: actorRequestHeaders(),
      credentials: 'include'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) throw new Error(payload?.error || `prelaunch signups request failed (${response.status})`);
    return Array.isArray(payload.signups) ? payload.signups : [];
  }

  async function deleteCurrentAccount(confirmText = '') {
    const payload = await fetchAccountEndpoint('/me/account', {
      method: 'DELETE',
      body: { confirm: confirmText }
    });
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem(GLOBAL_PROJECTS_KEY);
    } catch (_) {}
    return payload;
  }

  function recordProjectView(projectId) {
    const s = load();
    const actor = currentActorId();
    if (!actor || !projectId) return false;
    s.projectViews = Array.isArray(s.projectViews) ? s.projectViews : [];
    s.projectViews.push({ id: uid(), userId: actor, projectId: String(projectId), createdAt: new Date().toISOString() });
    s.projectViews = s.projectViews.slice(-3000);
    save(s);
    return true;
  }

  function getProfileViewerId() {
    const actor = currentActorId();
    if (actor) return `user:${actor}`;
    try {
      const key = 'wethus_profile_guest_id';
      let guestId = sessionStorage.getItem(key) || '';
      if (!guestId) {
        guestId = `guest:${uid()}`;
        sessionStorage.setItem(key, guestId);
      }
      return guestId;
    } catch (_) {
      return `guest:${uid()}`;
    }
  }

  function recordProfileView(targetUserId) {
    const target = String(targetUserId || '').trim();
    if (!target) return false;
    const viewerId = getProfileViewerId();
    const todayKey = new Date().toISOString().slice(0, 10);
    const dedupeKey = `wethus_profile_view_${target}_${viewerId}_${todayKey}`;
    try {
      if (sessionStorage.getItem(dedupeKey)) return false;
      sessionStorage.setItem(dedupeKey, '1');
    } catch (_) {}
    const s = load();
    s.profileViews = Array.isArray(s.profileViews) ? s.profileViews : [];
    s.profileViews.push({
      id: uid(),
      targetUserId: target,
      viewerId,
      createdAt: new Date().toISOString()
    });
    s.profileViews = s.profileViews.slice(-3000);
    save(s);
    return true;
  }

  function getProfileViewStats(targetUserId) {
    const target = String(targetUserId || '').trim();
    if (!target) return { today: 0, total: 0 };
    const s = load();
    const rows = Array.isArray(s.profileViews)
      ? s.profileViews.filter((entry) => String(entry?.targetUserId || '') === target)
      : [];
    const todayKey = new Date().toISOString().slice(0, 10);
    const todayViewers = new Set();
    const totalViewers = new Set();
    rows.forEach((entry) => {
      const viewerId = String(entry?.viewerId || '').trim();
      if (!viewerId) return;
      totalViewers.add(viewerId);
      const dayKey = String(entry?.createdAt || '').slice(0, 10);
      if (dayKey === todayKey) todayViewers.add(viewerId);
    });
    return {
      today: todayViewers.size,
      total: totalViewers.size
    };
  }

  function getProfileFollowStats(targetUserId) {
    const target = String(targetUserId || '').trim();
    if (!target) return { followers: 0 };
    const s = load();
    const rows = Array.isArray(s.profileFollows)
      ? s.profileFollows.filter((entry) => String(entry?.targetUserId || '') === target)
      : [];
    const followers = new Set();
    rows.forEach((entry) => {
      const actorId = String(entry?.actorId || '').trim();
      if (actorId) followers.add(actorId);
    });
    return { followers: followers.size };
  }

  function isFollowingProfile(targetUserId) {
    const target = String(targetUserId || '').trim();
    const actor = String(currentActorId() || '').trim();
    if (!target || !actor || target === actor) return false;
    const s = load();
    return Array.isArray(s.profileFollows)
      ? s.profileFollows.some((entry) => String(entry?.targetUserId || '') === target && String(entry?.actorId || '') === actor)
      : false;
  }

  function toggleProfileFollow(targetUserId) {
    const target = String(targetUserId || '').trim();
    const actor = String(currentActorId() || '').trim();
    if (!actor) throw new Error('로그인이 필요합니다.');
    if (!target) throw new Error('대상 프로필을 찾을 수 없습니다.');
    if (target === actor) {
      return { following: false, followers: getProfileFollowStats(target).followers };
    }
    const s = load();
    s.profileFollows = Array.isArray(s.profileFollows) ? s.profileFollows : [];
    const index = s.profileFollows.findIndex((entry) => String(entry?.targetUserId || '') === target && String(entry?.actorId || '') === actor);
    let following = false;
    if (index === -1) {
      s.profileFollows.push({
        id: uid(),
        targetUserId: target,
        actorId: actor,
        createdAt: new Date().toISOString()
      });
      following = true;
    } else {
      s.profileFollows.splice(index, 1);
      following = false;
    }
    save(s);
    return {
      following,
      followers: getProfileFollowStats(target).followers
    };
  }

  function projectRecommendationBlob(project) {
    return [
      project?.title,
      project?.summary,
      project?.fullDescription,
      project?.desc,
      project?.roles,
      project?.neededRoles,
      project?.category
    ].map((value) => String(value || '').trim()).join(' ').toLowerCase();
  }

  function interestSignalsForProject(project, interestTags = []) {
    const selected = normalizeInterestTags(interestTags);
    if (!selected.length) {
      return { matchedTags: [], categoryMatches: [], keywordMatches: [], score: 0, reason: '' };
    }
    const blob = projectRecommendationBlob(project);
    const projectCategory = String(project?.category || '').trim();
    const categoryMatches = [];
    const keywordMatches = [];

    selected.forEach((tag) => {
      const meta = INTEREST_CATALOG.find((item) => item.tag === tag);
      if (!meta) return;
      if (projectCategory && String(meta.category || '').trim() === projectCategory) {
        categoryMatches.push(tag);
      }
      const keywords = Array.isArray(meta.keywords) ? meta.keywords : [];
      if (keywords.some((keyword) => {
        const normalized = String(keyword || '').trim().toLowerCase();
        return normalized && blob.includes(normalized);
      })) {
        keywordMatches.push(tag);
      }
    });

    const matchedTags = Array.from(new Set([...categoryMatches, ...keywordMatches]));
    const score = Math.min(1, categoryMatches.length * 0.7 + keywordMatches.length * 0.28);
    const primaryTag = matchedTags[0] || '';
    let reason = '';
    if (categoryMatches.length && primaryTag) reason = `${primaryTag} 관심사와 맞는 프로젝트`;
    else if (keywordMatches.length && primaryTag) reason = `${primaryTag} 키워드와 맞는 프로젝트`;

    return {
      matchedTags,
      categoryMatches: Array.from(new Set(categoryMatches)),
      keywordMatches: Array.from(new Set(keywordMatches)),
      score,
      reason
    };
  }

  function getRecommendedProjects(limit = 6) {
    const s = load();
    const actor = currentActorId();
    const max = Math.max(1, Number(limit || 6));
    const all = listProjects().filter(p => String(p?.moderationStatus || 'approved') === 'approved');
    if (!actor) {
      return all
        .map(p => {
          const likes = Number(p.likes || 0);
          const comments = Array.isArray(p.comments) ? p.comments.length : 0;
          const approvedAt = new Date(p.moderationReviewedAt || p.createdAt || Date.now()).getTime() || Date.now();
          const approvalAgeDays = Math.max(0, (Date.now() - approvedAt) / 86400000);
          const approvalFreshness = Math.max(0, 1 - approvalAgeDays / 14);
          const popularity = Math.min(1, (likes * 0.6 + comments * 1.1) / 42);
          const reason = approvalFreshness >= popularity ? '최근 승인된 프로젝트' : '반응이 빠른 프로젝트';
          return { ...p, _recScore: approvalFreshness * 0.56 + popularity * 0.44, _recommendationReason: reason };
        })
        .sort((a, b) => b._recScore - a._recScore)
        .slice(0, max);
    }

    const user = currentUser();
    const interestTags = normalizeInterestTags(user?.interestTags || []);
    const likesSet = new Set((all.filter(p => Array.isArray(p.likedBy) && p.likedBy.includes(actor)).map(p => p.id)));
    const bmSet = new Set((s.bookmarks || []).filter(b => b.userId === actor).map(b => b.projectId));
    const appliedSet = new Set((s.applications || []).filter(a => a.userId === actor && isActiveApplicationStatus(a.status)).map(a => a.projectId));
    const views = (s.projectViews || []).filter(v => v.userId === actor);

    const projectById = new Map(all.map(p => [String(p.id), p]));
    const catScore = {};
    for (const v of views) {
      const p = projectById.get(String(v.projectId));
      if (!p?.category) continue;
      catScore[p.category] = (catScore[p.category] || 0) + 1;
    }
    for (const p of all) {
      if (likesSet.has(p.id) || bmSet.has(p.id) || appliedSet.has(p.id)) {
        if (p.category) catScore[p.category] = (catScore[p.category] || 0) + 3;
      }
    }

    const now = Date.now();
    const ranked = all
      .filter(p => !appliedSet.has(p.id))
      .map(p => {
        const likes = Number(p.likes || 0);
        const comments = Array.isArray(p.comments) ? p.comments.length : 0;
        const ageDays = Math.max(1, (now - new Date(p.createdAt || now).getTime()) / 86400000);
        const freshness = Math.max(0, 1 - ageDays / 21);
        const approvedAt = new Date(p.moderationReviewedAt || p.createdAt || now).getTime() || now;
        const approvalAgeDays = Math.max(0, (now - approvedAt) / 86400000);
        const approvalFreshness = Math.max(0, 1 - approvalAgeDays / 14);
        const popularity = Math.min(1, (likes * 0.6 + comments * 1.1) / 42);
        const affinity = Math.min(1, Number(catScore[p.category] || 0) / 8);
        const interestSignals = interestSignalsForProject(p, interestTags);
        const interestAffinity = interestSignals.score;
        const interactionBoost = likesSet.has(p.id) || bmSet.has(p.id) ? 0.2 : 0;
        const interestWeight = interestTags.length ? 0.28 : 0;
        const historyWeight = interestTags.length ? 0.18 : 0.34;
        const score = affinity * historyWeight + interestAffinity * interestWeight + popularity * 0.2 + freshness * 0.12 + approvalFreshness * 0.22 + interactionBoost + Math.random() * 0.02;
        const recommendationReason = interestSignals.reason
          || (affinity >= 0.6 ? '최근 본 카테고리와 비슷한 프로젝트' : '')
          || (approvalFreshness >= 0.78 ? '최근 승인된 프로젝트' : '')
          || (popularity >= 0.45 ? '반응이 빠른 프로젝트' : '')
          || '지금 살펴볼 만한 프로젝트';
        return {
          ...p,
          _recScore: score,
          _recommendationReason: recommendationReason,
          _recommendedInterestTags: interestSignals.matchedTags
        };
      })
      .sort((a,b) => b._recScore - a._recScore)
      .slice(0, max);

    return ranked;
  }

  function getStartupIdeaRecommendations(limit = 6) {
    const user = currentUser();
    const interests = normalizeInterestTags(user?.interestTags || []);
    const selected = interests.length ? interests : ['AI/앱', '사회문제', '콘텐츠/미디어'];
    const templates = {
      'AI/앱': [
        ['학교 행사 일정 자동 정리 앱', '동아리·대회·수행평가 일정을 모아 개인별 실행 체크리스트로 바꿉니다.'],
        ['학생 포트폴리오 자동 정리 도구', '활동 기록을 입력하면 결과물·역할·배운 점을 입시/진로용 카드로 정리합니다.']
      ],
      '콘텐츠/미디어': [
        ['지역 소상공인 숏폼 스튜디오', '학생 팀이 동네 가게의 이야기를 촬영하고 전환율을 실험합니다.'],
        ['학교 문제 다큐 시리즈', '교내 문제를 인터뷰와 데이터로 기록해 제안서와 영상으로 공개합니다.']
      ],
      '사회문제': [
        ['통학 안전 지도 프로젝트', '위험 구간 제보와 현장 조사를 모아 개선 제안을 만듭니다.'],
        ['청소년 정책 실험랩', '학생이 겪는 불편을 설문·인터뷰로 검증하고 정책 제안으로 연결합니다.']
      ],
      '교육': [
        ['또래 멘토링 매칭 실험', '잘하는 과목과 필요한 도움을 연결하고 2주 학습 성과를 측정합니다.'],
        ['수행평가 템플릿 마켓', '보고서·발표·실험 기록 템플릿을 만들고 실제 사용성을 검증합니다.']
      ],
      '환경': [
        ['교실 공기질 데이터랩', 'CO2·미세먼지 데이터를 모아 환기 행동을 바꾸는 캠페인을 실험합니다.'],
        ['제로웨이스트 매점 실험', '학교 매점 쓰레기를 줄이는 리워드와 디자인을 테스트합니다.']
      ],
      '커머스/브랜드': [
        ['학생 제작 굿즈 검증 스토어', '소량 제작 상품을 예약 판매로 검증하고 브랜드 스토리를 만듭니다.'],
        ['동아리 후원 패키지 실험', '학교 동아리의 활동을 지역 후원 상품으로 패키징합니다.']
      ],
      '바이오/헬스': [
        ['청소년 수면 습관 챌린지', '수면 기록과 리마인더로 2주 행동 변화를 측정합니다.'],
        ['운동 루틴 동기부여 앱', '친구와 함께 체크인하고 작은 보상으로 지속률을 검증합니다.']
      ],
      '데이터/리서치': [
        ['학교생활 불편 데이터 대시보드', '설문과 제보를 모아 우선순위와 해결안을 시각화합니다.'],
        ['지역 청소년 공간 지도', '공부·모임·창작이 가능한 공간을 조사하고 추천 지도를 만듭니다.']
      ]
    };
    const out = [];
    selected.forEach(tag => {
      (templates[tag] || []).forEach(([title, summary], idx) => {
        const meta = INTEREST_CATALOG.find(i => i.tag === tag) || INTEREST_CATALOG[0];
        out.push({
          id: `idea-${tag}-${idx}`.replace(/\s+/g, '-'),
          title,
          summary,
          tag,
          category: meta.category,
          firstStep: '인터뷰 5명, 문제 가설 1개, 2주 MVP 범위를 먼저 정하세요.',
          href: `founder.html?idea=${encodeURIComponent(title)}&category=${encodeURIComponent(meta.category)}`
        });
      });
    });
    return out.slice(0, Math.max(1, Number(limit || 6)));
  }

  function analyzeProjectIdea(projectIdOrPayload) {
    const state = load();
    const project = typeof projectIdOrPayload === 'object'
      ? projectIdOrPayload
      : (state.projects || []).find(p => String(p.id) === String(projectIdOrPayload));
    if (!project) return null;
    const all = listProjects({ includePending: true, includeRejected: false }).filter(p => p.id !== project.id);
    const blob = `${project.title || ''} ${project.summary || ''} ${project.fullDescription || ''} ${project.category || ''}`.toLowerCase();
    const tokens = Array.from(new Set(blob.split(/[^가-힣a-zA-Z0-9]+/).filter(w => w.length >= 2))).slice(0, 40);
    const similar = all.map(p => {
      const t = `${p.title || ''} ${p.summary || ''} ${p.fullDescription || ''} ${p.category || ''}`.toLowerCase();
      const overlap = tokens.filter(w => t.includes(w)).length;
      const categoryBoost = p.category && p.category === project.category ? 4 : 0;
      return { ...p, _similarScore: overlap + categoryBoost };
    }).filter(p => p._similarScore > 0).sort((a, b) => b._similarScore - a._similarScore).slice(0, 4);
    const query = `${project.title || ''} ${project.category || ''} 청소년 창업 유사 서비스`;
    const searchUrls = [
      { label: 'Google', url: `https://www.google.com/search?q=${encodeURIComponent(query)}` },
      { label: 'Naver', url: `https://search.naver.com/search.naver?query=${encodeURIComponent(query)}` },
      { label: 'Product Hunt', url: `https://www.producthunt.com/search?q=${encodeURIComponent(project.title || project.category || 'student startup')}` }
    ];
    const risks = [];
    if (similar.length) risks.push('플랫폼 안에 유사 주제가 있어 차별화 포인트를 먼저 잡아야 합니다.');
    if (String(project.fullDescription || project.summary || '').length < 180) risks.push('문제·고객·검증 방법 설명이 아직 얕습니다.');
    if (!String(project.roles || '').trim()) risks.push('초기 팀 역할이 약해 실행력이 낮아질 수 있습니다.');
    return {
      project,
      similar,
      searchUrls,
      opportunities: [
        '첫 고객을 학생/동아리/학교 중 하나로 좁히면 빠르게 검증할 수 있습니다.',
        '2주 안에 보여줄 산출물을 하나로 제한하면 팀 모집 메시지가 선명해집니다.'
      ],
      risks: risks.length ? risks : ['현재 입력만으로는 큰 위험 신호는 적지만, 실제 수요 검증은 필요합니다.'],
      nextActions: [
        '비슷한 프로젝트 3개를 보고 겹치는 기능과 빠진 고객군을 표시하세요.',
        '인터뷰 질문 5개를 만들고 잠재 사용자 5명에게 확인하세요.',
        '2주 MVP를 기능 1개와 측정 지표 1개로 줄이세요.'
      ]
    };
  }

  function addComment(projectId, text) {
    const target = getProjectById(projectId);
    if (!target) return null;
    if (goLoginIfGuest({
      modalProjectId: projectId,
      reopenCommentPanel: true,
      pendingCommentText: String(text || '').trim()
    })) throw new Error('로그인이 필요합니다.');
    const author = currentUser()?.nickname || currentUser()?.name || '익명';
    const comments = Array.isArray(target.comments) ? [...target.comments] : [];
    comments.push({ id: uid(), author, userId: currentActorId(), text, createdAt: new Date().toISOString() });
    mutateProjectCaches(projectId, (project) => ({ ...project, comments }));
    recordSemanticEvent({
      action: 'project_comment_added',
      targetType: 'project',
      targetId: projectId,
      projectId,
      visibility: 'network',
      metadata: { text: String(text || '').trim().slice(0, 180) }
    });
    emitProjectUiSync({ reason: 'comment_added', projectId, commentCount: comments.length });
    postProjectInteraction(`/projects/${encodeURIComponent(projectId)}/comments`, { body: { text } })
      .then((payload) => {
        if (payload?.project) {
          mergeRemoteProject(payload.project);
        }
      })
      .catch(() => {});
    scheduleCloudSync('save');
    return comments;
  }

  function isAdminActor() {
    const s = load();
    if (s.devMode) return true;
    const actor = s.currentUserId || null;
    if (!actor) return false;
    if (actor === ADMIN_MODE_USER_ID) return true;
    const u = s.users.find(x => x.id === actor);
    const email = String(u?.email || '').toLowerCase();
    return email === 'admin@wethus.ai' || u?.role === 'admin';
  }

  function updateProject(projectId, patch) {
    const s = load();
    const target = s.projects.find(p => p.id === projectId);
    if (!target) return null;
    const actor = s.currentUserId || (s.devMode ? 'dev-temp' : null);
    const admin = isAdminActor();
    if (!admin && target.founderId !== actor) throw new Error('수정 권한이 없습니다.');
    Object.assign(target, patch || {});
    appendSemanticEvent(s, {
      actorId: actor,
      action: 'project_updated',
      targetType: 'project',
      targetId: projectId,
      projectId,
      visibility: 'team',
      metadata: { changedFields: Object.keys(patch || {}).slice(0, 20) }
    });
    save(s);
    return target;
  }

  function deleteProject(projectId) {
    const s = load();
    const actor = s.currentUserId || (s.devMode ? 'dev-temp' : null);
    const admin = isAdminActor();
    const idx = s.projects.findIndex(p => p.id === projectId);
    if (idx === -1) return false;
    const target = s.projects[idx];
    if (!admin && target.founderId !== actor) throw new Error('삭제 권한이 없습니다.');
    s.projects.splice(idx, 1);
    s.applications = (s.applications || []).filter(a => a.projectId !== projectId);
    save(s);
    postProjectInteraction(`/projects/${encodeURIComponent(projectId)}`, { method: 'DELETE' }).catch(() => {});
    scheduleCloudSync('save');
    return true;
  }

  function reviewProject(projectId, decision, note) {
    const s = load();
    if (!isAdminActor()) throw new Error('관리자 권한이 필요합니다.');
    let target = s.projects.find(p => p.id === projectId);
    let globalProjects = [];
    try {
      globalProjects = JSON.parse(localStorage.getItem(GLOBAL_PROJECTS_KEY) || '[]');
      if (!Array.isArray(globalProjects)) globalProjects = [];
    } catch (_) { globalProjects = []; }
    if (!target) {
      const globalTarget = globalProjects.find(p => p.id === projectId);
      if (globalTarget) {
        target = { ...globalTarget };
        s.projects.unshift(target);
      }
    }
    if (!target) return null;
    if (decision === 'approve') {
      target.moderationStatus = 'approved';
      target.moderationReason = note || '';
    } else if (decision === 'reject') {
      target.moderationStatus = 'rejected';
      target.moderationReason = note || '운영자 검토 결과 반려되었습니다.';
    } else {
      return null;
    }
    target.moderationReviewedAt = new Date().toISOString();
    s.notifications = s.notifications || [];
    s.notifications.unshift({
      id: uid(),
      type: 'review_result',
      title: decision === 'approve' ? '프로젝트 승인 완료' : '프로젝트 반려 안내',
      body: decision === 'approve'
        ? '운영자 검토를 통과했습니다. 탐색 탭에서 확인할 수 있습니다.'
        : `운영자 검토 결과: ${target.moderationReason || '반려'}`,
      href: `explore_theme.html`,
      sender: 'WETHUS 운영팀',
      unread: true,
      createdAt: new Date().toISOString(),
      userId: target.founderId || null
    });
    const globalIdx = globalProjects.findIndex(p => p.id === projectId);
    if (globalIdx >= 0) {
      globalProjects[globalIdx] = { ...globalProjects[globalIdx], ...target };
      try { localStorage.setItem(GLOBAL_PROJECTS_KEY, JSON.stringify(globalProjects)); } catch (_) {}
    }
    save(s);
    return target;
  }

  function updateCurrentUserProfile(patch) {
    const s = load();
    const u = s.users.find(x => x.id === s.currentUserId);
    if (!u) return null;
    Object.assign(u, patch || {});
    Object.assign(u, normalizeProfileLinks(u));
    u.headline = normalizeProfileText(u.headline);
    u.startupBelief = normalizeProfileText(u.startupBelief);
    u.lookingFor = normalizeProfileText(u.lookingFor);
    u.portfolioHighlights = normalizeProfileText(u.portfolioHighlights);
    u.interestTags = normalizeInterestTags(u.interestTags || []);
    u.youthTag = normalizeYouthTag(u);
    u.userTrack = getUserTrack(u);
    if (u.profileUpdatedAt === undefined) u.profileUpdatedAt = new Date().toISOString();
    appendSemanticEvent(s, {
      actorId: u.id,
      action: 'profile_updated',
      targetType: 'person',
      targetId: u.id,
      visibility: 'private',
      metadata: { changedFields: Object.keys(patch || {}).filter((key) => !/password|token|secret/i.test(key)).slice(0, 20) }
    });
    save(s);
    return u;
  }

  function upsertCloudUser(user) {
    const s = load();
    const email = String(user?.email || '').trim().toLowerCase();
    let target = s.users.find(u => (user?.id && u.id === user.id) || (email && String(u.email || '').toLowerCase() === email));
    if (!target) {
      target = {
        id: user?.id || uid(),
        name: user?.name || 'User',
        nickname: user?.nickname || user?.name || 'user',
        email,
        password: '',
        bio: user?.bio || '',
        founderVerified: !!user?.founderVerified,
        profileImage: user?.profileImage || '',
        plan: user?.plan || 'free',
        age: user?.age ?? null,
        ageVerifiedAt: user?.ageVerifiedAt || null,
        youthTag: normalizeYouthTag(user || {}),
        userTrack: getUserTrack(user || {}),
        school: user?.school || '',
        careerRaw: user?.careerRaw || '',
        careerSummary: user?.careerSummary || '',
        headline: user?.headline || '',
        startupBelief: user?.startupBelief || '',
        lookingFor: user?.lookingFor || '',
        portfolioHighlights: user?.portfolioHighlights || '',
        profileUpdatedAt: user?.profileUpdatedAt || user?.createdAt || new Date().toISOString(),
        interestTags: normalizeInterestTags(user?.interestTags || user?.interests || []),
        instagramUrl: normalizeProfileLinks(user).instagramUrl,
        githubUrl: normalizeProfileLinks(user).githubUrl,
        linkedinUrl: normalizeProfileLinks(user).linkedinUrl,
        portfolioUrl: normalizeProfileLinks(user).portfolioUrl,
        onboardingComplete: user?.onboardingComplete === undefined ? true : !!user?.onboardingComplete,
        createdAt: user?.createdAt || new Date().toISOString(),
        googleSub: user?.googleSub || ''
      };
      s.users.push(target);
    } else {
      Object.assign(target, {
        id: user?.id || target.id,
        name: user?.name || target.name,
        nickname: user?.nickname || target.nickname,
        email: email || target.email,
        bio: user?.bio ?? target.bio,
        founderVerified: user?.founderVerified ?? target.founderVerified,
        profileImage: user?.profileImage ?? target.profileImage,
        plan: user?.plan || target.plan,
        age: user?.age ?? target.age,
        ageVerifiedAt: user?.ageVerifiedAt ?? target.ageVerifiedAt,
        youthTag: normalizeYouthTag({ ...target, ...user }),
        userTrack: getUserTrack({ ...target, ...user }),
        school: user?.school ?? target.school,
        careerRaw: user?.careerRaw ?? target.careerRaw,
        careerSummary: user?.careerSummary ?? target.careerSummary,
        headline: user?.headline ?? target.headline,
        startupBelief: user?.startupBelief ?? target.startupBelief,
        lookingFor: user?.lookingFor ?? target.lookingFor,
        portfolioHighlights: user?.portfolioHighlights ?? target.portfolioHighlights,
        interestTags: normalizeInterestTags(user?.interestTags ?? target.interestTags ?? []),
        instagramUrl: normalizeProfileLinks({ instagramUrl: user?.instagramUrl ?? target.instagramUrl }).instagramUrl,
        githubUrl: normalizeProfileLinks({ githubUrl: user?.githubUrl ?? target.githubUrl }).githubUrl,
        linkedinUrl: normalizeProfileLinks({ linkedinUrl: user?.linkedinUrl ?? target.linkedinUrl }).linkedinUrl,
        portfolioUrl: normalizeProfileLinks({ portfolioUrl: user?.portfolioUrl ?? target.portfolioUrl }).portfolioUrl,
        onboardingComplete: user?.onboardingComplete === undefined ? target.onboardingComplete : !!user.onboardingComplete,
        googleSub: user?.googleSub ?? target.googleSub
      });
    }
    s.currentUserId = target.id;
    s.devMode = false;
    save(s);
    return target;
  }

  async function restoreServerSession() {
    const bases = Array.from(new Set(CLOUD_BASE_CANDIDATES));
    for (const base of bases) {
      try {
        const response = await fetch(new URL('/auth/session', base).toString(), {
          credentials: 'include'
        });
        if (!response.ok) continue;
        const payload = await response.json().catch(() => ({}));
        if (!payload?.ok || !payload?.user) continue;
        restoredServerSessionActorId = String(payload?.session?.sub || payload?.user?.id || payload?.user?.googleSub || '').trim();
        const user = upsertCloudUser(payload.user);
        if (user?.email) syncCloudState(user.email).catch(() => {});
        refreshServerBookmarks().catch(() => {});
        refreshServerLikes().catch(() => {});
        return { ok: true, user, session: payload.session || null };
      } catch (_) {}
    }
    restoredServerSessionActorId = '';
    return { ok: false };
  }

  async function syncCloudState(emailInput) {
    if (IS_NETWORK_PREVIEW) return { ok: true, preview: true, skipped: true };
    const email = String(emailInput || currentUser()?.email || '').trim().toLowerCase();
    if (!email) return { ok: false, reason: 'email-missing' };

    const bases = Array.from(new Set(CLOUD_BASE_CANDIDATES));
    let remoteState = null;
    let globalProjects = null;

    for (const base of bases) {
      try {
        const u = new URL('/cloud/state', base);
        u.searchParams.set('email', email);
        const r = await fetch(u.toString(), { credentials: 'include' });
        if (!r.ok) continue;
        const j = await r.json().catch(() => ({}));
        if (j?.state && typeof j.state === 'object') remoteState = j.state;
        if (Array.isArray(j?.globalProjects)) globalProjects = j.globalProjects;
        break;
      } catch (_) {}
    }

    if (Array.isArray(globalProjects)) {
      try { localStorage.setItem(GLOBAL_PROJECTS_KEY, JSON.stringify(globalProjects)); } catch (_) {}
    }

    const local = sanitizeAccountProjects(load(), email);

    // 계정 상태는 해당 email의 remote state를 authoritative source로 취급한다.
    // (전역 탐색 프로젝트는 별도 캐시에 저장)
    if (remoteState && typeof remoteState === 'object') {
      const sanitizedRemote = sanitizeAccountProjects(remoteState, email);
      const mergedState = mergeAccountState(local, sanitizedRemote);
      try { localStorage.setItem(KEY, JSON.stringify(mergedState)); } catch (_) {}
    } else {
      try { localStorage.setItem(KEY, JSON.stringify(local)); } catch (_) {}
    }

    refreshServerBookmarks().catch(() => {});
    refreshServerLikes().catch(() => {});

    const toPush = sanitizeAccountProjects(load(), email);
    const chosenCount = Array.isArray(toPush.projects) ? toPush.projects.length : 0;

    // account state만 업로드 (global projects는 서버 projection 사용)
    for (const base of bases) {
      try {
        await fetch(new URL('/cloud/state', base).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, state: toPush })
        });
        break;
      } catch (_) {}
    }

    return { ok: true, projects: chosenCount };
  }

  function scheduleCloudSync(reason = 'auto') {
    if (IS_NETWORK_PREVIEW) return;
    const me = currentUser();
    if (!me?.email) return;
    if (cloudSyncTimer) clearTimeout(cloudSyncTimer);
    cloudSyncTimer = setTimeout(() => {
      syncCloudState(me.email).catch(() => {});
    }, reason === 'save' ? 900 : 250);
  }

  function startAutoCloudSync() {
    if (IS_NETWORK_PREVIEW) return;
    if (cloudAutoPullTimer) return;
    const meNow = currentUser();
    if (meNow?.email) syncCloudState(meNow.email).catch(() => {});
    cloudAutoPullTimer = setInterval(() => {
      const me = currentUser();
      if (!me?.email) return;
      syncCloudState(me.email).catch(() => {});
    }, 15000);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          const me = currentUser();
          if (me?.email) syncCloudState(me.email).catch(() => {});
        }
      });
    }
  }

  function listReviewProjects() {
    const map = new Map();
    (load().projects || []).forEach(p => { if (p?.id) map.set(String(p.id), p); });
    try {
      const globals = JSON.parse(localStorage.getItem(GLOBAL_PROJECTS_KEY) || '[]');
      if (Array.isArray(globals)) {
        globals.forEach(p => { if (p?.id && !map.has(String(p.id))) map.set(String(p.id), p); });
      }
    } catch (_) {}
    return Array.from(map.values()).filter(p => p.moderationStatus === 'manual_review');
  }

  function reviewPlanRequest(requestId, decision, note = '') {
    const s = load();
    if (!isAdminActor()) throw new Error('관리자 권한이 필요합니다.');
    s.planRequests = Array.isArray(s.planRequests) ? s.planRequests : [];
    const target = s.planRequests.find((request) => String(request?.id || '') === String(requestId || ''));
    if (!target) throw new Error('플랜 요청을 찾을 수 없습니다.');

    const now = new Date().toISOString();
    const normalizedDecision = String(decision || '').trim().toLowerCase();
    const reviewer = currentUser();
    const reviewerName = reviewer?.nickname || reviewer?.name || 'WETHUS 운영팀';
    const requestedPlan = String(target.requestedPlan || '').trim().toLowerCase();
    const appliedPlan = requestedPlan === 'master' ? 'pro' : requestedPlan;
    const user = (s.users || []).find((item) =>
      item?.id === target.userId ||
      (target.userEmail && String(item?.email || '').trim().toLowerCase() === String(target.userEmail || '').trim().toLowerCase())
    );

    if (normalizedDecision === 'approve') {
      target.status = 'approved';
      target.reviewedAt = now;
      target.reviewedBy = reviewerName;
      target.reviewNote = String(note || '').trim();
      target.appliedPlan = appliedPlan;
      target.updatedAt = now;
      if (user) user.plan = appliedPlan;
      s.notifications = s.notifications || [];
      s.notifications.unshift({
        id: uid(),
        type: 'plan_request_approved',
        title: `${requestedPlan.toUpperCase()} 플랜 승인`,
        body: requestedPlan === 'master'
          ? 'Master 요청이 승인되어 계정에는 Pro 권한이 우선 반영되었습니다. 운영팀이 별도 안내를 이어갑니다.'
          : `${requestedPlan.toUpperCase()} 플랜이 계정에 반영되었습니다.`,
        href: 'pricing.html',
        sender: reviewerName,
        unread: true,
        createdAt: now,
        userId: target.userId
      });
      save(s);
      if (target.userEmail) syncCloudState(target.userEmail).catch(() => {});
      return target;
    }

    if (normalizedDecision === 'reject') {
      target.status = 'rejected';
      target.reviewedAt = now;
      target.reviewedBy = reviewerName;
      target.reviewNote = String(note || '').trim() || '운영 검토 결과 반려되었습니다.';
      target.updatedAt = now;
      s.notifications = s.notifications || [];
      s.notifications.unshift({
        id: uid(),
        type: 'plan_request_rejected',
        title: `${requestedPlan.toUpperCase()} 플랜 반려`,
        body: `검토 결과: ${target.reviewNote}`,
        href: 'pricing.html',
        sender: reviewerName,
        unread: true,
        createdAt: now,
        userId: target.userId
      });
      save(s);
      if (target.userEmail) syncCloudState(target.userEmail).catch(() => {});
      return target;
    }

    throw new Error('지원하지 않는 처리 방식입니다.');
  }

  function listNotifications(limit = 30) {
    const s = load();
    const actor = currentActorId();
    if (!actor) return [];
    const includeAdminInbox = isAdminActor();
    return (s.notifications || [])
      .filter(n => n.userId === actor || n.userId == null || (includeAdminInbox && n.userId === ADMIN_MODE_USER_ID))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }

  function unreadNotificationCount() {
    return listNotifications(200).filter(n => n.unread).length;
  }

  function addNotification(payload) {
    const s = load();
    const actor = currentActorId();
    const item = {
      id: uid(),
      type: payload?.type || 'general',
      title: payload?.title || '새 알림',
      body: payload?.body || '',
      href: payload?.href || 'notifications.html',
      sender: payload?.sender || 'WETHUS',
      unread: payload?.unread !== false,
      createdAt: new Date().toISOString(),
      userId: payload?.userId === undefined ? actor : payload.userId
    };
    s.notifications.unshift(item);
    save(s);
    return item;
  }

  function markNotificationRead(id) {
    const s = load();
    const target = (s.notifications || []).find(n => n.id === id);
    if (!target) return false;
    target.unread = false;
    save(s);
    return true;
  }

  function markAllNotificationsRead() {
    const s = load();
    const actor = currentActorId();
    const includeAdminInbox = isAdminActor();
    (s.notifications || []).forEach(n => {
      if (!n.userId || n.userId === actor || (includeAdminInbox && n.userId === ADMIN_MODE_USER_ID)) n.unread = false;
    });
    save(s);
  }

  function removeNotification(id) {
    const s = load();
    const actor = currentActorId();
    const idx = (s.notifications || []).findIndex(n => n.id === id && (!n.userId || n.userId === actor));
    if (idx === -1) return false;
    s.notifications.splice(idx, 1);
    save(s);
    return true;
  }

  function dmApiBases() {
    const localBases = ['http://127.0.0.1:8787', 'http://localhost:8787'];
    const remoteBase = window.WETHUS_API_BASE || 'https://wethus-api.onrender.com';
    const isLocalHost = ['localhost', '127.0.0.1'].includes(location.hostname);
    return (isLocalHost
      ? [remoteBase, `${location.protocol}//${location.hostname}:8787`, ...localBases]
      : [remoteBase]).filter(Boolean).map(b => b.replace(/\/$/, ''));
  }

  function aiApiBases() {
    const localBases = [`${location.protocol}//${location.hostname}:8787`, 'http://127.0.0.1:8787', 'http://localhost:8787'];
    const remoteBase = window.WETHUS_API_BASE || 'https://wethus-api.onrender.com';
    const preferredBase = window.WETHUS_AI_ENDPOINT || '';
    const isLocalHost = ['localhost', '127.0.0.1'].includes(location.hostname);
    const ordered = isLocalHost
      ? [preferredBase, ...localBases, remoteBase]
      : [preferredBase || remoteBase];
    return Array.from(new Set(ordered.filter(Boolean).map(b => String(b).replace(/\/$/, ''))));
  }

  function reviewApiBases() {
    const localBases = [`${location.protocol}//${location.hostname}:8787`, 'http://127.0.0.1:8787', 'http://localhost:8787'];
    const remoteBase = window.WETHUS_API_BASE || 'https://wethus-api.onrender.com';
    const isLocalHost = ['localhost', '127.0.0.1'].includes(location.hostname);
    const ordered = isLocalHost
      ? [remoteBase, ...localBases]
      : [remoteBase];
    return Array.from(new Set(ordered.filter(Boolean).map(b => String(b).replace(/\/$/, ''))));
  }

  function founderReviewFallback(payload = {}, reason = '') {
    const title = String(payload.title || '').trim();
    const description = String(payload.description || '').trim();
    const category = canonicalProjectCategory(payload.category || '', title, description);
    const detailText = [title, description, payload.motivation, payload.output, payload.plan].filter(Boolean).join(' ').trim();
    const decision = detailText.length >= 120 ? 'allow' : 'review';
    return {
      ok: true,
      decision,
      reason: reason || '백엔드 AI 검수에 실패해 수동 검토로 전환했습니다.',
      category,
      normalizedCategory: normalizeThemeCategory(category, title, description),
      reviewedAt: new Date().toISOString()
    };
  }

  async function reviewFounderSubmission(payload = {}) {
    const body = {
      title: String(payload.title || '').trim(),
      category: String(payload.category || '').trim(),
      description: String(payload.description || '').trim(),
      motivation: String(payload.motivation || '').trim(),
      output: String(payload.output || '').trim(),
      plan: String(payload.plan || '').trim()
    };
    let lastErr = null;

    for (const base of aiApiBases()) {
      try {
        const res = await fetch(`${base}/ai/review-founder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok) throw new Error(data?.error || `review-founder failed (${res.status})`);
        const category = canonicalProjectCategory(data.category || body.category, body.title, body.description);
        return {
          ok: true,
          decision: ['allow', 'review', 'block'].includes(data.decision) ? data.decision : 'review',
          reason: String(data.reason || '').trim(),
          category,
          normalizedCategory: data.normalizedCategory || normalizeThemeCategory(category, body.title, body.description),
          reviewedAt: data.reviewedAt || new Date().toISOString()
        };
      } catch (e) {
        lastErr = e;
      }
    }

    return founderReviewFallback(body, lastErr?.message ? `백엔드 AI 검수 실패: ${lastErr.message}` : '');
  }

  async function dmFetch(path, options = {}) {
    const bases = dmApiBases();
    let lastErr;
    for (const base of bases) {
      try {
        const res = await fetch(`${base}${path}`, {
          ...options,
          credentials: 'include',
          headers: actorRequestHeaders({
            'Content-Type': 'application/json',
            ...(options.headers || {})
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.ok === false) throw new Error(data?.error || `dm request failed (${res.status})`);
        return data;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('dm api unavailable');
  }

  async function reviewFetch(path, options = {}) {
    const bases = reviewApiBases();
    let lastErr;
    for (const base of bases) {
      try {
        const res = await fetch(`${base}${path}`, {
          ...options,
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
          }
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.ok === false) throw new Error(data?.error || `review request failed (${res.status})`);
        return data;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('review api unavailable');
  }

  async function listRemoteReviewProjects() {
    const data = await reviewFetch('/admin/review-projects', { method: 'GET' });
    return Array.isArray(data?.rows) ? data.rows : [];
  }

  async function reviewProjectRemote(projectId, decision, note) {
    const data = await reviewFetch(`/admin/review-projects/${encodeURIComponent(projectId)}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, note: note || '' })
    });
    return data?.project || null;
  }

  async function listRemotePlanRequests(options = {}) {
    const adminMode = options?.admin === true;
    const path = adminMode ? '/admin/plan-requests' : '/plan-requests';
    const data = await reviewFetch(path, { method: 'GET' });
    return Array.isArray(data?.rows) ? data.rows : [];
  }

  async function requestPlanUpgradeRemote(plan, note = '') {
    const data = await reviewFetch('/plan-requests', {
      method: 'POST',
      body: JSON.stringify({ requestedPlan: plan, note: note || '' })
    });
    return data?.row || null;
  }

  async function reviewPlanRequestRemote(requestId, decision, note) {
    const data = await reviewFetch(`/admin/plan-requests/${encodeURIComponent(requestId)}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, note: note || '' })
    });
    return data?.row || null;
  }

  function listDmThreadsLocal() {
    const s = load();
    return s.dmThreads || [];
  }

  function listDmMessagesLocal(threadId) {
    const s = load();
    const t = (s.dmThreads || []).find(x => x.id === threadId);
    return t?.messages || [];
  }

  function sendDmLocal(threadId, text) {
    const s = load();
    const actor = currentActorId();
    const u = s.users.find(x => x.id === s.currentUserId);
    const t = (s.dmThreads || []).find(x => x.id === threadId);
    if (!t) throw new Error('대화방을 찾을 수 없습니다.');
    const now = new Date().toISOString();
    t.messages = Array.isArray(t.messages) ? t.messages : [];
    t.messages.push({ id: uid(), fromId: actor, from: u?.nickname || u?.name || actor || 'Me', text: text || '', createdAt: now, readBy: [actor] });
    t.lastMessage = String(text || '');
    t.updatedAt = now;
    save(s);
    return t.messages;
  }

  function listHubChatThreadsLocal() {
    const s = load();
    const actor = currentActorId();
    return (s.projects || [])
      .filter(p => p.founderId === actor)
      .map(p => {
        const hub = getProjectHub(p.id);
        const last = (hub.teamChat || []).slice(-1)[0];
        return {
          id: `hubchat:${p.id}`,
          peerId: `hubchat:${p.id}`,
          peerName: `[팀채팅] ${p.title}`,
          lastMessage: last?.text || '아직 대화가 없습니다.',
          updatedAt: last?.createdAt || p.createdAt,
          messageCount: (hub.teamChat || []).length
        };
      });
  }

  async function listDmThreads() {
    let base = [];
    try {
      const data = await dmFetch('/dm/threads');
      base = data?.threads || [];
    } catch {
      base = listDmThreadsLocal();
    }
    return [...listHubChatThreadsLocal(), ...base];
  }

  async function listDmMessages(threadId) {
    if (String(threadId || '').startsWith('hubchat:')) {
      const projectId = String(threadId).replace('hubchat:', '');
      const hub = getProjectHub(projectId);
      return (hub.teamChat || []).map(m => ({ id: m.id, from: m.from, fromId: m.kind === 'human' ? currentActorId() : 'project-ai', text: m.text, createdAt: m.createdAt }));
    }
    try {
      const data = await dmFetch(`/dm/threads/${encodeURIComponent(threadId)}/messages`);
      return data?.messages || [];
    } catch {
      return listDmMessagesLocal(threadId);
    }
  }

  async function createDmThread({ targetUserId, targetName, targetAvatar } = {}) {
    if (!targetUserId && !targetName) throw new Error('대화 상대가 필요합니다.');
    try {
      const data = await dmFetch('/dm/threads', {
        method: 'POST',
        body: JSON.stringify({ targetUserId, targetName, targetAvatar })
      });
      return data?.thread;
    } catch {
      const s = load();
      const peerName = targetName || '대화 상대';
      let thread = (s.dmThreads || []).find(t => String(t.targetName || '') === String(peerName));
      if (!thread) {
        thread = { id: uid(), targetName: peerName, peerAvatar: targetAvatar || '', messages: [] };
        s.dmThreads.unshift(thread);
        save(s);
      }
      return { id: thread.id, peerName, peerAvatar: thread.peerAvatar || targetAvatar || '' };
    }
  }

  async function requestAgentReply(threadId, userText) {
    try {
      await dmFetch(`/dm/threads/${encodeURIComponent(threadId)}/agent-reply`, {
        method: 'POST',
        body: JSON.stringify({ userText: String(userText || '') })
      });
      return true;
    } catch {
      return false;
    }
  }

  async function sendDm(threadId, text) {

    if (String(threadId || '').startsWith('hubchat:')) {
      const projectId = String(threadId).replace('hubchat:', '');
      const hub = getProjectHub(projectId);
      const me = currentUser();
      const next = [...(hub.teamChat || []), { id: uid(), from: me?.nickname || me?.name || 'Me', kind: 'human', text: String(text || ''), createdAt: new Date().toISOString() }].slice(-120);
      upsertProjectHub(projectId, { teamChat: next });
      return listDmMessages(threadId);
    }

    try {
      await dmFetch(`/dm/threads/${encodeURIComponent(threadId)}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text: String(text || '') })
      });
      const threads = await listDmThreads();
      const t = (threads || []).find(x => x.id === threadId);
      const peerId = String(t?.peerId || t?.targetId || '');
      if (peerId.startsWith('agent:')) {
        await requestAgentReply(threadId, text);
      }
      return listDmMessages(threadId);
    } catch {
      return sendDmLocal(threadId, text);
    }
  }

  function listAgents() {
    const s = load();
    return (s.agents || []).slice();
  }

  function ensureAgentProfile(input = {}) {
    const s = load();
    s.agents = s.agents || [];
    s.users = s.users || [];

    const code = String(input.code || input.id || '').trim() || `agent_${Date.now()}`;
    let agent = s.agents.find(a => a.code === code);

    if (!agent) {
      const userId = uid();
      const name = input.name || 'WETHUS Agent';
      const nickname = input.nickname || String(name).replace(/\s+/g, '').toLowerCase();
      const user = {
        id: userId,
        name,
        nickname,
        email: `${code}@agent.wethus.local`,
        password: '',
        bio: input.bio || 'WETHUS 프로젝트 실행을 돕는 에이전트입니다.',
        founderVerified: false,
        profileImage: input.profileImage || '',
        plan: 'master',
        role: 'agent',
        isAgent: true,
        age: null,
        school: '',
        careerRaw: '',
        careerSummary: '',
        onboardingComplete: true,
        createdAt: new Date().toISOString()
      };
      s.users.push(user);
      agent = {
        id: uid(),
        code,
        userId,
        name,
        behavior: input.behavior || {
          exploreWeight: 0.5,
          likeWeight: 0.25,
          commentWeight: 0.2,
          createProjectWeight: 0.05
        },
        maxActionsPerTick: Number(input.maxActionsPerTick || 3),
        enabled: input.enabled !== false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      s.agents.push(agent);
      save(s);
      return agent;
    }

    agent.name = input.name || agent.name;
    agent.enabled = input.enabled === undefined ? agent.enabled : !!input.enabled;
    agent.updatedAt = new Date().toISOString();
    save(s);
    return agent;
  }

  function runAgentTick(agentCode, opts = {}) {
    const s = load();
    const agent = (s.agents || []).find(a => a.code === agentCode || a.id === agentCode);
    if (!agent) throw new Error('에이전트를 찾을 수 없습니다.');
    if (!agent.enabled) throw new Error('비활성화된 에이전트입니다.');

    const user = s.users.find(u => u.id === agent.userId);
    if (!user) throw new Error('에이전트 사용자 프로필이 없습니다.');

    const maxActions = Math.max(1, Math.min(10, Number(opts.maxActions || agent.maxActionsPerTick || 3)));
    const actorBackup = { currentUserId: s.currentUserId, devMode: s.devMode };

    const logs = [];
    const now = new Date().toISOString();
    s.currentUserId = user.id;
    s.devMode = false;
    save(s);

    const projects = (s.projects || []).slice();
    const candidate = projects.filter(p => p.founderId !== user.id);

    const randomPick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const commentPool = [
      '좋은 문제정의네요. 다음 단계 가설 검증 계획이 있으면 더 강해질 것 같아요.',
      '실행 플랜이 명확해서 인상적입니다. 1주 단위 목표를 나누면 더 좋아요.',
      '팀 역할이 선명해요. 우선순위 3개만 먼저 고정해보세요.',
      '아이디어 좋습니다. MVP 범위를 한 번 더 좁히면 속도 낼 수 있어요.'
    ];

    for (let i = 0; i < maxActions; i++) {
      const r = Math.random();
      if (r < 0.45 && candidate.length) {
        const p = randomPick(candidate);
        const out = toggleLike(p.id);
        logs.push({ type: 'like', projectId: p.id, liked: !!out?.liked, createdAt: now });
        continue;
      }
      if (r < 0.85 && candidate.length) {
        const p = randomPick(candidate);
        const text = randomPick(commentPool);
        addComment(p.id, text);
        logs.push({ type: 'comment', projectId: p.id, text, createdAt: now });
        continue;
      }

      const titleSeed = ['실행 로그 공유', '팀 스프린트', '현장 테스트', '문제 재정의'];
      const t = randomPick(titleSeed);
      const categorySeed = ['Startup', 'Film', 'Policy', 'App'];
      const category = randomPick(categorySeed);
      const project = addProject({
        title: `[Agent] ${t} 프로젝트 ${Math.floor(Math.random() * 1000)}`,
        category,
        summary: '에이전트가 탐색 중 발견한 실행 패턴을 기반으로 만든 실험형 프로젝트입니다.',
        desc: '초기 가설 수립 → 인터뷰 → 프로토타입 검증 순서로 운영합니다.',
        status: '기획 중',
        teamSize: '3인',
        roles: '기획 1 · 실행 1 · 기록 1',
        duration: '4주',
        image: `https://picsum.photos/seed/agent-${Date.now()}/1200/700`
      });
      logs.push({ type: 'create_project', projectId: project?.id, title: project?.title, createdAt: now });
    }

    const latest = load();
    latest.agentActivityLogs = latest.agentActivityLogs || [];
    latest.agentActivityLogs.unshift({ id: uid(), agentCode: agent.code, userId: user.id, logs, createdAt: now });
    latest.agentActivityLogs = latest.agentActivityLogs.slice(0, 400);
    latest.currentUserId = actorBackup.currentUserId;
    latest.devMode = actorBackup.devMode;
    save(latest);
    return { ok: true, agent: agent.code, actions: logs };
  }

  function listAgentActivityLogs(limit = 50) {
    const s = load();
    return (s.agentActivityLogs || []).slice(0, Math.max(1, Number(limit || 50)));
  }

  function currentActorId() {
    const s = load();
    return s.currentUserId || (s.devMode ? 'dev-temp' : null) || restoredServerSessionActorId || null;
  }

  function isProjectTeamMember(project, actorId) {
    if (!project || !actorId) return false;
    return Array.isArray(project.teamMembers) && project.teamMembers.some(member => String(member?.id || '') === String(actorId));
  }

  function normalizeApplicationStatus(status) {
    const value = String(status || '').trim().toLowerCase();
    if (value === 'pending') return 'applied';
    return value || 'applied';
  }

  function isActiveApplicationStatus(status) {
    const value = normalizeApplicationStatus(status);
    return value === 'applied' || value === 'accepted';
  }

  function hasApplied(projectId) {
    const s = load();
    const actor = currentActorId();
    if (!actor) return false;
    if (s.applications.some(a => a.projectId === projectId && a.userId === actor && isActiveApplicationStatus(a.status))) return true;
    return isProjectTeamMember(getProjectById(projectId), actor);
  }

  function mergeProjectApplications(rows, options = {}) {
    const s = load();
    const items = Array.isArray(rows) ? rows : [];
    const projectId = String(options.projectId || '').trim();
    const incoming = items
      .map((row) => {
        if (!row || typeof row !== 'object') return null;
        const normalizedProjectId = String(row.projectId || projectId || '').trim();
        const normalizedUserId = String(row.userId || row.applicantId || '').trim();
        const normalizedId = String(row.id || '').trim();
        if (!normalizedProjectId || !normalizedUserId || !normalizedId) return null;
        return {
          ...row,
          id: normalizedId,
          projectId: normalizedProjectId,
          userId: normalizedUserId
        };
      })
      .filter(Boolean);

    if (!s.applications) s.applications = [];
    const retained = projectId
      ? s.applications.filter((app) => String(app?.projectId || '') !== projectId)
      : [...s.applications];
    const byId = new Map(retained.map((app) => [String(app?.id || ''), app]));
    incoming.forEach((app) => {
      byId.set(String(app.id), { ...(byId.get(String(app.id)) || {}), ...app });
    });
    s.applications = Array.from(byId.values());
    save(s);
    return s.applications;
  }

  function applyToProject(projectId, motivation) {
    const s = load();
    const actor = currentActorId();
    if (!actor) {
      goLoginIfGuest({
        modalProjectId: projectId,
        reopenApplyModal: true,
        pendingApplyMotivation: String(motivation || '').trim()
      });
      throw new Error('로그인이 필요합니다.');
    }
    const project = s.projects.find(p => p.id === projectId);
    const me = (s.users || []).find(user => String(user?.id || '') === String(actor)) || null;
    const myEmail = String(me?.email || '').toLowerCase();
    const myNames = [me?.name, me?.nickname].map(value => String(value || '').trim()).filter(Boolean);
    const isMine = !!project && (
      String(project.founderId || '') === String(actor) ||
      (myEmail && String(project.founderEmail || '').toLowerCase() === myEmail) ||
      (myNames.length && myNames.includes(String(project.founderName || '').trim()))
    );
    const isJoined = !!project && Array.isArray(project.teamMembers) && project.teamMembers.some(member => {
      const memberId = String(member?.id || member?.userId || '').trim();
      const memberName = String(member?.name || '').trim();
      return ((memberId && memberId === String(actor)) || (memberName && myNames.includes(memberName))) && !member?.isLeader;
    });
    if (isMine) {
      throw new Error('내 프로젝트에는 지원할 수 없습니다.');
    }
    if (isJoined) {
      throw new Error('이미 합류한 프로젝트입니다.');
    }
    const exists = s.applications.find(a => a.projectId === projectId && a.userId === actor && isActiveApplicationStatus(a.status));
    if (exists) return exists;
    const app = { id: uid(), projectId, userId: actor, motivation: motivation || '', status: 'applied', createdAt: new Date().toISOString() };
    s.applications.push(app);
    if (project) {
      s.notifications = s.notifications || [];
      const applicant = s.users.find(u => u.id === actor);
      s.notifications.unshift({
        id: uid(),
        type: 'team_request',
        title: '새 팀 참여 요청이 도착했습니다',
        body: `${project.title} 프로젝트에 새로운 지원이 들어왔어요.`,
        sender: applicant?.nickname || applicant?.name || '다른 이용자',
        href: 'notifications.html',
        unread: true,
        createdAt: new Date().toISOString(),
        userId: project.founderId || null
      });
    }
    if (project) project.updatedAt = new Date().toISOString();
    appendSemanticEvent(s, {
      actorId: actor,
      action: 'project_application_created',
      targetType: 'project',
      targetId: projectId,
      projectId,
      visibility: 'team',
      metadata: { applicationId: app.id }
    });
    save(s);
    postProjectInteraction(`/projects/${encodeURIComponent(projectId)}/applications`, { body: { motivation: motivation || '' } });
    scheduleCloudSync('save');
    return app;
  }

  function cancelApplication(projectId) {
    const s = load();
    const actor = currentActorId();
    const target = s.applications.find(a => a.projectId === projectId && a.userId === actor && normalizeApplicationStatus(a.status) === 'applied');
    if (!target) return false;
    target.status = 'cancelled';
    target.cancelledAt = new Date().toISOString();
    save(s);
    postProjectInteraction(`/projects/${encodeURIComponent(projectId)}/applications/me`, { method: 'DELETE' });
    scheduleCloudSync('save');
    return true;
  }

  function myParticipatingProjects() {
    const s = load();
    const actor = currentActorId();
    if (!actor) return [];
    const ids = new Set(
      (s.applications || [])
        .filter(a => a.userId === actor && isActiveApplicationStatus(a.status))
        .map(a => a.projectId)
    );
    return listProjects({ includePending: true, includeRejected: true })
      .filter(p => ids.has(p.id) || isProjectTeamMember(p, actor));
  }

  function projectsByMemberName(name) {
    const s = load();
    return s.projects.filter(p => Array.isArray(p.teamMembers) && p.teamMembers.some(m => m.name === name));
  }
  function requireAuth() {
    const s = load();
    if (!s.currentUserId && !s.devMode) {
      location.href = 'login.html';
      return;
    }
    // 온보딩 진입은 회원가입/신규 소셜로그인 직후 profile.html?onboarding=1로 유도한다.
    // 페이지 공통 가드에서 강제 리다이렉트하면 기존 사용자 흐름이 꼬일 수 있어 여기서는 로그인만 검사.
  }

  function setGeminiApiKey(apiKey) {
    const s = load();
    s.geminiApiKey = apiKey;
    save(s);
  }

  function getGeminiApiKey() {
    return load().geminiApiKey || DEFAULT_GEMINI_KEY;
  }

  function setOpenAIApiKey(apiKey) {
    const s = load();
    s.openaiApiKey = apiKey;
    save(s);
  }

  function getOpenAIApiKey() {
    const s = load();
    if (s.openaiApiKey) return s.openaiApiKey;
    if (typeof window !== 'undefined' && window.WETHUS_OPENAI_KEY) {
      s.openaiApiKey = String(window.WETHUS_OPENAI_KEY || '').trim();
      save(s);
      return s.openaiApiKey;
    }
    return DEFAULT_OPENAI_KEY;
  }

  function fakeAiSearch(projects, query) {
    if (!query) return projects;
    const q = query.toLowerCase();
    return projects
      .map(p => {
        const text = `${p.title} ${p.summary} ${p.category} ${p.roles}`.toLowerCase();
        let score = 0;
        if (text.includes(q)) score += 3;
        q.split(/\s+/).forEach(w => { if (w && text.includes(w)) score += 1; });
        return { ...p, _score: score };
      })
      .filter(p => p._score > 0)
      .sort((a, b) => b._score - a._score);
  }

  async function askChatGPT(prompt) {
    const apiBases = aiApiBases();

    let lastErr;
    for (const base of apiBases) {
      try {
        const res = await fetch(`${base}/ai/moderate-project`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: prompt })
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (!data?.ok) throw new Error(data?.error || 'moderate failed');
        return JSON.stringify({ decision: data.decision, reason: data.reason || '' });
      } catch (e) {
        lastErr = e;
      }
    }

    // fallback: direct browser call when backend unavailable
    const apiKey = getOpenAIApiKey();
    if (!apiKey) throw lastErr || new Error('OpenAI API 키가 설정되지 않았습니다.');
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 300
      })
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`ChatGPT 호출 실패: ${t.slice(0, 180)}`);
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('응답이 비어 있습니다.');
    return text;
  }

  async function askGemini(prompt) {
    const p = String(prompt || '').trim();
    if (!p) throw new Error('프롬프트가 비어 있습니다.');

    // 1) backend proxy 우선 (브라우저 API 키 403 회피)
    const baseCandidates = aiApiBases();
    let backendErr = null;
    for (const base of baseCandidates) {
      try {
        const res = await fetch(`${base}/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: p })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok) throw new Error(data?.error || `ai/chat failed (${res.status})`);
        if (!data?.text) throw new Error('ai/chat empty');
        return data.text;
      } catch (e) {
        backendErr = e;
      }
    }

    // 2) fallback: 직접 Gemini 호출
    const apiKey = getGeminiApiKey();
    if (!apiKey) throw backendErr || new Error('AI API 키는 서버 프록시에서만 설정하세요.');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    async function once(timeoutMs = 15000) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: p }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 320 }
          })
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(`Gemini 호출 실패: ${t.slice(0, 180)}`);
        }
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (!text) throw new Error('응답이 비어 있습니다.');
        return text;
      } finally {
        clearTimeout(timeout);
      }
    }

    let lastErr = backendErr;
    const delays = [0, 500, 1200];
    for (let i = 0; i < delays.length; i++) {
      try {
        if (delays[i]) await new Promise(r => setTimeout(r, delays[i]));
        return await once(15000 + i * 3000);
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('Gemini 호출 실패');
  }

  function formatTimeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return '방금 전';
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 전`;
    const d = Math.floor(h / 24);
    return `${d}일 전`;
  }

  function ensureUiDialog() {
    let el = document.getElementById('uiDialog');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'uiDialog';
    el.className = 'modal';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <div class="modal-backdrop" data-ui-close="true"></div>
      <article class="modal-panel" style="max-width:420px;">
        <div class="modal-content">
          <h3 id="uiDialogTitle" style="margin:0 0 8px;">확인</h3>
          <p id="uiDialogMsg" style="margin:0 0 14px;color:#d6d6d6;"></p>
          <div style="display:flex;justify-content:flex-end;gap:8px;">
            <button id="uiDialogCancel" class="btn btn--secondary" type="button">취소</button>
            <button id="uiDialogOk" class="btn btn--primary" type="button">확인</button>
          </div>
        </div>
      </article>
    `;
    document.body.appendChild(el);
    return el;
  }

  function uiConfirm(message, opts = {}) {
    return new Promise((resolve) => {
      const el = ensureUiDialog();
      const okBtn = el.querySelector('#uiDialogOk');
      const cancelBtn = el.querySelector('#uiDialogCancel');
      const msg = el.querySelector('#uiDialogMsg');
      const title = el.querySelector('#uiDialogTitle');
      title.textContent = opts.title || '확인';
      msg.textContent = message || '';
      okBtn.textContent = opts.confirmText || '확인';
      cancelBtn.textContent = opts.cancelText || '취소';

      const close = (v) => {
        el.classList.remove('open');
        el.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        resolve(v);
      };

      okBtn.onclick = () => close(true);
      cancelBtn.onclick = () => close(false);
      el.onclick = (e) => {
        if (e.target && e.target.getAttribute('data-ui-close') === 'true') close(false);
      };

      el.classList.add('open');
      el.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    });
  }

  function uiAlert(message, opts = {}) {
    return uiConfirm(message, { ...opts, cancelText: '', confirmText: opts.confirmText || '확인' });
  }

  function refreshNavBadges() {
    const unread = listNotifications(99).filter(n => n.unread).length;
    const unreadText = unread > 99 ? '99+' : String(unread);
    document.querySelectorAll('.menu-badge, .side-badge').forEach(el => {
      el.textContent = unreadText;
      el.style.display = unread ? 'inline-grid' : 'none';
    });
  }

  function showTopToast(text) {
    if (!text) return;
    let toast = document.querySelector('.top-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'top-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(showTopToast._t1);
    clearTimeout(showTopToast._t2);
    showTopToast._t1 = setTimeout(() => toast.classList.remove('show'), 1700);
    showTopToast._t2 = setTimeout(() => toast.remove(), 2300);
  }

  function initNotificationNav() {
    const navs = document.querySelectorAll('.nav-links');
    if (!navs.length) return;
    const actor = currentActorId();

    navs.forEach(nav => {
      const firstLink = nav.querySelector('a.nav-link');
      if (!Array.from(nav.querySelectorAll('a')).some(a => (a.textContent || '').trim() === '홈')) {
        const home = document.createElement('a');
        home.href = 'index.html';
        home.className = 'nav-link';
        home.textContent = '홈';
        nav.insertBefore(home, firstLink || nav.firstChild);
      }

      const state = getState();

      // 기존 로그인 링크는 로그인 상태에서 숨긴다 (로그아웃은 프로필 드롭다운으로 통합)
      const authLink = nav.querySelector('.js-auth-link');
      if (actor && authLink) authLink.style.display = 'none';

      if (!actor) return;
      if (nav.querySelector('.js-profile-chip')) return;

      const u = currentUser() || { name: 'User', nickname: 'user', profileImage: '', plan: 'free' };
      const profileAnchor = Array.from(nav.querySelectorAll('a')).find(a => (a.textContent || '').trim() === '프로필');
      if (profileAnchor) profileAnchor.style.display = 'none';

      const chipWrap = document.createElement('div');
      chipWrap.className = 'notify-wrap js-profile-chip';
      const avatarHtml = u.profileImage
        ? `<img src="${u.profileImage}" alt="avatar" class="profile-chip-avatar"/>`
        : `<span class="profile-chip-avatar-fallback">${(u.name || 'U').slice(0, 1)}</span>`;
      chipWrap.innerHTML = `
        <button class="profile-chip-btn" type="button" aria-label="프로필 메뉴">
          ${avatarHtml}
          <span class="profile-chip-texts"><strong>${u.name || '사용자'}</strong></span>
        </button>
        <div class="notify-dropdown profile-chip-dropdown" style="display:none;">
          <a class="notify-item liquid-metal-btn" href="profile.html"><strong>프로필</strong><p>내 프로필 보기 및 수정</p></a>
          <button class="notify-more logout-btn" type="button" id="chipLogoutBtn">로그아웃</button>
        </div>
      `;

      const menuWrap = document.createElement('div');
      menuWrap.className = 'notify-wrap js-side-menu';
      menuWrap.innerHTML = `
        <button class="menu-icon-btn" type="button" aria-label="빠른 메뉴 열기" aria-expanded="false">
          <span></span><span></span><span></span>
          <span class="notify-badge menu-badge" style="display:none;">0</span>
        </button>
        <aside class="side-drawer" style="display:none;">
          <div class="side-drawer-group-title">빠른 메뉴</div>
          <a href="network.html?tab=people" class="side-drawer-item side-drawer-item--row">
            <span>Network</span>
          </a>
          <a href="dm.html" class="side-drawer-item side-drawer-item--row">
            <span class="nav-icon-svg" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>
            <span>DM</span>
          </a>
          <a href="notifications.html" class="side-drawer-item side-drawer-item--row">
            <span class="nav-icon-svg" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5"/><path d="M9 17a3 3 0 0 0 6 0"/></svg><span class="notify-badge side-badge" style="display:none;">0</span></span>
            <span>알림</span>
          </a>
          <a href="support.html" class="side-drawer-item side-drawer-item--row">
            <span class="nav-icon-svg" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0z"/><path d="M8.5 15a3.5 3.5 0 0 1 7 0"/><circle cx="12" cy="10" r="1"/></svg></span>
            <span>문의</span>
          </a>

          <div class="side-drawer-group-title">AD · 홍보</div>
          <a href="ad-center.html" class="side-drawer-item side-drawer-item--row">
            <span class="nav-icon-svg" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10M7 13h6"/></svg></span>
            <span>AD 센터</span>
          </a>
          <a href="ad-launch.html" class="side-drawer-item side-drawer-item--row">
            <span class="nav-icon-svg" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l18-5v12l-18-5v-2z"/><path d="M11 14v4a2 2 0 0 0 2 2h1"/></svg></span>
            <span>캠페인 만들기</span>
          </a>

          <div class="side-drawer-group-title side-drawer-settings-title"><span class="nav-icon-svg" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-.33-1 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1-.33H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1-.33 1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6c.3-.21.5-.55.6-1V3a2 2 0 1 1 4 0v.09c.1.45.3.79.6 1a1.65 1.65 0 0 0 1 .6 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.21.3.55.5 1 .6H21a2 2 0 1 1 0 4h-.09c-.45.1-.79.3-1 .6z"/></svg></span><span>설정</span></div>
          <button type="button" class="side-drawer-item side-drawer-item--row" data-lang-switch><span>언어 설정 (KR/EN)</span></button>
          <a href="profile.html" class="side-drawer-item side-drawer-item--row"><span>계정 설정</span></a>
          ${(state.devMode || isAdminActor()) ? `<a href="admin.html" class="side-drawer-item side-drawer-item--row"><span>프로젝트 검토</span></a>` : ''}
        </aside>
      `;

      const adLinks = Array.from(menuWrap.querySelectorAll('a[href="ad-center.html"], a[href="ad-launch.html"]'));
      if (!(state.devMode || isAdminActor())) {
        const adTitle = adLinks[0]?.previousElementSibling;
        if (adTitle?.classList?.contains('side-drawer-group-title')) adTitle.remove();
        adLinks.forEach(link => link.remove());
      } else {
        const adTitle = adLinks[0]?.previousElementSibling;
        if (adTitle?.classList?.contains('side-drawer-group-title')) adTitle.textContent = 'AD · 홍보';
        adLinks.forEach(link => {
          const label = link.querySelector('span:last-child');
          if (label) label.textContent = link.getAttribute('href') === 'ad-center.html' ? 'AD 센터' : '캠페인 만들기';
        });
      }

      nav.appendChild(chipWrap);
      nav.appendChild(menuWrap);

      const chipDrop = chipWrap.querySelector('.profile-chip-dropdown');
      const chipBtn = chipWrap.querySelector('.profile-chip-btn');
      const chipLogoutBtn = chipWrap.querySelector('#chipLogoutBtn');
      let closeTimer = null;
      const openDrop = () => {
        if (closeTimer) clearTimeout(closeTimer);
        chipDrop.style.display = 'block';
      };
      const closeDrop = () => {
        if (closeTimer) clearTimeout(closeTimer);
        closeTimer = setTimeout(() => { chipDrop.style.display = 'none'; }, 140);
      };
      chipBtn?.addEventListener('mouseenter', openDrop);
      chipWrap?.addEventListener('mouseenter', openDrop);
      chipWrap?.addEventListener('mouseleave', closeDrop);
      chipLogoutBtn?.addEventListener('click', () => {
        logout();
        location.href = 'login.html';
      });

      const drawer = menuWrap.querySelector('.side-drawer');
      const openBtn = menuWrap.querySelector('.menu-icon-btn');
      const langSwitchBtn = menuWrap.querySelector('[data-lang-switch]');
      refreshNavBadges();

      const toggleDrawer = () => {
        const isOpen = drawer.style.display === 'block';
        drawer.style.display = isOpen ? 'none' : 'block';
        openBtn?.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      };
      openBtn?.addEventListener('click', toggleDrawer);
      langSwitchBtn?.addEventListener('click', () => {
        const cur = localStorage.getItem('wethus.lang') || 'ko';
        const next = cur === 'ko' ? 'en' : 'ko';
        localStorage.setItem('wethus.lang', next);
        alert(`언어 설정이 ${next.toUpperCase()}로 저장되었습니다.`);
        try { applyLanguageUI(); } catch (_) {}
      });
    });
  }

  function setAuthReturnState(extra = {}) {
    try {
      const payload = {
        path: location.pathname,
        search: location.search,
        scrollY: window.scrollY || 0,
        ...extra
      };
      sessionStorage.setItem('wethus_auth_return_state', JSON.stringify(payload));
    } catch (_) {}
  }

  function consumeAuthReturnState() {
    try {
      const raw = sessionStorage.getItem('wethus_auth_return_state');
      if (!raw) return null;
      sessionStorage.removeItem('wethus_auth_return_state');
      return JSON.parse(raw);
    } catch (_) { return null; }
  }

  function initGuestNavGuard() {
    const actor = currentActorId();
    if (actor) return;
    const protectedHrefs = new Set(['founder.html', 'mentor.html', 'profile.html', 'notifications.html', 'dm.html', 'network.html', 'pricing.html']);
    const publicHrefs = new Set(['index.html', 'explore.html', 'explore_theme.html', 'explore_v1.html', 'login.html']);
    document.querySelectorAll('a[href]').forEach(a => {
      const href = (a.getAttribute('href') || '').trim();
      if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:')) return;
      const base = href.split('?')[0].split('#')[0];
      if (publicHrefs.has(base)) return;
      if (protectedHrefs.has(base)) {
        a.addEventListener('click', () => setAuthReturnState());
        a.setAttribute('href', 'login.html?next=' + encodeURIComponent(location.pathname + location.search));
      }
    });

    // safety: keep explore links public in all guest states
    document.querySelectorAll('a.nav-link, a.btn').forEach(a => {
      const label = (a.textContent || '').replace(/\s+/g, ' ').trim();
      if (label.includes('탐색')) a.setAttribute('href', 'explore.html');
    });
  }

  function initGuestApplyGuard() {
    const actor = currentActorId();
    if (actor) return;
    document.addEventListener('click', (e) => {
      const btn = e.target && e.target.closest && e.target.closest('.apply-btn');
      if (!btn) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const modalProjectId = String(btn?.dataset?.apply || btn?.dataset?.openHub || '').trim();
      if (modalProjectId) setAuthReturnState({ modalProjectId });
      else setAuthReturnState();
      const next = location.pathname + location.search;
      location.href = 'login.html?next=' + encodeURIComponent(next);
    }, true);
  }

  function applyLanguageUI() {
    let lang = 'ko';
    try { lang = localStorage.getItem('wethus.lang') || 'ko'; } catch (_) {}
    const dict = {
      en: {
        'nav.explore': 'Explore',
        'nav.hub': 'Project Hub',
        'nav.mentor': 'Mentor',
        'ad.center.title': 'AD Center',
        'ad.center.desc': 'Manage promotion operations in one place. Track campaign status, budget, and performance.',
        'ad.center.summary': 'Summary',
        'ad.center.active': 'Active Campaigns',
        'ad.center.budget': 'Monthly Budget',
        'ad.center.reach': 'Reached Users',
        'ad.center.recommend': 'Recommended Actions',
        'ad.center.action1': 'Write a 3-line campaign copy from your latest project-hub updates.',
        'ad.center.action2': 'Start with one target among Startup / Film / Policy / Science.',
        'ad.center.action3': 'Review every 24h and change only one variable per test.',
        'ad.center.cta': 'Create Campaign',
        'ad.launch.title': 'Create Campaign',
        'ad.launch.desc': 'Start a promotion campaign quickly. (MVP form)',
        'ad.launch.name': 'Campaign Name',
        'ad.launch.name.placeholder': 'e.g., WETHUS Startup Recruitment Campaign',
        'ad.launch.target': 'Target Category',
        'ad.launch.budget': 'Daily Budget (KRW)',
        'ad.launch.copy': 'Ad Copy',
        'ad.launch.cancel': 'Cancel',
        'ad.launch.save': 'Save',
        'ad.launch.placeholder.copy': 'Write your project strengths and why people should join now.'
      }
    };
    const map = dict[lang] || {};
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key && map[key]) el.textContent = map[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key && map[key]) el.setAttribute('placeholder', map[key]);
    });
  }

  function applyAuthReturnState() {
    try {
      const raw = sessionStorage.getItem('wethus_auth_return_state');
      if (!raw) return;
      const st = JSON.parse(raw);
      if (!st || st.path !== location.pathname) return;
      if (typeof st.scrollY === 'number') {
        setTimeout(() => window.scrollTo(0, st.scrollY), 0);
      }
    } catch (_) {}
  }

  function ensureFavicon() {
    try {
      let link = document.querySelector('link[rel="icon"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'icon');
        document.head.appendChild(link);
      }
      if (!link.getAttribute('href')) {
        link.setAttribute('href', 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22%3E%3Ctext y=%2250%22 x=%228%22 font-size=%2248%22%3E%F0%9F%94%A5%3C/text%3E%3C/svg%3E');
      }
    } catch (_) {}
  }

  function enhanceLegalFooterLinks() {
    try {
      const footers = document.querySelectorAll('.footer');
      if (!footers.length) return;
      footers.forEach((footer) => {
        if (footer.querySelector('.footer-links')) return;
        const inner = footer.querySelector('.footer-inner') || footer;
        const links = document.createElement('nav');
        links.className = 'footer-links';
        links.setAttribute('aria-label', 'WETHUS 정책 및 문의');
        links.innerHTML = [
          '<a href="terms.html">이용약관</a>',
          '<a href="privacy.html">개인정보처리방침</a>',
          '<a href="operations-policy.html">운영정책</a>',
          '<a href="support.html">문의</a>'
        ].join('');
        inner.appendChild(links);
      });
    } catch (_) {}
  }

  function initNotifyToast() {
    const seenKey = 'wethus_last_toast_notification';
    const latest = listNotifications(20).find(n => n.unread && n.type === 'review_result');

    const pendingToast = sessionStorage.getItem('wethus_pending_toast');
    if (pendingToast) {
      sessionStorage.removeItem('wethus_pending_toast');
      if (latest?.id) sessionStorage.setItem(seenKey, latest.id);
      showTopToast(pendingToast);
      return;
    }

    if (!latest) return;
    const seen = sessionStorage.getItem(seenKey);
    if (seen === latest.id) return;
    sessionStorage.setItem(seenKey, latest.id);
    showTopToast(latest.title || '새 알림');
  }

  async function initAppShell() {
    ensureFavicon();
    enhanceLegalFooterLinks();
    await restoreServerSession().catch(() => ({ ok: false }));
    initGuestNavGuard();
    initGuestApplyGuard();
    initNotificationNav();
    enhanceLegalFooterLinks();
    applyLanguageUI();
    applyAuthReturnState();
    initNotifyToast();
    startAutoCloudSync();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initAppShell().catch(() => {});
    });
  } else {
    initAppShell().catch(() => {});
  }

  window.WETHUS = {
    getState,
    currentUser,
    registerUser,
    loginUser,
    registerOrLogin,
    oauthLoginGoogle,
    setCurrentUser,
    ensureLocalDevUser,
    logout,
    addProject,
    listProjects,
    listExploreProjects,
    myProjects,
    getProjectHub,
    upsertProjectHub,
    addHubActivity,
    listProjectTasks,
    addProjectTask,
    setProjectTaskCompleted,
    listProjectSchedule,
    addProjectScheduleItem,
    toggleLike,
    isBookmarked,
    toggleBookmark,
    myBookmarkedProjects,
    myLikedProjects,
    recordProjectView,
    recordProfileView,
    getProfileViewStats,
    getProfileFollowStats,
    isFollowingProfile,
    toggleProfileFollow,
    getProfileProofSummary,
    getRecommendedProjects,
    getStartupIdeaRecommendations,
    analyzeProjectIdea,
    normalizeInterestTags,
    addComment,
    updateProject,
    deleteProject,
    reviewProject,
    listReviewProjects,
    reviewPlanRequest,
    listRemoteReviewProjects,
    listRemotePlanRequests,
    requestPlanUpgradeRemote,
    reviewPlanRequestRemote,
    isAdminActor,
    updateCurrentUserProfile,
    upsertCloudUser,
    restoreServerSession,
    syncCloudState,
    exportAccountData,
    listPrelaunchSignups,
    deleteCurrentAccount,
    currentPlan,
    setCurrentUserPlan,
    listPlanRequests,
    requestPlanUpgrade,
    listNotifications,
    unreadNotificationCount,
    refreshNavBadges,
    refreshGlobalNav: initNotificationNav,
    showTopToast,
    setAuthReturnState,
    consumeAuthReturnState,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    removeNotification,
    listDmThreads,
    listDmMessages,
    createDmThread,
    sendDm,
    requestAgentReply,
    listAgents,
    ensureAgentProfile,
    runAgentTick,
    listAgentActivityLogs,
    recordSemanticEvent,
    listSemanticEvents,
    createAsk,
    listAsks,
    updateAskStatus,
    createOffer,
    listOffers,
    listNetworkPeople,
    refreshNetworkPeople,
    toggleConnection,
    listConnections,
    respondToConnection,
    refreshNetworkConnections,
    currentActorId,
    uiConfirm,
    uiAlert,
    hasApplied,
    mergeProjectApplications,
    mergeRemoteProject,
    reviewProjectRemote,
    applyToProject,
    cancelApplication,
    myParticipatingProjects,
    projectsByMemberName,
    requireAuth,
    fakeAiSearch,
    setGeminiApiKey,
    getGeminiApiKey,
    setOpenAIApiKey,
    getOpenAIApiKey,
    reviewFounderSubmission,
    askChatGPT,
    askGemini
  };
})();
