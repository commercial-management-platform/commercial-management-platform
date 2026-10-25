# Commercial Management Platform

Web platform that centralizes clients, contacts, sales advisors, routes, visits, follow-ups, quotes and orders, with a KPI dashboard, visit map, advisor schedule, activity log and CSV report export.

## Live deployment

| What              | URL                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------- |
| Application       | [https://kestrel1.duckdns.org](https://kestrel1.duckdns.org)                           |
| API documentation | [https://kestrel1.duckdns.org/api/docs](https://kestrel1.duckdns.org/api/docs)         |
| Health check      | [https://kestrel1.duckdns.org/api/health](https://kestrel1.duckdns.org/api/health)     |

It runs on an EC2 instance with Docker Compose, PostgreSQL on Amazon RDS and files in a private S3 bucket. Jenkins deploys every change from GitHub, and HTTPS uses a Let's Encrypt certificate. Setup and recovery steps are in [docs/Infraestructura.md](docs/Infraestructura.md).

## Stack

| Layer             | Technology                                          |
| ----------------- | --------------------------------------------------- |
| Backend           | NestJS (TypeScript) with Clean Architecture         |
| ORM / DB          | TypeORM + PostgreSQL (Amazon RDS)                   |
| Authentication    | betterAuth (roles: admin, director, advisor)        |
| API documentation | Swagger / OpenAPI                                   |
| Frontend          | Svelte 5 + Vite + TypeScript + Leaflet (OpenStreetMap) |
| Files             | Amazon S3 (private bucket, signed URLs)             |
| Hosting           | EC2 with Docker Compose; Nginx with HTTPS (Let's Encrypt) |
| CI/CD             | Jenkins on EC2, triggered by a GitHub webhook       |

## Repository structure

```
.
├── backend/          # NestJS API
│   ├── src/
│   └── test/
├── frontend/         # Svelte app
├── docs/             # Architecture, infrastructure, decisions
└── Jenkinsfile       # Deployment pipeline
```

## Requirements

- Node.js 22 or higher and npm
- Docker (for PostgreSQL 16) or a local PostgreSQL 16

## Running locally

Quick start with the API and the frontend on your machine and only the database in Docker:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

docker compose up -d postgres

cd backend
npm ci
npm run migration:run
npm run seed          # users, catalogs, clients and demo data
npm run start:dev     # http://localhost:3000/api/docs

cd ../frontend
npm ci
npm run dev           # http://localhost:5173
```

- The seed creates one user per role from the `SEED_*` variables in `backend/.env`, plus four demo advisors when `SEED_DEMO_PASSWORD` is set.
- The demo data (routes, visits, quotes, orders and follow-ups) takes today as reference. Set `SEED_REFERENCE_DATE=YYYY-MM-DD` to choose another day.
- `S3_BUCKET_NAME` is required to start the API. Locally, uploading files only works with your own bucket and AWS credentials.

To run the API in Docker too, see the next section.

## Running with Docker

There are two compose files, and both read **everything** from a `.env` at the repository root (a copy of [`.env.example`](.env.example)): credentials, database host and ports. The compose files hardcode no values and fail with a clear message when a variable is missing. The `.env` is never committed.

| File | Use | Services |
|---|---|---|
| `docker-compose.yml` | Local development | `api` (with reload), `postgres`, `pgadmin` |
| `docker-compose.prod.yml` | EC2 | `api` (production image), `web` (Nginx with the frontend and `/api`) and an optional `postgres` for testing without RDS |

Each port is the same inside the container and on your machine (`PORT`, `DB_PORT`, `PGADMIN_PORT`, `WEB_PORT`). If one is taken, change it in the `.env`.

### Local

1. Copy the configuration (first time only):

   ```bash
   cp .env.example .env
   ```

2. Start the services and follow the API logs. On startup the API applies the migrations and starts only if they succeed:

   ```bash
   docker compose up -d --build
   docker compose logs -f api
   ```

3. Load the seed data (safe to run again):

   ```bash
   docker compose exec api npm run seed
   ```

4. Check `http://localhost:3000/api/health` and the docs at `http://localhost:3000/api/docs` (with the `PORT` from your `.env`).

The frontend is not part of the local compose: run it with `npm run dev`. Its proxy points to `VITE_API_PROXY` (`http://localhost:3000` by default).

The API reloads on its own when you save changes in `backend/src`: the code is mounted as a volume, so there is no need to rebuild the image. The code is compiled once and, after each compilation, `backend/scripts/dev-start.sh` applies pending migrations before starting the API. A new migration is applied when you save it; if it fails, the API does not start until it is fixed (the error shows in `docker compose logs api`). Rebuild the image (`docker compose up -d --build`) and recreate the dependencies volume (`docker compose down` and `docker volume rm commercial-management-platform_cmp_api_node_modules`) when `package-lock.json` changes.

**API without Docker:** start only the database and run the API on your machine with `backend/.env` (a copy of `backend/.env.example`, with `DB_HOST=localhost` and the same `DB_PORT`):

```bash
docker compose up -d postgres
cd backend && npm run start:dev
```

Don't keep `cmp-api` running at the same time: both use the same port and the same `dist/` folder.

**pgAdmin** (`http://localhost:5050`, or your `PGADMIN_PORT`) is for local development only and is not in the production compose.

### Production (EC2)

Jenkins does the deployment (see [Deployment](#deployment)). The production `.env` is the `cmp-env` Jenkins credential. It holds `NODE_ENV=production`, a unique `BETTER_AUTH_SECRET`, `CORS_ORIGIN` and `BETTER_AUTH_URL` set to the public URL (`https://kestrel1.duckdns.org`), the RDS settings and the S3 bucket. Only `WEB_PORT` (80) and 443 are published. Nginx serves the frontend with the Let's Encrypt certificate in the server's `/etc/letsencrypt` and forwards `/api` to the API, so both share the same origin. The API is not exposed to the internet.

By hand, for emergencies only (from the project folder, with the production `.env`):

```bash
# With RDS (DB_HOST=<RDS endpoint>, DB_SSL=true)
docker compose -f docker-compose.prod.yml up -d --build

# Without RDS, for testing only: PostgreSQL on the same EC2 (DB_HOST=postgres, DB_SSL=false)
docker compose -f docker-compose.prod.yml --profile local-db up -d --build
```

Initial and demo data. The production image doesn't compile, so it uses `seed:prod`; running it again doesn't duplicate data:

```bash
sudo docker exec -e SEED_REFERENCE_DATE=2026-10-26 cmp-prod-api-1 npm run seed:prod
```

The API image (`backend/Dockerfile`, `production` stage) is multi-arch (works on ARM t4g EC2), runs as the `node` user, applies migrations before starting and includes the RDS public certificate to connect with `DB_SSL=true`. Container logs rotate (10 MB × 3) so they don't fill the disk.

## Backend scripts

Run them from `backend/`:

| Script | What it does |
| ------ | ------------ |
| `npm run start:dev` | API with reload on save |
| `npm run build` | Compiles to `dist/` |
| `npm run lint` | oxlint with type-aware rules |
| `npm test` | Unit tests (vitest) |
| `npm run test:e2e` | e2e tests (some need the PostgreSQL from Docker) |
| `npm run test:cov` | Unit tests with coverage |
| `npm run migration:run` / `migration:revert` | Applies or reverts migrations |
| `npm run migration:generate` | Generates a migration from the entities |
| `npm run seed` | Builds and runs the seeds (users, catalogs, clients, demo data) |
| `npm run seed:prod` | Runs the seeds from the compiled image (production) |

Frontend (`frontend/`): `npm run dev`, `npm run build` and `npm run check` (svelte-check).

## Environment variables

See `.env.example` (Docker), `backend/.env.example` (API without Docker) and `frontend/.env.example`. No real values go into the repository.

## Deployment

1. PR from `feature/*` into `dev`, with review.
2. The lead opens the PR from `dev` to `main`.
3. The merge notifies Jenkins through the GitHub webhook. The `cmp-deploy` job deploys the branch it is configured with: `main` for the delivery, `dev` while testing.
4. The [`Jenkinsfile`](Jenkinsfile) runs: checkout → `.env` from the `cmp-env` credential → install dependencies → quality (lint and tests; a failure stops the deployment) → build images → migrations → deploy → verify `GET /api/health`.
5. A deployment takes about 3 minutes. If a stage before deploy fails, the running version is left untouched; if the final health check fails, the build is marked failed and the last 50 API log lines are printed.

## How to contribute

Branches, commits, PRs, architecture rules and DoD: [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Team

| Member            | Role                                                |
| ----------------- | --------------------------------------------------- |
| Neyder Ramírez    | Lead: coordination, architecture and integration    |
| José Luis Acevedo | Database: TypeORM, migrations and integrity         |
| Natalia           | Backend: clients and contacts                       |
| Ricardo           | Frontend: navigation, forms and API integration     |
| Stevel Iglesias   | Backend: routes, visits, results and schedule       |
| Brayan Lozada     | Backend: authentication, permissions and follow-ups |
| Laura Neira       | Infrastructure: AWS, Jenkins and environments       |

## License

MIT
