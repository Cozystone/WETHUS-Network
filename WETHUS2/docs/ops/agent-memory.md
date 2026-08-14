# WETHUS AI Agent Memory

## Purpose

The Network home mentor uses a user-scoped temporal knowledge graph instead of sending only the current card to the model. The graph joins WETHUS profile, project, task, activity, team message, status snapshot, resource, integration, connection, bookmark, application, and conversation data so follow-up answers can use prior context.

## Runtime loop

1. Build a current snapshot from the actor's accessible WETHUS state.
2. Upsert typed nodes and relationships with timestamps and source metadata.
3. Build a broad candidate subgraph from the focused project, its relationships, recent episodes, recency, and lightweight lexical signals.
4. Run a context-understanding pass that infers the user's real intent, reconstructs the situation and timeline, identifies constraints and causal links, and selects only records that can change the answer.
5. For follow-ups that name a person or refer to an earlier proposal, resolve the exact message and run focused causal checks: whether the proposal creates missing evidence, changes the failed step, has explicit support, or conflicts with the goal.
6. Run a separate response pass using the synthesized situation model and selected records, rather than a dump of search snippets.
7. Keep provenance in response metadata while the visible answer shows only a short context count, then persist the user question and the interpreted assistant answer as conversation episodes.

The lexical score is deliberately secondary. It helps widen the candidate set but cannot decide the final context. `dolphin3:latest` currently exposes completion only in the local Ollama runtime, so the semantic selection is performed by the first structured reasoning pass instead of pretending that keyword overlap is semantic retrieval.

The implementation is original Node.js code in `backend/agent-memory.js`. It follows ideas documented by Graphiti (temporal, provenance-aware graph memory) and Mem0 (recall before response, store after response). Both reference projects use Apache-2.0 licenses; no third-party source code is copied into WETHUS.

References:

- https://github.com/getzep/graphiti
- https://github.com/mem0ai/mem0
- https://docs.ollama.com/api/introduction

## Privacy boundary

- Each graph is stored under a one-way hash of the actor ID.
- Production requires an authenticated matching session by default.
- Passwords, tokens, OAuth secrets, and raw email addresses are not graph attributes.
- `GET /ai/memory/graph` returns only the current actor's graph.
- `DELETE /ai/memory` deletes only the current actor's graph.
- Account export and account deletion include the agent-memory store.

## Local Ollama

Set the following in `backend/.env` and start the backend after Ollama is running:

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=dolphin3:latest
OLLAMA_KEEP_ALIVE=10m
AI_MEMORY_REQUIRE_SESSION=false
```

The deployed static preview cannot reach a model running on a private PC. A commercial deployment must use a hosted provider or a separately secured model service; do not expose port `11434` directly to the public internet.
