# Natural AI chat and integrated project flow

## Scope

- The signed-in Network home keeps routine project work in the existing center column instead of sending every schedule entry to a separate Network route.
- The original production-connected WETHUS repository was not changed or deployed.

## Home flow

- The center column now continues below Work with an integrated Project Flow surface for schedule, activity, and ASK/OFFER.
- Left-side schedule entries select the matching date and row in Project Flow without leaving the home.
- Meeting, interview, milestone, and community entries are read in place; only project tasks retain a task-specific deep link.
- Schedule creation and ASK/OFFER creation are available inline, while the project hub remains available for deeper project records.
- Activity labels and visibility values are translated into user-facing Korean, and old low-information AI turns are hidden from the project activity feed.

## AI conversation

- Every user turn is answered by the configured AI model; there are no regex-classified or canned chat replies in the live home flow.
- A model-native scope planner decides whether the turn needs conversation continuity, project context, or neither.
- Separate model selectors choose only the conversation episodes and WETHUS records that can materially affect the answer.
- Selected graph records are converted into a readable factual memo before the answer model runs. Raw nodes, edges, and JSON are never appended after the user question.
- The answer model receives the factual memo first and the current user message last, then writes the natural Korean reply without a fixed coaching template.
- A separate metadata pass extracts only actions already present in a project-contextual reply; casual conversation does not overwrite mentor summaries or create project events.
- Model failure is surfaced as a retryable error instead of being replaced with fabricated project advice.

## Verification

- `node scripts/smoke-project-mentor.js`
- `node scripts/smoke-network-integration.js`
- `node scripts/smoke-agent-memory.js`
- `node scripts/smoke-backend-security.js`
- `node scripts/smoke-project-interactions.js`
- `node scripts/smoke-project-applications.js`
- Browser checks: schedule selection without navigation, center-column tabs, schedule form open/cancel, natural casual conversation without project actions, and an offline pop-up experiment answer grounded in selected WETHUS records.
- `node scripts/validate-static.js` retains the pre-existing failure that `opportunity-published.json` has no non-expired opportunity.
