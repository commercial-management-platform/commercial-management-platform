# Contributing guide

Team working rules

## 1. Branches

| Branch | Purpose | Who merges |
|---|---|---|
| `main` | Production. Every merge triggers the deployment in Jenkins (EC2). | Only the lead, from `dev` |
| `dev` | Integration. All features land here. | Anyone, with 1 approval |
| `feature/HU-XX-short-description` | Work on a user story (HU) or subtask | — |
| `fix/HU-XX-short-description` | Fix for something already integrated into `dev` | — |
| `hotfix/short-description` | Urgent fix on `main` (branches off `main` and goes back into `main` and `dev`) | Only the lead |
| `chore/short-description` | Configuration, dependencies, documentation, infrastructure | — |

Rules:

- Always create the branch from an up-to-date `dev`: `git checkout dev && git pull && git checkout -b feature/HU-03-register-client`.
- Names in lowercase, with hyphens and no accents or "ñ".
- A branch lives at most 1 day. If the task is bigger, split it into subtasks.
- Nobody pushes directly to `main` or `dev` (protected on GitHub).
- Before opening the PR: `git pull --rebase origin dev` and resolve conflicts locally.

## 2. Commits

[Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<module>): <description in imperative mood> [HU-XX]
```

Examples:

```
feat(clients): add use case to deactivate client [HU-03]
fix(visits): validate that the scheduled date is not in the past [HU-08]
chore(infra): add Jenkinsfile with migrations stage [HU-19]
docs(readme): document environment variables
```

| Type | When |
|---|---|
| `feat` | New functionality |
| `fix` | Bug fix |
| `refactor` | Code change that doesn't change behavior |
| `test` | Add or fix tests |
| `docs` | Documentation only |
| `chore` | Configuration, dependencies, scripts, CI |
| `style` | Formatting (prettier), no logic changes |

- The module is the folder name in `backend/src/modules/` or `frontend` / `infra` / `db`.
- Description in English, lowercase, no trailing period, at most ~72 characters.
- Small commits: one commit = one change that makes sense on its own.
- If the GitHub–ClickUp integration is connected, also add the task ID (`#86e3t7xev`) so the commit is linked to the user story.

## 3. Pull requests

- Target: `dev` (never `main`, except for the release done by the lead).
- Title in the same format as commits: `feat(clients): client CRUD [HU-03]`.
- At least **1 approval** from someone other than the author. Frontend PRs are reviewed by Ricardo, and entity or migration PRs by José.
- Use the `.github/pull_request_template.md` template (includes how to test it).
- Merge with **Squash and merge** and delete the branch.
- A PR is not approved if:
  - `npm run lint`, `npm run test` or `npm run build` fail.
  - It includes `.env`, credentials, keys or media files (images and PDFs go to S3).
  - It breaks the architecture rules in section 4.

## 4. Architecture rules (Clean Architecture)

Each backend module follows this structure:

```
backend/src/modules/clients/
├── domain/            # Pure entities and rules. Repository interfaces (ports).
├── application/       # Use cases. Depend only on domain.
├── infrastructure/    # TypeORM entities, concrete repositories, mappers, S3, betterAuth.
├── presentation/      # REST controllers, DTOs with class-validator and Swagger decorators.
└── clients.module.ts # Composition: wires ports to their implementations.
```

- `domain/` and `application/` **do not import** anything from `@nestjs/*`, `typeorm`, `@aws-sdk/*` or `better-auth`.
- Dependencies point inward: `presentation → application → domain` and `infrastructure → domain`.
- Controllers contain no business logic: they validate input, call a use case and respond.
- The domain entity and the TypeORM entity are separate classes, joined by a mapper.
- Shared code (domain errors, pagination, utilities) goes in `backend/src/shared/`.

## 5. Database

- Schema changes **only through** TypeORM **migrations** (`synchronize: false` always).
- One migration per change, with a descriptive name: `CreateClientTable`, `AddLatLngToClient`.
- Never edit a migration that is already in `dev`; create a new one.
- Catalogs (zones, client types, potential, statuses, visit results) are loaded with seeds.
- Table and column names in English and `snake_case`, following the [naming glossary](docs/naming-glossary.md).

## 6. AI-generated frontend

- Use the single frontend guide (Svelte + Vite + Tailwind + Leaflet stack) and the Swagger contract.
- Generate per module, never the whole application at once.
- Whoever opens the PR must be able to explain every generated file. This will be asked during the project defense.
- No hardcoded URLs, keys or data: the API URL comes from `VITE_API_URL`.

## 7. Definition of Done (DoD)

A user story is done when:

- [ ] It meets all its acceptance criteria.
- [ ] Endpoints are documented in Swagger (`/api/docs`).
- [ ] It has at least one test for the main use case.
- [ ] PR approved and merged into `dev`.
- [ ] Deployed to EC2 by Jenkins and tested there.
- [ ] No secrets or media files in the repository.
- [ ] Status updated in ClickUp.

## 8. Secrets and environment variables

- Each app has its own `.env.example` with **all** variables and example values, never real ones.
- Real values live on the server and in the Jenkins credentials. They are shared through a private channel, never through the repo or the group chat.
- If someone pushes a secret by mistake: notify the lead immediately and **rotate** the credential (deleting the commit is not enough).
