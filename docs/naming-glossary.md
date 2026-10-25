# Naming glossary

Reference names for domain entities. Code, tables, columns, modules and commits use the English name. This is a naming reference only, not a schema: tables are defined through TypeORM migrations.

## Conventions

- Tables and columns: English, singular, `snake_case` (`client`, `scheduled_date`).
- Foreign keys: `<table>_id` (`client_id`, `advisor_id`, `zone_id`).
- Booleans: `is_` prefix or a plain adjective (`is_primary`, `active`).
- Timestamps: `created_at`, `updated_at`.
- Modules (`backend/src/modules/`): English, plural, kebab-case (`clients`, `follow-ups`).
- Avoid SQL reserved words as table or column names (`order`, `user`, `group`, `date`...).

## Entities

| Spanish | Table | Module |
|---|---|---|
| Usuario (betterAuth) | `user` (managed by betterAuth) | `users` |
| Cliente | `client` | `clients` |
| Importación de clientes desde CSV (HU-22) | `client_import` | `clients` |
| Contacto | `contact` | `contacts` |
| Asesor | `advisor` | `users` |
| Cliente-Portafolio | `client_portfolio` | `portfolios` |
| Ruta | `route` | `routes` |
| Ruta-Cliente | `route_client` | `routes` |
| Visita | `visit` | `visits` |
| Resultado registrado de una visita | `visit_outcome` | `visits` |
| Seguimiento | `follow_up` | `follow-ups` |
| Cotización | `quote` | `quotes` |
| Detalle de cotización | `quote_detail` | `quotes` |
| Pedido | `sales_order` | `sales-orders` |
| Bitácora de actividades | `activity_log` | `activity-log` |

Modules without tables of their own: `auth` (betterAuth), `dashboard` (HU-15) and `reports` (HU-17) only read the tables above; `health` checks the API and the database.

## Catalogs

Loaded with seeds. Managed in the `catalogs` module.

| Spanish | Table |
|---|---|
| Zona | `zone` |
| Tipo de cliente | `client_type` |
| Potencial | `client_potential` |
| Estado de cliente | `client_status` |
| Resultado de visita | `visit_result` |
| Objetivo de visita | `visit_objective` |
| Tipo de visita | `visit_type` |
| Portafolio | `portfolio` (seed only, no CRUD) |

## Roles

| Spanish | Value |
|---|---|
| Administrador | `admin` |
| Director comercial | `director` |
| Asesor | `advisor` |

## Status values

Stored as they are in the `status` column of each table, in English. The Spanish labels only live in the frontend.

| Table | Values |
|---|---|
| `visit` | `scheduled` (programada), `visited` (realizada), `cancelled` (cancelada) |
| `quote` | `draft` (borrador), `sent` (enviada), `approved` (aprobada), `rejected` (rechazada) |
| `sales_order` | `pending` (pendiente), `confirmed` (confirmado), `delivered` (entregado), `cancelled` (cancelado). A closed order for the dashboard is `confirmed` or `delivered` |
| `route` | `active`, `inactive` |
| `advisor` | `active`, `inactive` |
| `client_import` | `validated` (checked with `dryRun`, nothing saved), `imported`, `failed` |

`follow_up` has no `status` column: it stores `completed` (boolean). The API derives `pending`, `overdue` (pending with a past `next_date`) and `completed`.

## Visit outcome lists

Fixed lists of the visit form (HU-09), not managed catalogs.

| Column | Values |
|---|---|
| `visit.interest_level` | `high`, `medium`, `low` |
| `visit.interest_reason` | `quality`, `price`, `quality_price` |

## Activity log actions

`activity_log.action` stores `<entity>.<event>` values. The full list lives in `backend/src/shared/domain/activity-log/activity-action.ts`; never rename a stored value.

| Entity | Actions |
|---|---|
| Client | `client.created`, `client.updated`, `client.status_changed`, `client.imported`, `client.portfolio_added`, `client.portfolio_removed` |
| Contact | `contact.created`, `contact.updated`, `contact.status_changed`, `contact.primary_changed` |
| Visit | `visit.scheduled`, `visit.rescheduled`, `visit.cancelled`, `visit.completed` |
| Follow-up | `follow_up.created`, `follow_up.completed` |
| Quote | `quote.created`, `quote.status_changed` |
| Sales order | `sales_order.created`, `sales_order.status_changed` |

## Notes

- `sales_order` instead of `order`: `order` is a reserved word in SQL.
- betterAuth creates its own tables (`user`, `session`, `account`, `verification`). `user` is reserved in PostgreSQL, so betterAuth quotes it; do not create another table with that name. `advisor.user_id` links an advisor to its betterAuth user.
- `visit_result` is the catalog of possible results (interested, not interested...). `visit_outcome` is the result recorded for a specific visit, with its observation (`VISITA_RESULTADO` in the original model).
- `client_status` instead of `status`: routes, visits, quotes and sales orders also have their own `status` column, so the catalog name must be specific.
- `nit` keeps its Colombian name: it is the tax ID and has no exact English equivalent.
