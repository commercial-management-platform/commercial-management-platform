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
| Contacto | `contact` | `contacts` |
| Asesor | `advisor` | `advisors` |
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

## Notes

- `sales_order` instead of `order`: `order` is a reserved word in SQL.
- betterAuth creates its own tables (`user`, `session`, `account`, `verification`). `user` is reserved in PostgreSQL, so betterAuth quotes it; do not create another table with that name. `advisor.user_id` links an advisor to its betterAuth user.
- `visit_result` is the catalog of possible results (interested, not interested...). `visit_outcome` is the result recorded for a specific visit, with its observation (`VISITA_RESULTADO` in the original model).
- `client_status` instead of `status`: routes, visits, quotes and sales orders also have their own `status` column, so the catalog name must be specific.
- `nit` keeps its Colombian name: it is the tax ID and has no exact English equivalent.
