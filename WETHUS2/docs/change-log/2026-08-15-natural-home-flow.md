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

- Greetings, acknowledgements, capability questions, and punctuation-only turns use short conversational replies without project actions or evidence banners.
- Lightweight conversation does not overwrite project mentor summaries or create project semantic events.
- Project-specific questions still use the backend mentor, temporal knowledge graph, and actionable project suggestions.
- Stored chat history is normalized so earlier greeting and clarification replies no longer show generic project recommendations.

## Verification

- `node scripts/smoke-project-mentor.js`
- `node scripts/smoke-network-integration.js`
- `node scripts/smoke-agent-memory.js`
- `node scripts/smoke-backend-security.js`
- `node scripts/smoke-project-interactions.js`
- `node scripts/smoke-project-applications.js`
- Browser checks: schedule selection without navigation, center-column tabs, schedule form open/cancel, natural `안녕` and `?` replies, and project-contextual mentor reply.
- `node scripts/validate-static.js` retains the pre-existing failure that `opportunity-published.json` has no non-expired opportunity.
