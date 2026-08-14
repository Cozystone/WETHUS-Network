const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const appRoot = path.join(repoRoot, 'WETHUS2');
const errors = [];

function fail(message) {
  errors.push(message);
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function countMatches(text, pattern) {
  return (text.match(pattern) || []).length;
}

function validateInlineScripts(rel, text) {
  const matches = [...text.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
  for (const [index, match] of matches.entries()) {
    const code = String(match?.[1] || '').trim();
    if (!code) continue;
    try {
      // Parse inline browser scripts early so hub-sized pages cannot regress silently.
      new Function(code);
    } catch (err) {
      fail(`${rel} inline <script> #${index + 1} failed to parse: ${err.message}`);
    }
  }
}

function activeOpportunityCount(items) {
  const now = Date.now();
  return items.filter(item => {
    const raw = String(item?.deadline || item?.applyEnd || '').trim();
    const date = raw ? new Date(`${raw}T23:59:59+09:00`) : null;
    return date && !Number.isNaN(date.getTime()) && date.getTime() >= now;
  }).length;
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name === 'node_modules') continue;
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function validateRenderBlueprint() {
  const file = path.join(repoRoot, 'render.yaml');
  if (!fs.existsSync(file)) {
    fail('render.yaml must exist at repo root to pin the Render backend deploy root');
    return;
  }

  const text = read(file);
  const requiredSnippets = [
    'services:',
    'type: web',
    'name: wethus-api',
    'runtime: node',
    'rootDir: WETHUS2/backend',
    'buildCommand: npm ci',
    'startCommand: npm start',
    'healthCheckPath: /health',
    'key: NODE_ENV',
    'value: production',
    'key: ALLOWED_ORIGINS',
    'https://wethus.co.kr,https://www.wethus.co.kr'
  ];
  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) fail(`render.yaml must include: ${snippet}`);
  }

  const secretKeys = [
    'JWT_SECRET',
    'TOKEN_ENCRYPTION_KEY',
    'ADMIN_BOOTSTRAP_PASSWORD',
    'GOOGLE_CLIENT_ID',
    'NAVER_CLIENT_ID',
    'NAVER_CLIENT_SECRET',
    'KAKAO_CLIENT_ID',
    'KAKAO_CLIENT_SECRET',
    'OPENAI_API_KEY'
  ];
  for (const key of secretKeys) {
    const blockMatch = text.match(new RegExp(`-\\s+key:\\s*${key}\\r?\\n((?:\\s{8}.+\\r?\\n?)*)`));
    const block = blockMatch ? blockMatch[0] : '';
    if (!block) {
      fail(`render.yaml must declare secret ${key}`);
      continue;
    }
    if (!/sync:\s*false/.test(block)) fail(`render.yaml secret ${key} must use sync: false`);
    if (/\r?\n\s+value:\s*/.test(block)) fail(`render.yaml secret ${key} must not have a committed value`);
  }
}

validateRenderBlueprint();

function validateOpsRunbooks() {
  const renderRunbook = path.join(appRoot, 'docs', 'ops', 'render-backend-redeploy.md');
  if (!fs.existsSync(renderRunbook)) {
    fail('WETHUS2/docs/ops/render-backend-redeploy.md must document the live API redeploy and strict smoke procedure');
    return;
  }
  const text = read(renderRunbook);
  const requiredSnippets = [
    'https://wethus-api.onrender.com/health',
    'render.yaml',
    'WETHUS2/backend',
    'REQUIRE_WETHUS_API_SECURITY_HEADERS=true',
    'REQUIRE_WETHUS_API_HEALTH_METADATA=true',
    'require_hardened_api=true'
  ];
  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) fail(`Render redeploy runbook must include: ${snippet}`);
  }

  const relayRunbook = path.join(appRoot, 'docs', 'ops', 'google-apps-script-relay.md');
  if (!fs.existsSync(relayRunbook)) {
    fail('WETHUS2/docs/ops/google-apps-script-relay.md must document the Google Apps Script relay setup');
    return;
  }
  const relayText = read(relayRunbook);
  const relaySnippets = [
    'Google Apps Script Relay Runbook',
    '`POST /integrations/:id/webhook-config`',
    '`POST /webhooks/:provider/:integrationId`',
    'Google Sheets can emit richer activity through `onEdit` and `onChange` installable triggers.',
    'Google Docs does not expose a fine-grained edit trigger equivalent to Sheets.',
    'createSheetInstallableTriggers();',
    'createDocsHeartbeatTrigger();'
  ];
  for (const snippet of relaySnippets) {
    if (!relayText.includes(snippet)) fail(`Google relay runbook must include: ${snippet}`);
  }
}

validateOpsRunbooks();

