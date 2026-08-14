# WETHUS Backend (MVP)

## 1) Install
```bash
cd WETHUS2/backend
npm install
cp .env.example .env
```

## 2) Configure `.env`
- `GOOGLE_CLIENT_ID`: Google Cloud OAuth Web Client ID
- `JWT_SECRET`: long random secret. Production refuses weak or missing values.
- `TOKEN_ENCRYPTION_KEY`: separate long random secret for OAuth/integration token encryption. Production refuses weak or missing values; do not reuse it across unrelated services.
- `ALLOWED_ORIGINS`: comma-separated frontend origins.
- `ADMIN_EMAIL`: initial admin email. Default is `admin@wethus.ai`.
- `ADMIN_BOOTSTRAP_PASSWORD`: one-time admin bootstrap password. Must be at least 8 characters and include letters and numbers; weak values such as `0904` are intentionally rejected.
- `RATE_LIMIT_DISABLED`: set to `true` only for local debugging. Keep disabled in production.
- `CLOUD_STATE_REQUIRE_SESSION`: set to `true` after production login/session cookies are verified. This blocks `/cloud/state` reads and writes unless the session email matches the requested email.
- `INTEGRATIONS_REQUIRE_ACTOR`: set to `true` after project hub requests are verified. These APIs now accept either `x-user-id` or a valid session subject as the actor source.
- `INTEGRATIONS_REQUIRE_SESSION`: set to `true` after `INTEGRATIONS_REQUIRE_ACTOR` and session cookies are verified. When `x-user-id` is sent, the session subject must match it; if `x-user-id` is omitted, the session subject becomes the actor.
- `INTEGRATIONS_ENFORCE_LAUNCH_SCOPE`: set to `true` when production should hard-block deferred roadmap providers at the backend level. With this enabled, deferred providers such as Notion, Slack, and Figma are blocked on OAuth-start and resource-list routes until the launch scope is intentionally expanded.
- `PROJECT_INTERACTIONS_REQUIRE_SESSION`: set to `true` after session restore is verified. Likes, comments, and project application APIs can now derive the actor from the browser session even when `x-user-id` is omitted.
- `PROJECT_ACCESS_REQUIRE_MEMBERSHIP`: set to `true` after project hub membership flows are verified. This limits project-scoped integration, activity, insight, sync, and snapshot APIs to project members, and limits project-management actions to founders/leaders.
- `DM_REQUIRE_SESSION`: set to `true` in production so DM actor identity must come from a valid session token or match it when `x-user-id` is sent.
- `WETHUS_LAUNCH_PROVIDERS`: optional comma-separated override for launch-scope providers. Use only when production should diverge from `WETHUS2/config/launch-scope.json`.
- `WETHUS_DEFERRED_PROVIDERS`: optional comma-separated override for deferred roadmap providers. Keep it aligned with launch policy and smoke tests.
- `WETHUS_DATA_DIR`: optional path for JSON state files. Defaults to `backend/data`; tests should use a temporary directory and production should use a persistent disk or database-backed replacement.
- Prelaunch notifications:
  - `PRELAUNCH_NOTIFY_EMAIL`: email address that receives a notification for each new prelaunch signup.
  - `RESEND_API_KEY`, `RESEND_FROM`: preferred HTTP email API settings for Render free services. `RESEND_FROM` should use a verified Resend sender/domain for production.
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`: fallback SMTP delivery settings for local or paid hosts. If no email provider is configured, signups are still saved and email notifications are skipped.
- AI provider:
  - `AI_PROVIDER=openai` is recommended.
  - `OPENAI_API_KEY=...`
  - `OPENAI_MODEL=gpt-4o-mini`
  - Local moderation and mentor option: `AI_PROVIDER=ollama`, `OLLAMA_BASE_URL=http://127.0.0.1:11434`, `OLLAMA_MODEL=llama3.2:3b`
  - `OLLAMA_KEEP_ALIVE=10m` keeps the selected local model warm between mentor requests.
  - `AI_MEMORY_REQUIRE_SESSION=true` requires the authenticated session subject to match the requested memory actor. It defaults to `true` in production and can be disabled only for isolated local QA.
  - Fallback: `AI_PROVIDER=gemini` with `GEMINI_API_KEY=...`
  - The authenticated Network home uses `/ai/project-mentor`, which recalls the user's WETHUS knowledge graph before generation and stores the question and answer as new memory episodes.
  - Local WETHUS AI chat also uses the backend AI routes, so when the frontend is opened on `localhost` it can use the Ollama-backed runtime without browser API keys.

