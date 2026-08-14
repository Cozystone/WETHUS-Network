# WETHUS AI Agent Memory

## Purpose

The Network home mentor uses a user-scoped temporal knowledge graph instead of sending only the current card to the model. The graph joins WETHUS profile, project, task, activity, team message, status snapshot, resource, integration, connection, bookmark, application, and conversation data so follow-up answers can use prior context.

## Runtime loop

1. Build a current snapshot from the actor's accessible WETHUS state.
2. Upsert typed nodes and relationships with timestamps and source metadata.
3. Recall query-relevant nodes, recent episodes, and one-hop neighbors.
4. Send only the bounded recalled subgraph to the configured model.
5. Persist the user question and assistant answer as conversation episodes.

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
