# AGENTS.md

Guía de contexto para agentes de IA que trabajen en este repositorio. Su objetivo es dar hechos verificables del código real para **evitar alucinaciones**. Si algo no está en este archivo ni en el código, no lo asumas: búscalo.

## 1. Qué es este proyecto

Plataforma web de gestión comercial (clientes, contactos, asesores, rutas, visitas, seguimientos, cotizaciones y pedidos). El backend es una API NestJS con Clean Architecture. El frontend aún está vacío.

Estructura del monorepo (raíz `commercial-management-platform/`):

```
.
├── backend/                 # API NestJS (todo el código real vive aquí)
│   ├── src/
│   ├── test/                # Pruebas e2e (*.e2e-spec.ts)
│   └── package.json
├── frontend/                # Vacío por ahora (solo .gitkeep)
├── docs/
│   ├── architecture.md      # Reglas de arquitectura (fuente de verdad)
│   └── naming-glossary.md   # Nombres de tablas/columnas/módulos
├── docker-compose.yml       # Postgres 16 local
├── CONTRIBUTING.md          # Ramas, commits, PRs, DoD
└── README.md
```

Stack: NestJS 12, TypeScript (ESM/NodeNext), TypeORM + PostgreSQL (Amazon RDS), class-validator, Swagger, Vitest, oxlint, Prettier. Autenticación con betterAuth **planeada, no instalada aún**.

## 2. Estado actual (NO inventar lo que no existe)

Módulos existentes en `backend/src/modules/`: **`health`**, **`routes`**, **`clients`**.

- `routes` (HU-07, en curso): módulo completo (domain / application / infrastructure / presentation) con controlador `RoutesController` en `/api/routes`.
- `clients`: **no tiene controlador ni casos de uso todavía**. Solo tiene `domain/client.ts`, `domain/client.repository.ts`, el repositorio TypeORM, el mapper y entidades ORM. No expone endpoints.
- `health`: `GET /api/health`.
- Contacto y historial de cliente: solo existen como entidades ORM (`contacto-cliente.orm-entity.ts`, `historial.orm-entity.ts`) y clases de dominio. **No están conectadas a ningún caso de uso ni tabla migrada.**
- No existen módulos `users`, `advisors`, `visits`, `contacts`, `follow-ups`, `quotes`, `sales-orders`, `catalogs`, ni implementación de autenticación/autorización. No los crees sin que la tarea lo pida.

Tablas existentes (migraciones): `client`, `route`, `route_client`. No hay FKs a catálogos (zone, client_type, etc.) todavía; son columnas enteras nullables.

## 3. Comandos (ejecutar desde `backend/`)

Verificados en este repo:

```bash
npm run lint          # oxlint --type-aware src/ test/
npm run test          # vitest run (unitarias)
npm run test:e2e      # vitest run --config ./vitest.config.e2e.ts (requiere Postgres)
npm run build         # nest build  →  dist/
npm run start:dev     # nest start --watch
```

Base de datos (compilan antes y usan `dist/` con ESM; leen `backend/.env`):

```bash
npm run migration:generate -- --name=CreateClientTable   # nombre PascalCase obligatorio
npm run migration:run
npm run migration:revert
npm run seed
```

`test:e2e` **necesita** Postgres levantado (`docker compose up -d postgres` desde la raíz), migraciones aplicadas y el seed ejecutado (las pruebas e2e asumen el `client` con id `1`). Las unitarias (`*.spec.ts`) no necesitan base de datos.

Antes de dar una tarea por terminada: `npm run lint`, `npm run test` y `npm run build` deben pasar.

## 4. Reglas de arquitectura (obligatorias)

Un módulo tiene cuatro capas. Dirección de dependencias: `presentation → application → domain` e `infrastructure → domain`.

| Capa | Contiene | Puede importar |
|---|---|---|
| `domain/` | Entidades puras, reglas, interfaces de repositorio (puertos) y sus tokens | Nada externo (ni `@nestjs/*` ni `typeorm`) |
| `application/` | Casos de uso (clases puras, sin decoradores) | Solo `domain/` |
| `infrastructure/` | `*.orm-entity.ts`, repositorios concretos, mappers, adaptadores | `domain/`, NestJS, TypeORM |
| `presentation/` | Controladores REST y DTOs | `application/`, `domain/`, NestJS |

- `domain/` y `application/` **nunca** importan `@nestjs/*`, `typeorm`, `@aws-sdk/*` ni `better-auth`.
- El único archivo que conoce todas las capas es `<modulo>.module.ts`.
- El controlador no tiene lógica de negocio: valida el DTO, llama al caso de uso y responde.
- Entidad de dominio y entidad TypeORM son clases separadas, unidas por un mapper.
- Código compartido en `backend/src/shared/`.

