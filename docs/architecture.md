# Arquitectura del backend

El backend (`backend/`) es una API NestJS organizada con Clean Architecture. Este documento resume las reglas; los nombres siguen el [glosario](naming-glossary.md).

## Estructura general

```
backend/src/
├── main.ts / app.setup.ts   # Arranque y configuración HTTP global (prefijo api, pipes, filtros, CORS, Swagger)
├── app.module.ts            # Módulo raíz: config, TypeORM y módulos de negocio
├── config/                  # Validación de entorno, TypeORM y DataSource del CLI
├── database/
│   ├── migrations/          # Migraciones generadas (nunca editar una que ya esté en dev)
│   └── seeds/seed.ts        # Ejecutor de seeds
├── shared/
│   ├── domain/errors/       # DomainError, NotFoundError, ConflictError, ForbiddenError
│   └── infrastructure/      # DomainExceptionFilter (error de dominio → HTTP)
└── modules/<modulo>/        # Un módulo por concepto del glosario (clients, visits...)
```

## Las cuatro capas de un módulo

| Capa | Contiene | Puede importar |
|---|---|---|
| `domain/` | Entidades puras, reglas, interfaces de repositorio (puertos) y sus tokens | Nada externo (ni `@nestjs/*` ni `typeorm`) |
| `application/` | Casos de uso | Solo `domain/` |
| `infrastructure/` | Entidades TypeORM (`*.orm-entity.ts`), repositorios concretos, mappers, adaptadores (S3, betterAuth) | `domain/`, NestJS, TypeORM |
| `presentation/` | Controladores REST y DTOs con class-validator y Swagger | `application/`, `domain/`, NestJS |

**Regla de dependencias:** las dependencias apuntan hacia adentro: `presentation → application → domain` e `infrastructure → domain`. El dominio no conoce a nadie. El archivo `<modulo>.module.ts` es el único que conoce todas las capas, porque conecta cada puerto con su implementación.

Los errores de negocio se lanzan desde `domain/` o `application/` con las clases de `shared/domain/errors`. El `DomainExceptionFilter` global los traduce a HTTP (`NotFoundError` → 404, `ConflictError` → 409, `ForbiddenError` → 403 y cualquier otro `DomainError` → 400) con el formato `{ statusCode, error, message }`.

## Puerto, caso de uso y repositorio

Ejemplo genérico para un módulo `widgets` (solo ilustrativo, no existe):

1. **Puerto (domain).** En `domain/widget.repository.ts` se declara la interfaz `WidgetRepository` con métodos como `findById(id)` y `save(widget)`, y un token `export const WIDGET_REPOSITORY = Symbol('WIDGET_REPOSITORY')`. La interfaz no existe en tiempo de ejecución, por eso Nest inyecta con el `Symbol`.
2. **Caso de uso (application).** `application/rename-widget.use-case.ts` es una clase TypeScript pura que recibe un `WidgetRepository` en el constructor. Busca el widget, lanza `NotFoundError` si no existe, aplica la regla de negocio y guarda. No usa decoradores de Nest.
3. **Repositorio (infrastructure).** `infrastructure/typeorm-widget.repository.ts` implementa `WidgetRepository` con un `Repository<WidgetOrmEntity>` de TypeORM y un mapper que convierte entre `WidgetOrmEntity` (tabla) y `Widget` (dominio).
4. **Composición (module).** En `widgets.module.ts`:
   - `{ provide: WIDGET_REPOSITORY, useClass: TypeOrmWidgetRepository }`
   - `{ provide: RenameWidgetUseCase, inject: [WIDGET_REPOSITORY], useFactory: (repo) => new RenameWidgetUseCase(repo) }`
5. **Controlador (presentation).** Recibe un DTO validado, llama a `renameWidget.execute(...)` y responde. No contiene lógica.

En las pruebas, el caso de uso se instancia con un repositorio falso en memoria, sin levantar Nest. El módulo `health` sigue este mismo patrón con el puerto `DATABASE_HEALTH_PORT`.

## Migraciones

El esquema solo cambia con migraciones (`synchronize: false` siempre). Los comandos compilan primero y trabajan sobre `dist/` para evitar problemas de ESM con los `.ts`. En local leen `backend/.env`; en el servidor, las variables del entorno.

```bash
cd backend
# 1. Crear o modificar la entidad TypeORM (infrastructure/*.orm-entity.ts)
# 2. Generar la migración comparando entidades y base de datos
npm run migration:generate -- --name=CreateClientTable
#    → src/database/migrations/<timestamp>-CreateClientTable.ts (revísala y formatéala)
# 3. Aplicar las migraciones pendientes
npm run migration:run
# Deshacer la última migración aplicada
npm run migration:revert
```

El CLI busca entidades en `dist/modules/**/*.orm-entity.js` y migraciones en `dist/database/migrations/*.js`. La aplicación carga sus entidades con `autoLoadEntities` (las registradas con `TypeOrmModule.forFeature`) y nunca ejecuta migraciones al arrancar.

## Seeds

Cada seed implementa `Seed` (`name` y `run(dataSource)`) y se agrega a la lista de `src/database/seeds/seed.ts`, en orden. Los seeds deben ser idempotentes (por ejemplo, insertar solo si no existe).

```bash
cd backend
npm run seed
```

## SSL con Amazon RDS

Con `DB_SSL=true` la conexión verifica el certificado del servidor. Node no trae la CA de RDS, así que en el servidor hay que definir `NODE_EXTRA_CA_CERTS` con la ruta al bundle de AWS (`global-bundle.pem`).