function validateGoogleRelayPackage() {
  const relayDir = path.join(appRoot, 'integrations', 'google-apps-script-relay');
  const codeFile = path.join(relayDir, 'Code.js');
  const manifestFile = path.join(relayDir, 'appsscript.json');

  if (!fs.existsSync(codeFile)) {
    fail('WETHUS2/integrations/google-apps-script-relay/Code.js must exist');
    return;
  }
  if (!fs.existsSync(manifestFile)) {
    fail('WETHUS2/integrations/google-apps-script-relay/appsscript.json must exist');
    return;
  }

  const codeText = read(codeFile);
  const manifestText = read(manifestFile);
  const requiredCodeSnippets = [
    "const WETHUS_WEBHOOK_URL = '__WETHUS_WEBHOOK_URL__';",
    "const WETHUS_WEBHOOK_SECRET = '__WETHUS_WEBHOOK_SECRET__';",
    "const WETHUS_PROVIDER = '__WETHUS_PROVIDER__';",
    'function notifyWethus(eventType, extra) {',
    'UrlFetchApp.fetch(WETHUS_WEBHOOK_URL',
    "'x-webhook-secret': WETHUS_WEBHOOK_SECRET",
    'function onOpen(e) {',
    'function onEdit(e) {',
    'function onChange(e) {',
    'function logManualUpdate() {',
    'function sendRelayHeartbeat() {',
    'function createSheetInstallableTriggers() {',
    'function createDocsHeartbeatTrigger() {'
  ];
  for (const snippet of requiredCodeSnippets) {
    if (!codeText.includes(snippet)) fail(`Google relay package must include: ${snippet}`);
  }

  const requiredManifestSnippets = [
    '"runtimeVersion": "V8"',
    '"https://www.googleapis.com/auth/script.external_request"',
    '"https://www.googleapis.com/auth/script.scriptapp"',
    '"https://www.googleapis.com/auth/spreadsheets.currentonly"',
    '"https://www.googleapis.com/auth/documents.currentonly"'
  ];
  for (const snippet of requiredManifestSnippets) {
    if (!manifestText.includes(snippet)) fail(`Google relay manifest must include: ${snippet}`);
  }
}

validateGoogleRelayPackage();

function validateProjectHubContracts() {
  const file = path.join(appRoot, 'project-hub.html');
  if (!fs.existsSync(file)) {
    fail('WETHUS2/project-hub.html must exist');
    return;
  }
  const text = read(file);
  const requiredSnippets = [
    'meta name="wethus-frontend-contract" content="2026-06-26-commercial-interactions-v1"',
    'renderHub = async function renderHubStable()',
    'loadRemoteActivityEventsForCurrentProject()',
    'loadRemoteStatusSnapshotForCurrentProject()',
    'mergedProjectTimeline(80)',
    'id="hubWebhookModal"',
    'id="hubWebhookOpsStatus"',
    'function integrationWebhookStatus(integration, providerMeta) {',
    'Webhook을 재발급하면 기존 secret은 즉시 무효화됩니다.',
    '외부 푸시 오래됨',
    'function sendWebhookTestEvent()',
    'data-tool-webhook',
    'id="hubWebhookDownloadCode"',
    'id="hubWebhookDownloadManifest"',
    'function webhookRelayManifest() {',
    'function downloadTextFile(filename, text) {',
    '서버기록',
    'WETHUS.mergeRemoteProject',
    'result?.project'
  ];
  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) fail(`project-hub.html must include: ${snippet}`);
  }

  const serverStatusHints = [
    '서버 스냅샷',
    'remoteStatusSnapshot',
    'statusRows'
  ];
  for (const snippet of serverStatusHints) {
    if (!text.includes(snippet)) fail(`project-hub.html must include server status wiring: ${snippet}`);
  }

  const legacyRenderer = /function\s+renderTeamApplicationsLegacyUnused\s*\(\)\s*\{\s*return\s+null\s*;/;
  if (!legacyRenderer.test(text)) {
    fail('project-hub.html legacy application renderer must stay fully disabled until it is removed');
  }

  const legacyHubRenderer = /async\s+function\s+renderHubLegacyUnused\s*\(\)\s*\{\s*\/\/ The stable override below is the only supported hub renderer\.\s*return\s+null\s*;/;
  if (!legacyHubRenderer.test(text)) {
    fail('project-hub.html legacy hub renderer must stay fully disabled until it is removed');
  }

  if (/async\s+function\s+renderHub\s*\(/.test(text)) {
    fail('project-hub.html must not keep the old async renderHub() implementation active');
  }
}

function validateInteractionContracts() {
  const file = path.join(appRoot, 'app.js');
  if (!fs.existsSync(file)) {
    fail('WETHUS2/app.js must exist');
    return;
  }
  const text = read(file);
  const requiredSnippets = [
    'function mergeServerBookmarks(',
    'async function refreshServerBookmarks()',
    'function mergeServerLikedProjects(',
    'async function refreshServerLikes()',
    'function mergeRemoteProject(',
    'function toggleBookmark(projectId)',
    'function myBookmarkedProjects()',
    'function myLikedProjects()',
    'function goLoginIfGuest(extra = {})',
    'reopenCommentPanel: true',
    'pendingCommentText: String(text || \'\').trim()',
    'reopenApplyModal: true',
    'pendingApplyMotivation: String(motivation || \'\').trim()'
  ];
  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) fail(`app.js must include interaction contract: ${snippet}`);
  }
}