Patrón de composición real (ver `routes.module.ts`): los casos de uso se declaran con `useFactory` + `inject` usando tokens `Symbol` (p. ej. `ROUTE_REPOSITORY = Symbol('ROUTE_REPOSITORY')`), no con `@Injectable` sobre el caso de uso.

Errores de negocio: se lanzan desde `domain/` o `application/` con las clases de `shared/domain/errors` (`NotFoundError` → 404, `ConflictError` → 409, `ForbiddenError` → 403, cualquier otro `DomainError` → 400). El `DomainExceptionFilter` global los traduce a `{ statusCode, error, message }`. Nunca expone stack traces.

## 5. Convenciones de código (fáciles de romper)

- **ESM/NodeNext:** `package.json` tiene `"type": "module"` y `tsconfig` usa `nodenext`. Todo import relativo **debe terminar en `.js`** aunque el archivo fuente sea `.ts` (ej. `import { Route } from './route.js'`).
- No hay alias de rutas configurados en `tsconfig.json`: usa imports relativos.
- No hay barrel files por módulo. La única excepción es `shared/domain/errors/index.ts`.
- Estilo: Prettier (`singleQuote: true`, `trailingComma: 'all'`). Sin comentarios salvo que la tarea lo pida.
- `typescript/no-explicit-any` está desactivado en oxlint, pero `no-floating-promises` es **error**: maneja siempre las promesas.
- DTOs: `class-validator` + decoradores `@ApiProperty` de Swagger. El `ValidationPipe` global usa `whitelist`, `forbidNonWhitelisted` y `transform`; cualquier propiedad no declarada en el DTO provoca 400.
- **Fechas de calendario** se manejan como texto `YYYY-MM-DD` (tipo `date` en Postgres, string en TypeScript) para que la zona horaria no las desplace. Horas como `HH:mm` (regex `TIME_HH_MM`). Ver `create-route.dto.ts`.
- Nombres de tablas, columnas y módulos en inglés y `snake_case`/plural según `docs/naming-glossary.md`. Excepción: `nit` conserva el nombre colombiano.

## 6. Configuración HTTP global

Definida en `backend/src/app.setup.ts` y compartida por `main.ts` y los e2e:

- Prefijo global `api` → los endpoints son `/api/...`.
- Swagger en `/api/docs`.
- CORS desde `CORS_ORIGIN` (lista separada por comas).

Variables de entorno (validadas en `config/env.validation.ts`; el arranque falla si falta una obligatoria): `NODE_ENV` (default `development`), `PORT` (default `3000`), `CORS_ORIGIN`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL` (default `false`; `"false"` se interpreta como `false`). Plantilla en `backend/.env.example`.

## 7. Base de datos

- `synchronize: false` **siempre** y las migraciones no se ejecutan al arrancar.
- El esquema solo cambia con migraciones; nunca edites una migración ya integrada en `dev`, crea una nueva.
- El CLI busca entidades en `dist/modules/**/*.orm-entity.js` y migraciones en `dist/database/migrations/*.js`. Por eso los comandos compilan antes.
- Nombres de constraints en las entidades ORM (`@Unique`, `foreignKeyConstraintName`) deben coincidir con la migración; si no, `migration:generate` las borra y recrea.
- Los seeds son idempotentes (ej. `INSERT ... ON CONFLICT DO NOTHING`) y se registran en `src/database/seeds/seed.ts`.

## 8. Pruebas

- Unitarias: `*.spec.ts` junto al código; usan `vi.fn()` para repositorios falsos, sin levantar Nest.
- E2E: `test/*.e2e-spec.ts`, importan `AppModule` y llaman `configureApp(app)` para replicar la config real.
- `globals: true` (describe/it/expect/vi sin import) definido en `vitest.config.ts` y `tsconfig.json` (`types: ["vitest/globals", "node"]`).

## 9. Git y contribución

- Ramas: `feature/HU-XX-descripcion`, `fix/HU-XX-...`, `chore/...` (minúsculas, sin acentos). Nadie empuja directo a `main` ni `dev`.
- Commits estilo Conventional Commits: `<tipo>(<modulo>): <descripcion imperativa> [HU-XX]` (ej. `feat(routes): add reorder use case [HU-07]`).
- No subir `.env`, credenciales ni archivos multimedia. `.env` está en `.gitignore`.
- No hagas commit ni push salvo que se pida explícitamente.

## 10. Si dudas

La fuente de verdad es el código en `backend/src/` y los documentos `docs/architecture.md`, `docs/naming-glossary.md` y `CONTRIBUTING.md`. Léelos antes de asumir una estructura, un endpoint o una tabla. No inventes módulos, endpoints, tablas ni variables de entorno.