## Local LLM quick start
```bash
cd WETHUS2/backend
cp .env.example .env
```

Set:
```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2:3b
OLLAMA_KEEP_ALIVE=10m
AI_MEMORY_REQUIRE_SESSION=false
```

If your local Ollama has a different installed model, replace `OLLAMA_MODEL` with that exact name from:
```bash
ollama list
```

Then run:
```bash
npm start
```

For local frontend testing, open the site from `localhost` or `127.0.0.1`. In that mode, WETHUS AI now prefers the local backend at `:8787` before the hosted API.

## 3) Run
```bash
npm start
```
Server runs at `http://localhost:8787`.

## 4) Frontend setup
In `login.html`, set:
```js
window.WETHUS_GOOGLE_CLIENT_ID = '...';
window.WETHUS_GOOGLE_AUTH_ENDPOINT = 'http://localhost:8787/auth/google';
```

## Security notes
- Google ID tokens are verified on the server.
- Password and Google login responses set an HTTP-only `wethus_session` cookie.
- OAuth and integration access/refresh tokens are stored encrypted at rest with `TOKEN_ENCRYPTION_KEY`; API responses strip raw and encrypted token fields before returning integration rows to the browser.
- Agent memory is isolated by a one-way actor scope key, keeps temporal validity and provenance on nodes and edges, and excludes passwords, session tokens, OAuth secrets, and raw email addresses. Account export and deletion include this memory store.
- `/health` exposes non-secret build and security-flag status so production drift can be diagnosed quickly.
- API responses include baseline security headers.
- Auth, AI, webhook, and metadata fetch endpoints use in-memory rate limits.
- `/tools/fetch-meta` rejects localhost/private IP targets and rechecks redirect targets to reduce SSRF risk.
- `/auth/session` returns both the decoded session and the matched sanitized user so the frontend can restore identity after refresh.
- Frontend currently stores app profile state in `localStorage` for the MVP. `/cloud/state` can be protected with `CLOUD_STATE_REQUIRE_SESSION=true`, but the long-term target is DB-backed sessions and project/review state.
- Backend JSON state is intentionally MVP-grade. Use `WETHUS_DATA_DIR` for isolated test runs or a persistent production disk, and migrate high-value state to a database before scaling usage.
- Project hub integration APIs can be protected with `INTEGRATIONS_REQUIRE_ACTOR=true` and then tightened with `INTEGRATIONS_REQUIRE_SESSION=true`; likes/comments/applications can separately be tightened with `PROJECT_INTERACTIONS_REQUIRE_SESSION=true`. `DM_REQUIRE_SESSION=true` applies the same session boundary to direct messages. `PROJECT_ACCESS_REQUIRE_MEMBERSHIP=true` adds an additional project-membership boundary for project-scoped APIs and founder/leader-only management actions. `INTEGRATIONS_ENFORCE_LAUNCH_SCOPE=true` adds a launch-policy boundary so deferred roadmap providers are blocked even if a caller bypasses the frontend UI. The backend can now derive the actor from the session subject when the client omits `x-user-id`, which reduces reliance on client-visible identifiers before the eventual DB-backed authorization model.
- Bookmark state now has a backend source of truth through `GET /me/bookmarks` and `POST /projects/:projectId/bookmarks/toggle`, which reduces profile and cross-device mismatch compared with local-only bookmarks.
- Core project interactions now append lightweight audit events into the activity-event store so founders and leaders can review likes, bookmarks, comments, and application decisions from the project perspective.
- Admin bootstrap only works when no matching admin user exists yet. Set a strong `ADMIN_BOOTSTRAP_PASSWORD`, log in once with `ADMIN_EMAIL`, then rotate or remove the bootstrap password.
- If `/admin.html` shows "권한 없음" and `/auth/login` for `admin@wethus.ai` returns "가입된 계정이 없습니다.", production probably has no admin user and no valid bootstrap password configured.
