# Aula Consulting

Frontend del aula virtual (React 19, TypeScript, Vite, Tailwind). Habla con la API de `../api` (Node + PostgreSQL).

## Desarrollo

1. Inicia la API: `pnpm api:dev` desde la raíz (crea la base de datos de desarrollo y datos de ejemplo).
2. `pnpm install && pnpm dev`. Vite redirige `/api` a `http://localhost:3001` (cambiable con `VITE_API_PROXY`).

Cuentas demo (contraseña `Aula-Demo-2026`): `admin@aula.demo`, `carlos.mendoza@aula.demo` (facilitador), `ana.torres@aula.demo` (participante).

## Modo sin servidor

`VITE_BACKEND=demo pnpm dev` simula todo en el navegador (`src/lib/demo/`, localStorage + IndexedDB), útil para demostraciones sin API.

## Producción

`pnpm build` y definir `VITE_API_URL` con la URL pública de la API (o servir ambos bajo el mismo dominio con `/api`). Si la API está en otro dominio, añádelo a `connect-src`, `img-src`, `media-src` y `frame-src` en `vercel.json`. Variables: ver `.env.example`.
