# Database

idkdo uses PostgreSQL for persistent storage. Drizzle owns schema definition,
typed database access, and migrations.

## Local PostgreSQL

Local development uses Docker Compose PostgreSQL.

Start PostgreSQL from the repository root:

```sh
pnpm db:up
```

This starts PostgreSQL 17 on `localhost:5432` with stable local values:

```txt
database: idkdo
username: idkdo
password: idkdo
port: 5432
```

Use this connection string for the server and Drizzle commands:

```sh
DATABASE_URL=postgres://idkdo:idkdo@localhost:5432/idkdo
```

The same value is included in `.env.example`.

## Healthcheck

The Compose service uses `pg_isready`:

```sh
pg_isready -U idkdo -d idkdo
```

Dependent services or scripts can wait for the `postgres` service to become
healthy before running database-backed commands.

## Persistence

PostgreSQL data is stored in the named Docker volume `idkdo_postgres_data`.
Data survives container restarts and `pnpm db:down`.

Remove the volume only when you intentionally want to reset local database
state:

```sh
docker compose down -v
```

## Commands

```sh
pnpm db:up
DATABASE_URL=postgres://idkdo:idkdo@localhost:5432/idkdo pnpm db:generate
DATABASE_URL=postgres://idkdo:idkdo@localhost:5432/idkdo pnpm db:migrate
pnpm db:logs
pnpm db:down
```

`pnpm db:up` starts PostgreSQL in the background.
`pnpm db:generate` generates Drizzle migrations from `packages/db/src/schema.ts`.
`pnpm db:migrate` applies Drizzle migrations through `packages/db/drizzle.config.ts`.
`pnpm db:logs` tails PostgreSQL logs.
`pnpm db:down` stops the Compose services without deleting the database volume.
