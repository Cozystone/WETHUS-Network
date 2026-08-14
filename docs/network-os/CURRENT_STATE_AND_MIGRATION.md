# WETHUS Network OS: Current State and Migration

## Current state

The current product is a static multi-page frontend backed by a large shared `app.js` state layer and an Express API on Render.

- Frontend: static HTML/CSS/JavaScript in `WETHUS2/`
- Shared client state: `localStorage` plus `/cloud/state` merge/sync
- Backend: one Express service in `WETHUS2/backend/server.js`
- Persistence: JSON files in the backend data directory; the PostgreSQL schema is still a proposal
- Authentication: email/password and Google, Naver, and Kakao callbacks with cookie sessions
- Core working assets: project submission/moderation, discovery, applications, likes, comments, bookmarks, DM, Project Hub, mentor calls, opportunities, profile, admin review, OAuth integrations, and activity-event ingestion
- Deployment: static frontend on Vercel and API on Render

The existing visual system is recognisable and worth preserving: near-black surfaces, orange signals, dense editorial typography, thin borders, and restrained glass effects. The main UX limitation is not styling. Navigation, data, and page hierarchy still treat the project as the primary object, while profile evidence, activity, asks, connections, and opportunities are scattered across separate screens.

## Reuse, change, add

### Reuse

- Existing authentication and session endpoints
- Founder submission and moderation workflow
- Project, application, interaction, DM, mentor, opportunity, and integration endpoints
- Existing activity-event endpoint and external integration ingestion
- Existing WETHUS black/orange design language
- Existing legal, privacy, support, and operator workflows

### Change

- Make `Person` the primary navigation and recommendation context
- Replace the generic home page after sign-in with `For You`
- Turn profile into an activity-derived Living Portfolio
- Treat Project Hub as a workspace that emits semantic events
- Replace unexplained numeric scoring with evidence, momentum, and narrative
- Consolidate discovery into People, Projects, ASK/OFFER, and Opportunities
- Use one responsive shell instead of independently wrapping page headers

### Add

- Canonical activity/event envelope
- Contributions, asks, offers, connections, and nominations
- Person-to-person and person-to-opportunity recommendation explanations
- Visibility and consent fields on every event-derived profile surface
- Durable projection jobs for Living Portfolio and recommendation read models

## Target information architecture

1. For You
2. People
3. Projects
4. Opportunities
5. Network
6. My WETHUS

`Project Workspace` remains a deep route reached from Projects, For You, or My WETHUS.

## Canonical event envelope

```json
{
  "id": "evt_uuid",
  "actorId": "person_uuid",
  "action": "contribution_created",
  "targetType": "project",
  "targetId": "project_uuid",
  "projectId": "project_uuid",
  "organizationId": null,
  "context": "workspace",
  "source": "wethus|github|figma|notion|manual",
  "visibility": "private|team|network|public",
  "occurredAt": "ISO-8601",
  "metadata": {},
  "schemaVersion": 1
}
```

Events are immutable facts. Living Portfolio, activity feeds, project momentum, contribution narratives, recommendations, and partner reports are projections derived from those facts.

## Migration slices

### Slice 1: activity foundation

- Normalize the existing `/activity-events` contract around the canonical envelope.
- Backfill project creation, joining, application acceptance, task completion, mentor sessions, and integration events.
- Add idempotency keys and visibility defaults.

### Slice 2: Living Portfolio

- Build a read projection by person.
- Render Currently Building, Contributions, Worked With, Helped, ASK/OFFER, and Journey.
- Keep user-editable profile copy separate from system-derived evidence.

### Slice 3: network actions

- Add ASK, OFFER, connection, and nomination tables/endpoints.
- Route asks to people using explicit skill, interest, availability, and relationship signals.

### Slice 4: recommendation layer

- Start with deterministic candidate generation and explainable rules.
- Add provider-neutral embeddings and LLM summaries only after event quality is measurable.

## Privacy defaults

- Track the work, not the child.
- Private messages, precise location, family context, and sensitive identity data never enter matching by default.
- Every activity event carries visibility and source.
- Partner discovery is opt-in and opportunity-first; partners do not receive unrestricted student search.
- AI outputs describe evidence and possible connections. They do not assign human rankings or permanent scores.

## Integrated slice in WETHUS2

The first Network OS slice now lives inside the copied product in `WETHUS2/`; it is not a replacement application.

- `project-hub.html` keeps the existing project, mentor, team, material, application, and integration flows.
- The workspace now prioritizes current focus, next action, connected activity, and evidence gaps before secondary analysis.
- Numeric progress grading has been replaced with narrative momentum based on observable work signals.
- `app.js` records a canonical semantic activity envelope alongside existing state so project activity can be projected into the hub without discarding the current cloud-state contract.
- The original WETHUS2 repository and the `wethus.co.kr` deployment remain outside this migration branch.

## Prototype boundary

`network-preview/` remains a design checkpoint only. Product work must be integrated into the copied `WETHUS2/` application and verified against its real authentication, project, hub, and backend flows before any release decision.
