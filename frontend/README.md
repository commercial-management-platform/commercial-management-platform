# Kestrel · Frontend

SPA en **Svelte 5 + TypeScript + Vite** para la plataforma de gestión comercial.

## Puesta en marcha

```bash
cd frontend
cp .env.example .env      # opcional: los valores por defecto sirven en local
npm install
npm run dev               # http://localhost:5173
```

El frontend necesita el backend corriendo para iniciar sesión (ver `../backend`):

```bash
docker compose up -d            # PostgreSQL (desde la raíz del repo)
cd backend
cp .env.example .env
npm install
npm run migration:run
npm run seed                    # crea admin, director y asesor con las credenciales SEED_* del .env
npm run start:dev               # http://localhost:3000/api
```

Inicia sesión con cualquiera de los usuarios creados por el seed.

## Conexión con el backend

| Variable          | Por defecto             | Uso                                                        |
| ----------------- | ----------------------- | ---------------------------------------------------------- |
| `VITE_API_URL`    | `/api`                  | URL base de la API que usa el navegador.                    |
| `VITE_API_PROXY`  | `http://localhost:3000` | Backend al que el servidor de desarrollo redirige `/api`.   |

En desarrollo Vite redirige `/api` al backend (`vite.config.ts`), así el navegador ve un solo
origen y no hace falta configurar CORS. En producción, sirve el frontend y el backend bajo el
mismo dominio (p. ej. Nginx con `/api` hacia NestJS) o define `VITE_API_URL` con la URL del backend
y agrega el dominio del frontend a `CORS_ORIGIN` en el backend.

## Autenticación

Usa los endpoints de Better Auth expuestos por el backend:

- `POST /api/auth/login` → devuelve `{ token, user }`. El token se envía en cada petición como
  `Authorization: Bearer <token>` (plugin `bearer` de Better Auth).
- `GET /api/auth/me` → al abrir la app se valida la sesión guardada.
- `POST /api/auth/logout` → invalida la sesión en el servidor.

"Recordarme" guarda la sesión en `localStorage`; si no se marca, dura lo que la pestaña
(`sessionStorage`). Si el backend responde 401 a cualquier petición, la sesión se cierra y se
vuelve al login conservando la página a la que se quería ir.

## Estructura

```
src/
  lib/services/http.ts      Cliente HTTP: token, errores ({ statusCode, message }) y 401
  lib/services/auth.ts      Login, perfil y logout contra /api/auth
  lib/services/api.ts       Acceso a datos de los módulos (hoy servidor simulado en mock/)
  lib/stores/               Estado reactivo (runes) y conexión en tiempo real
  pages/                    Vistas por módulo
  layout/                   Sidebar, barra superior y modales globales
```

Los módulos que aún no tienen endpoints en el backend (dashboard, rutas, visitas, cotizaciones,
pedidos) usan el servidor simulado de `src/lib/services/mock`, que emite eventos en tiempo real con
el mismo contrato que tendrá el backend.

## Scripts

- `npm run dev`: servidor de desarrollo.
- `npm run build`: build de producción en `dist/`.
- `npm run check`: verificación de tipos (svelte-check + tsc).
