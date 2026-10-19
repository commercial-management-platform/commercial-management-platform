# Naming glossary

Reference names for domain entities. Code, tables, columns, modules and commits use the English name. This is a naming reference only, not a schema: tables are defined through TypeORM migrations.

## Conventions

- Tables and columns: English, singular, `snake_case` (`client`, `scheduled_date`).
- Modules (`backend/src/modules/`): English, plural, kebab-case (`clients`, `follow-ups`).
- Avoid SQL reserved words as table or column names (`order`, `user`, `group`, `date`...).

## Entities

| Spanish | Table | Module |
|---|---|---|
| Cliente | `client` | `clients` |
| Contacto | `contact` | `contacts` |
| Asesor | `advisor` | `advisors` |
| Ruta | `route` | `routes` |
| Visita | `visit` | `visits` |
| Resultado de visita | `visit_result` | `visits` |
| Seguimiento | `follow_up` | `follow-ups` |
| Cotización | `quote` | `quotes` |
| Pedido | `sales_order` | `sales-orders` |
| Bitácora de actividades | `activity_log` | `activity-log` |

## Catalogs

Loaded with seeds.

| Spanish | Table |
|---|---|
| Zona | `zone` |
| Tipo de cliente | `client_type` |
| Potencial | `client_potential` |
| Estado | `status` |

## Roles

| Spanish | Value |
|---|---|
| Administrador | `admin` |
| Gerente | `manager` |
| Asesor | `advisor` |

## Notes

- `sales_order` instead of `order`: `order` is a reserved word in SQL.
- betterAuth creates its own tables (`user`, `session`, `account`, `verification`). `user` is reserved in PostgreSQL, so betterAuth quotes it; do not create another table with that name.
