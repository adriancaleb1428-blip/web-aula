# Web + Aula

Sitio corporativo PROTEQLIFE y plataforma de capacitación **Aula Consulting**, con backend propio en **Node + PostgreSQL**.

```
apps/
  site/   Web de ventas (sitio estático): catálogo, carrito y checkout
  aula/   Aula virtual (React 19 + Vite + Tailwind)
  api/    API (Express 5 + PostgreSQL): auth JWT, permisos por rol, archivos, tiempo real (SSE)
_legacy/  Código anterior (MySQL) solo como referencia
```

## Desarrollo

Requisitos: Node 20+ y pnpm. No hace falta instalar PostgreSQL ni Docker: en desarrollo la API arranca un PostgreSQL embebido (puerto 5433).

```bash
pnpm --dir apps/api install
pnpm --dir apps/aula install
```

En dos terminales:

```bash
pnpm api:dev
```

```bash
pnpm aula:dev
```

Abre http://localhost:5173. La primera vez la API crea el esquema (`apps/api/sql`) y datos de ejemplo.
Cuentas demo (contraseña `Aula-Demo-2026`): `admin@aula.demo`, `carlos.mendoza@aula.demo` (facilitador), `ana.torres@aula.demo` (participante).

Para volver a los datos iniciales: `pnpm api:reset`.

### Flujo de venta → aula

1. `pnpm site:dev` y abre http://localhost:5500: el visitante elige un curso y lo agrega al carrito.
2. `checkout.html` pide nombre, correo y contraseña; llama a `POST /api/shop/checkout`.
3. La API crea la cuenta (o reutiliza la existente si la contraseña es correcta), registra el pedido, matricula al alumno y devuelve un token.
4. El navegador pasa al aula con `#token=…&curso=CÓDIGO` y el aula abre directamente el curso comprado.

Los precios salen siempre de la base de datos. El catálogo (49 cursos) vive en `apps/api/data/catalog.json` y se carga con `pnpm --dir apps/api db:catalog`. Las URLs de API y aula del sitio se configuran en `apps/site/config.js`.

**Pagos:** aún no hay pasarela. En desarrollo el pago es simulado (no se piden datos de tarjeta). En producción `POST /shop/checkout` responde 503 hasta que conectes una pasarela o definas `ALLOW_SIMULATED_PAYMENTS=true`.

Modo sin servidor (solo navegador, datos en localStorage): `VITE_BACKEND=demo pnpm aula:dev`.

## Producción

API (`apps/api`), variables de entorno:

| Variable | Descripción |
| --- | --- |
| `DATABASE_URL` | Conexión PostgreSQL (si existe, no se usa la BD embebida) |
| `JWT_SECRET` | Obligatorio en producción |
| `STORAGE_DIR` | Carpeta de archivos (volumen persistente) |
| `CORS_ORIGINS` | Orígenes del aula, separados por comas |
| `PORT` | Por defecto 3001 |

Comandos: `pnpm --dir apps/api db:migrate`, `db:seed`, `start`. En producción no se siembran datos demo automáticamente con `DATABASE_URL`; créa el primer administrador con SQL o `db:seed` en un entorno de pruebas.

Aula: `pnpm aula:build` y definir `VITE_API_URL` con la URL pública de la API. Actualiza la CSP de `apps/aula/vercel.json` (`connect-src`) con ese dominio.

## Seguridad

Los permisos por tabla y rol se aplican en `apps/api/src/rest.ts` (consultas parametrizadas, listas blancas de tablas y columnas). Los archivos se sirven con enlaces firmados de 1 hora.
