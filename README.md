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
