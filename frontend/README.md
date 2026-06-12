# urlshorter-frontend

Frontend app for `shur.click` built with React + TypeScript + Vite.

## Production readiness checklist

- Build command: `npm run build`
- Output directory: `dist/`
- API base URL:
  - Recommended: keep `VITE_API_BASE_URL` empty and use same-origin `/api` routes with platform rewrites.
  - If using a separate API domain, set `VITE_API_BASE_URL=https://api.example.com`.
- Security headers are configured in `vercel.json`.
- Backend rewrites are configured to HTTPS in `vercel.json`.

## Environment variables

Copy `.env.example` to `.env` for local development:

```bash
cp .env.example .env
```

Variables:

- `VITE_API_BASE_URL` optional API origin for browser requests.
- `VITE_DEV_API_PROXY` dev-server proxy target (default `http://localhost:5000`).

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## Deployment notes (Vercel)

- `vercel.json` includes:
  - secure headers,
  - HTTPS rewrites for `/api` and short-code routes,
  - SPA fallback to `/index.html`.
- Ensure backend endpoint in rewrites is reachable over HTTPS.
