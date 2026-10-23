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

Hay dos archivos compose y los dos leen **todo** de un `.env` en la raíz del repositorio (copia de [`.env.example`](.env.example)): credenciales, host de la base y puertos. El compose no fija ningún valor y falla con un mensaje claro si falta una variable. El `.env` nunca se sube al repositorio.

| Archivo | Uso | Servicios |
|---|---|---|
| `docker-compose.yml` | Desarrollo local | `api` (con recarga), `postgres`, `pgadmin` |
| `docker-compose.prod.yml` | EC2 | `api` (imagen de producción), `web` (Nginx con el frontend y `/api`) y `postgres` opcional mientras RDS no esté listo |

Cada puerto es el mismo dentro del contenedor y en tu equipo (`PORT`, `DB_PORT`, `PGADMIN_PORT`, `WEB_PORT`). Si uno está ocupado, cámbialo en el `.env`.

### Local

1. Copia la configuración (solo la primera vez):

   ```bash
   cp .env.example .env
   ```

2. Levanta los servicios y revisa los logs de la API. Al arrancar aplica las migraciones y, solo si terminan bien, inicia la API:

   ```bash
   docker compose up -d --build
   docker compose logs -f api
   ```

3. Carga los datos de prueba (se puede repetir sin errores):

   ```bash
   docker compose exec api npm run seed
   ```

4. Comprueba `http://localhost:3000/api/health` y la documentación en `http://localhost:3000/api/docs` (con el `PORT` de tu `.env`).

El frontend no entra al compose local: sigue con `npm run dev` y su proxy apunta a `VITE_API_PROXY` (por defecto `http://localhost:3000`).

La API recarga sola al guardar cambios en `backend/src`: el código se monta como volumen, no hace falta reconstruir la imagen. El código se compila una sola vez y, tras cada compilación, `backend/scripts/dev-start.sh` aplica las migraciones pendientes antes de iniciar la API: una migración nueva se aplica al guardarla y, si falla, la API no inicia hasta corregirla (el error queda en `docker compose logs api`). Sí hay que reconstruirla (`docker compose up -d --build`) y recrear el volumen de dependencias (`docker compose down` y `docker volume rm commercial-management-platform_cmp_api_node_modules`) cuando cambie `package-lock.json`.

**Desarrollar la API sin Docker:** levanta solo la base de datos y arranca la API en tu equipo, con `backend/.env` (copia de `backend/.env.example`, con `DB_HOST=localhost` y el mismo `DB_PORT`):

```bash
docker compose up -d postgres
cd backend && npm run start:dev
```

No dejes `cmp-api` corriendo a la vez: ambos usan el mismo puerto y la misma carpeta `dist/`.

**pgAdmin** (`http://localhost:5050`, o tu `PGADMIN_PORT`) es solo para desarrollo local y no existe en el compose de producción.

### Producción (EC2)

En el servidor, el `.env` de la raíz se escribe ahí (por ejemplo, desde una credencial de Jenkins) con `NODE_ENV=production`, un `BETTER_AUTH_SECRET` propio y `CORS_ORIGIN` y `BETTER_AUTH_URL` con la URL pública. Solo se publica `WEB_PORT`: Nginx sirve el frontend y redirige `/api` a la API, así ambos comparten origen. La API no se expone al exterior.

```bash
# Con RDS (DB_HOST=<endpoint de RDS>, DB_SSL=true)
docker compose -f docker-compose.prod.yml up -d --build

# Mientras RDS no esté listo: PostgreSQL en la misma EC2 (DB_HOST=postgres, DB_SSL=false)
docker compose -f docker-compose.prod.yml --profile local-db up -d --build

# Datos iniciales (la imagen de producción no compila: usa seed:prod)
docker compose -f docker-compose.prod.yml exec api npm run seed:prod
```

La imagen de la API (`backend/Dockerfile`, etapa `production`) es multiarquitectura (válida para EC2 ARM t4g), corre como usuario `node`, aplica las migraciones antes de iniciar y trae el certificado público de RDS para conectarse con `DB_SSL=true`. Los logs de los contenedores rotan (10 MB × 3) para no llenar el disco.

## Backend scripts

...

## Environment variables

See `.env.example` (Docker), `backend/.env.example` (API without Docker) and `frontend/.env.example`. No real values go into the repository.

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
