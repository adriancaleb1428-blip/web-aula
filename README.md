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

Abre http://localhost:5173. La primera vez la API crea el esquema (`apps/api/sql`), las cuentas de prueba y el catálogo de cursos.
Cuentas de prueba (se crean con `pnpm api:reset`; los datos están en `apps/api/src/seed.ts`):

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | `admin@proteqlife.test` | `Admin-Aula-2026` |
| Facilitador (gestiona IPERC, ATS y EPP) | `facilitador@proteqlife.test` | `Facilitador-2026` |
| Participante (matriculado en IPERC) | `participante@proteqlife.test` | `Participante-2026` |

También puedes crear tu propia cuenta de participante comprando un curso en la web de ventas.

Para volver a los datos iniciales: `pnpm api:reset`.

### Flujo de venta → aula

1. `pnpm site:dev` y abre http://localhost:5500: el visitante elige un curso y lo agrega al carrito.
2. `checkout.html` pide nombre, correo y contraseña; llama a `POST /api/shop/pagar`.
3. La API crea la cuenta (o reutiliza la existente si la contraseña es correcta), registra el pedido, matricula al alumno y devuelve un token.
4. El navegador pasa al aula con `#token=…&curso=CÓDIGO` y el aula abre directamente el curso comprado.

Los precios salen siempre de la base de datos. El catálogo (49 cursos) vive en `apps/api/data/catalogo.json` y se carga con `pnpm --dir apps/api db:catalog`. Las URLs de API y aula del sitio se configuran en `apps/site/config.js`.

**Pagos:** aún no hay pasarela. En desarrollo el pago es simulado (no se piden datos de tarjeta). En producción `POST /shop/pagar` responde 503 hasta que conectes una pasarela o definas `ALLOW_SIMULATED_PAYMENTS=true`.

## Base de datos

Esquema en PostgreSQL con nombres en español (`apps/api/sql/001_esquema.sql` y `002_tienda.sql`):

| Grupo | Tablas |
| --- | --- |
| Cuentas | `usuarios`, `perfiles` (rol: `administrador`, `facilitador`, `participante`) |
| Cursos | `cursos`, `curso_facilitadores`, `matriculas`, `modulos`, `lecciones` |
| Contenido | `materiales`, `reuniones`, `curso_grabaciones`, `curso_certificados` |
| Comunicación | `notificaciones`, `solicitudes_soporte`, `curso_conversaciones`, `mensajes` |
| Ventas | `pedidos`, `pedido_items` (el catálogo vive en `cursos`, con `en_venta`, `precio`, `temario`…) |

Las migraciones aplicadas se registran en `migraciones`. Los estados también van en español (`borrador/publicado/archivado`, `activa/completada`, `programada/realizada`, `pendiente/pagado`).

## Producción

API (`apps/api`), variables de entorno:

| Variable | Descripción |
| --- | --- |
| `DATABASE_URL` | Conexión PostgreSQL (si existe, no se usa la BD embebida) |
| `JWT_SECRET` | Obligatorio en producción |
| `STORAGE_DIR` | Carpeta de archivos (volumen persistente) |
| `CORS_ORIGINS` | Orígenes del aula, separados por comas |
| `PORT` | Por defecto 3001 |

Comandos: `pnpm --dir apps/api db:migrate`, `db:seed`, `start`. En producción nada se siembra automáticamente con `DATABASE_URL`; crea el primer administrador con `db:seed` con `ADMIN_EMAIL` y `ADMIN_PASSWORD` definidos (crea solo ese administrador y el catálogo).

Aula: `pnpm aula:build` y definir `VITE_API_URL` con la URL pública de la API. Actualiza la CSP de `apps/aula/vercel.json` (`connect-src`) con ese dominio.

## Seguridad

Los permisos por tabla y rol se aplican en `apps/api/src/rest.ts` (consultas parametrizadas, listas blancas de tablas y columnas). Los archivos se sirven con enlaces firmados de 1 hora.
