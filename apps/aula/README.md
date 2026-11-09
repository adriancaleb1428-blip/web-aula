# Aula Consulting

Frontend del aula virtual (React 19, TypeScript, Vite, Tailwind). Habla con la API de `../api` (Node + PostgreSQL).

## Desarrollo

1. Inicia la API: `pnpm api:dev` desde la raíz.
2. `pnpm install && pnpm dev`. Vite redirige `/api` a `http://localhost:3001` (cambiable con `VITE_API_PROXY`).

Las cuentas de prueba están en el README de la raíz.

## Producción

`pnpm build` y definir `VITE_API_URL` con la URL pública de la API (o servir ambos bajo el mismo dominio con `/api`). Si la API está en otro dominio, añádelo a `connect-src`, `img-src`, `media-src` y `frame-src` en `vercel.json`. Variables: ver `.env.example`.
