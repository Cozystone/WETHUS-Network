# Network home service integration

## Scope

- The signed-in home now acts as the shared entry point for a user's projects, tasks, schedule, people, and WETHUS AI.
- Existing WETHUS navigation, profile, project hub, exploration, opportunities, mentor, and DM routes remain the destination surfaces.
- The original production-connected WETHUS repository was not changed or deployed.

## Shared flows

- Project tasks use one stable task model across the home and project hub, including completion state and deep-link focus.
- Project schedule entries use one shared project-hub state across the home calendar, Network schedule, and the new project-hub schedule card.
- Network people and connection requests use actor-scoped backend routes. Public directory responses exclude email and private auth fields.
- Connection cancellation is retained as a local sync tombstone, merged by connection pair and latest timestamp, and hidden from UI, API responses, and AI memory so stale cloud state cannot resurrect a cancelled request.
- Recommended people open the existing public member profile by user ID and support connection or DM follow-up.
- ASK/OFFER posts, connection requests, task updates, schedule updates, and AI actions write semantic activity events.

## AI context

- Text, Markdown, CSV, JSON, and log attachments up to 256 KB can be read from the home AI panel.
- Attachments are stored as project resources, deduplicated by content identity, and ingested into the actor-scoped temporal knowledge graph.
- A focused document interpretation stage distinguishes stated intent, opinion, planned work, observed behavior, and measured results before project-wide reasoning.
- The response stage receives the interpreted finding, its limits, the decision impact, and the next evidence needed instead of matching isolated words.

## Verification

- `node scripts/smoke-agent-memory.js`
- `node scripts/smoke-network-integration.js`
- Browser round trips: home to Network schedule to project-hub schedule, home task to project-hub task, recommendation to public profile, connection request/cancel, and AI text attachment.
- Desktop and 390 px mobile layouts were checked without document-level horizontal overflow.
- `node scripts/validate-static.js` now parses CRLF Render secret blocks correctly; its remaining failure is the pre-existing stale `opportunity-published.json` feed with no non-expired item.
