# Commercial Management Platform

Web platform that centralizes clients, contacts, sales advisors, routes, visits, follow-ups, quotes and orders, with a KPI dashboard, visit map, advisor schedule, activity log and CSV report export.

## Stack

| Layer             | Technology                                          |
| ----------------- | --------------------------------------------------- |
| Backend           | NestJS (TypeScript) with Clean Architecture         |
| ORM / DB          | TypeORM + PostgreSQL (Amazon RDS)                   |
| Authentication    | betterAuth (roles: administrator, manager, advisor) |
| API documentation | Swagger / OpenAPI                                   |
| Frontend          | Svelte + Vite + Tailwind + Leaflet (OpenStreetMap)  |
| Files             | Amazon S3 (private bucket, signed URLs)             |
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
- PostgreSQL 16 locally (or Docker) for development
- Access to the development credentials

## Running locally

...

## Levantar con Docker

`docker-compose.yml` levanta la API (`cmp-api`), PostgreSQL (`cmp-postgres`) y pgAdmin (`cmp-pgadmin`). El frontend no entra al compose: sigue con `npm run dev` y su proxy apunta a `http://localhost:3000`.

1. Copia la configuración del backend (solo la primera vez):

   ```bash
   cp backend/.env.example backend/.env
   ```

   Dentro del compose la API usa `DB_HOST=postgres` y `DB_PORT=5432` aunque `backend/.env` diga `localhost`.

2. Levanta los servicios y revisa los logs de la API. Al arrancar aplica las migraciones y, solo si terminan bien, inicia la API:

   ```bash
   docker compose up -d --build
   docker compose logs -f api
   ```

3. Carga los datos de prueba (se puede repetir sin errores):

   ```bash
   docker compose exec api npm run seed
   ```

4. Comprueba `http://localhost:3000/api/health` y la documentación en `http://localhost:3000/api/docs`.

La API recarga sola al guardar cambios en `backend/src`: el código se monta como volumen, no hace falta reconstruir la imagen. Sí hay que reconstruirla (`docker compose up -d --build`) y recrear el volumen de dependencias (`docker compose down` y `docker volume rm commercial-management-platform_cmp_api_node_modules`) cuando cambie `package-lock.json`.

**Desarrollar la API sin Docker:** levanta solo la base de datos y arranca la API en tu equipo:

```bash
docker compose up -d postgres
cd backend && npm run start:dev
```

No dejes `cmp-api` corriendo a la vez: ambos usan el puerto 3000 y la misma carpeta `dist/`.

**Puertos ocupados:** si el 3000 ya está en uso, define `API_HOST_PORT` (por ejemplo `API_HOST_PORT=3001`) en un `.env` en la raíz del repositorio; para PostgreSQL existe `POSTGRES_HOST_PORT`.

**pgAdmin** (`http://localhost:5050`) es solo para desarrollo local: sus credenciales son de ejemplo y no se despliega en producción.

**Producción:** `backend/Dockerfile` tiene la etapa `production` (multiarquitectura, válida para EC2 ARM t4g), que corre como usuario `node`, aplica las migraciones y luego inicia `node dist/main.js`. Las variables se pasan como entorno del contenedor, nunca dentro de la imagen:

```bash
docker build --target production -t cmp-api ./backend
```

## Backend scripts

...

## Environment variables

See `backend/.env.example` and `frontend/.env.example`. No real values go into the repository.

## Deployment

1. PR from `feature/*` into `dev`, with review.
2. The lead opens the PR from `dev` to `main`.
3. The merge into `main` notifies Jenkins via webhook.
4. Jenkins runs: install dependencies → lint → tests → build → migrations → restart.
5. Verify with the health check: `GET /api/health`.

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

## license

MIT