function validateInteractionConsumers() {
  const profileFile = path.join(appRoot, 'profile.html');
  if (fs.existsSync(profileFile)) {
    const text = read(profileFile);
    const requiredSnippets = [
      'meta name="wethus-frontend-contract" content="2026-06-26-commercial-interactions-v1"',
      'data-tab="liked"',
      'data-tab="bookmarked"',
      'WETHUS.myBookmarkedProjects()',
      'WETHUS.myLikedProjects()',
      'data-open-project'
    ];
    for (const snippet of requiredSnippets) {
      if (!text.includes(snippet)) fail(`profile.html must include interaction consumer: ${snippet}`);
    }
  }

  const bookmarkConsumerPages = [
    path.join(appRoot, 'index.html'),
    path.join(appRoot, 'explore_theme.html')
  ];
  for (const file of bookmarkConsumerPages) {
    if (!fs.existsSync(file)) continue;
    const rel = path.relative(repoRoot, file).replace(/\\/g, '/');
    const text = read(file);
    const requiredSnippets = [
      'bookmark-btn',
      'WETHUS.isBookmarked(',
      'classList.toggle(\'active\'',
      'data-bm='
    ];
    for (const snippet of requiredSnippets) {
      if (!text.includes(snippet)) fail(`${rel} must include bookmark consumer: ${snippet}`);
    }
  }

  const homeFile = path.join(appRoot, 'index.html');
  if (fs.existsSync(homeFile)) {
    const text = read(homeFile);
    const requiredSnippets = [
      'meta name="wethus-frontend-contract" content="2026-06-26-commercial-interactions-v1"',
      'class="hero-banner"',
      'id="homeFeatured"',
      'WETHUS MANIFESTO',
      'reopenApplyModal: true',
      'pendingApplyMotivation: String(applyMotivation.value || \'\').trim()',
      'applyMotivation?.focus()'
    ];
    for (const snippet of requiredSnippets) {
      if (!text.includes(snippet)) fail(`index.html must include home launch contract: ${snippet}`);
    }
  }

  const themedExplore = path.join(appRoot, 'explore_theme.html');
  if (fs.existsSync(themedExplore)) {
    const text = read(themedExplore);
    const requiredSnippets = [
      'meta name="wethus-frontend-contract" content="2026-06-26-commercial-interactions-v1"',
      'reopenCommentPanel',
      'pendingCommentText',
      'reopenApplyModal',
      'pendingApplyMotivation',
      'applyMotivation.focus()'
    ];
    for (const snippet of requiredSnippets) {
      if (!text.includes(snippet)) fail(`explore_theme.html must include auth return consumer: ${snippet}`);
    }
  }

  const loginFile = path.join(appRoot, 'login.html');
  if (fs.existsSync(loginFile)) {
    const text = read(loginFile);
    const requiredSnippets = [
      'meta name="wethus-frontend-contract" content="2026-06-26-commercial-interactions-v1"',
      'function resolvePendingReturnTarget()',
      'function preserveReturnTargetForOnboarding(target)',
      'function redirectAfterAuth(user, options = {})',
      'onboardingReturnTo',
      'profile.html?onboarding=1&next=${encodeURIComponent(target)}'
    ];
    for (const snippet of requiredSnippets) {
      if (!text.includes(snippet)) fail(`login.html must include auth return contract: ${snippet}`);
    }
  }

  const profileFileForReturn = path.join(appRoot, 'profile.html');
  if (fs.existsSync(profileFileForReturn)) {
    const text = read(profileFileForReturn);
    const requiredSnippets = [
      'const onboardingReturnTarget = (() => {',
      'clearOnboardingReturnTarget',
      'location.href = onboardingReturnTarget || \'index.html\''
    ];
    for (const snippet of requiredSnippets) {
      if (!text.includes(snippet)) fail(`profile.html must include onboarding return contract: ${snippet}`);
    }
  }

  const founderFile = path.join(appRoot, 'founder.html');
  if (fs.existsSync(founderFile)) {
    const text = read(founderFile);
    const requiredSnippets = [
      'meta name="wethus-frontend-contract" content="2026-06-26-commercial-interactions-v1"',
      'const fieldLabels = {',
      'const focusField = (el) => {'
    ];
    for (const snippet of requiredSnippets) {
      if (!text.includes(snippet)) fail(`founder.html must include founder validation focus contract: ${snippet}`);
    }
  }

  const adminFile = path.join(appRoot, 'admin.html');
  if (fs.existsSync(adminFile)) {
    const text = read(adminFile);
    const requiredSnippets = [
      'meta name="wethus-frontend-contract" content="2026-06-26-commercial-interactions-v1"',
      '관리자 운영 검토',
      'class="js-review-note"',
      'id="opsActionStatus"',
      'const setCardBusy = (card, busy, message) => {',
      'readReviewNote(card,',
      '이 메모는 승인/반려 사유로 바로 반영됩니다.'
    ];
    for (const snippet of requiredSnippets) {
      if (!text.includes(snippet)) fail(`admin.html must include admin review contract: ${snippet}`);
    }
  }
}

