# BiiiG

AI-native IDE for vertical industries. Inspired by TRAE and Codex.

## Monorepo Structure

- `apps/desktop` - Electron + React AI panel (integrates with Code-OSS)
- `apps/server` - NestJS backend: model routing, agent orchestration, repo wiki
- `packages/shared` - Shared TypeScript types and utilities
- `packages/mcp` - Model Context Protocol implementation
- `templates` - Vertical industry project templates

## Quick Start

### 1. Install dependencies

```bash
# Skip Electron binary download in CI/network-restricted environments
ELECTRON_SKIP_BINARY_DOWNLOAD=1 pnpm install
```

### 2. Configure model API keys (optional for development)

```bash
cp apps/server/.env.example apps/server/.env
# Edit apps/server/.env and add at least one API key:
# DEEPSEEK_API_KEY=sk-...
# DOUBAO_API_KEY=...
# QWEN_API_KEY=...
```

If no API keys are provided, the backend starts but model-dependent endpoints return errors.

### 3. Build shared packages & server

```bash
pnpm --filter @biiig/shared build
pnpm --filter @biiig/server build
```

### 4. Start backend

```bash
# Without DATABASE_URL, the server uses an embedded SQL.js database (biiig.sqlite)
cd apps/server && node dist/apps/server/src/main.js
```

The API is available at `http://localhost:3000/api`.

### 5. Start desktop frontend (web mode)

In a new terminal:

```bash
pnpm --filter @biiig/desktop dev:web
```

The desktop UI runs at `http://localhost:5173`.

> **Note:** Full Electron launch requires downloading the Electron binary. In restricted environments, use the web mode above or set `ELECTRON_SKIP_BINARY_DOWNLOAD=1` and provide a local Electron binary.

## MVP Scope

1. AI IDE shell with chat, inline completion, AI Edit
2. Multi-model routing (DeepSeek, Doubao, Qwen) with cost-aware fallback
3. Agent mode with task planning, file/terminal tools, and three approval levels
4. WeChat Mini Program + E-commerce project templates with one-click generation
5. Repo Wiki with code indexing and keyword search
6. MCP protocol foundation
7. REST + SSE real-time streaming

## API Highlights

- `POST /api/conversations/:id/messages` — SSE streaming chat
- `POST /api/agent/tasks/:id/execute` — SSE streaming agent execution
- `POST /api/templates/:id/generate` — generate project from template
- `POST /api/projects/:id/wiki/index` — index repo wiki
- `GET /api/projects/:id/wiki/search?q=...` — search repo wiki

## Production Notes

- Set `DATABASE_URL` to a PostgreSQL instance (see `docker-compose.yml`)
- Use `NODE_ENV=production` to disable schema synchronization
- Encrypt API keys at rest; rotate regularly
