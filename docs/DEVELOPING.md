# Developing

Local development uses a pnpm workspace, a Fastify API server, and Docker
Compose PostgreSQL.

## Prerequisites

- Node.js 24.15 or newer in the Node.js 24 release line
- pnpm 11.5.0
- Docker

## Start Dev

From the repository root:

```sh
pnpm install
pnpm db:up
pnpm dev
```

This starts the API server in watch mode at `http://localhost:3000` and the web
app at `http://localhost:4200`. The web development server proxies relative
`/api` requests to the API server.

The server and Drizzle commands load the root `.env` file by default. In
deployed environments, provide `DATABASE_URL` through the process environment or
the deployment platform's secret mechanism.

## Quick Health Check

```sh
curl http://localhost:3000/api/health
```

Expected response:

```json
{"service":"idkdo-api","status":"ok"}
```

## Database

```sh
pnpm db:up
pnpm db:migrate
pnpm db:logs
pnpm db:down
```

Use `pnpm db:generate` after changing the Drizzle schema. See `DATABASE.md` for
connection details and reset behavior.

## Test Commands

Use the cheap local default unless you are specifically checking a broader
handoff:

```sh
pnpm test
```

For interactive server test watch mode:

```sh
pnpm --filter @idkdo/server test:watch
```

Run this full check before PR-ready handoff, or when narrower checks do not
cover the risk:

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```