validateProjectHubContracts();
validateInteractionContracts();
validateInteractionConsumers();

if (!fs.existsSync(appRoot)) {
  fail(`Missing app root: ${path.relative(repoRoot, appRoot)}`);
} else {
  const exposedBackups = path.join(appRoot, 'backups');
  if (fs.existsSync(exposedBackups)) {
    fail('WETHUS2/backups must not exist under the deploy root');
  }

  for (const name of fs.readdirSync(appRoot)) {
    if (/\.bak_|\.bak$/.test(name)) {
      fail(`Backup artifact is exposed from deploy root: WETHUS2/${name}`);
    }
  }

  for (const file of walk(appRoot)) {
    const rel = path.relative(repoRoot, file).replace(/\\/g, '/');
    if (rel.includes('/docs/change-log/')) continue;
    if (/\.bak_|\.bak$/.test(path.basename(file))) {
      fail(`Backup artifact is exposed from deploy root: ${rel}`);
      continue;
    }

    if (file.endsWith('.json')) {
      try {
        JSON.parse(read(file));
      } catch (err) {
        fail(`Invalid JSON in ${rel}: ${err.message}`);
      }
    }

    if (file.endsWith('.html')) {
      const text = read(file);
      const htmlClose = countMatches(text, /^\s*<\/html>\s*$/gm);
      const bodyClose = countMatches(text, /^\s*<\/body>\s*$/gm);
      if (htmlClose !== 1) fail(`${rel} must contain exactly one </html>; found ${htmlClose}`);
      if (bodyClose !== 1) fail(`${rel} must contain exactly one </body>; found ${bodyClose}`);

      const afterHtml = text.slice(text.lastIndexOf('</html>') + '</html>'.length).trim();
      if (afterHtml) fail(`${rel} has trailing content after </html>`);

      if (/^\s*tGoogleSignIn\(|^\s*nce: true\}\);/m.test(text)) {
        fail(`${rel} contains known leaked script fragments`);
      }

      validateInlineScripts(rel, text);
    }
  }

  const login = path.join(appRoot, 'login.html');
  if (fs.existsSync(login)) {
    const text = read(login);
    if (!/id="devModeRow"\s+style="display:none;"/.test(text)) {
      fail('login.html must keep dev mode hidden by default in production markup');
    }
    if (!/const allowDevMode = isLocalHost \|\| window\.WETHUS_ENABLE_DEV_MODE === true;/.test(text)) {
      fail('login.html must gate dev mode to localhost or explicit opt-in');
    }
  }

  const opportunities = path.join(appRoot, 'opportunities.html');
  if (fs.existsSync(opportunities)) {
    const text = read(opportunities);
    if (!text.includes('id="includeClosedToggle"')) {
      fail('opportunities.html must expose the expired-opportunity toggle');
    }
    if (!text.includes('includeClosed:false')) {
      fail('opportunities.html must hide expired opportunities by default');
    }
    if (!text.includes('!state.includeClosed&&isClosed(o)')) {
      fail('opportunities.html must filter expired opportunities unless opted in');
    }
  }

  const publishedFeed = path.join(appRoot, 'data', 'opportunity-published.json');
  if (fs.existsSync(publishedFeed)) {
    const data = JSON.parse(read(publishedFeed));
    const items = Array.isArray(data.items) ? data.items : [];
    const activeCount = activeOpportunityCount(items);
    if (activeCount < 1) {
      fail('opportunity-published.json must contain at least one non-expired opportunity');
    }
  }
}

if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log('Static validation passed.');
