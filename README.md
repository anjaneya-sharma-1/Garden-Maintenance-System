# Garden Keeper

Local-first full-stack gardening app (React + Express) using a JSON data store for easy setup.

## Quickstart

1) Install Node.js 20+ and pnpm.
2) Install dependencies:

```bash
pnpm install
```

3) Boot everything with one command:

```bash
pnpm run dev:local
```

4) Open the URL printed in the console.

## Local Data

- JSON data file: `artifacts/api-server/data/local-db.json`
- Delete the file to reset the app to seed data.

## Demo Accounts

- Demo: `demo@gms.local` / `gardener123`
- Admin: `admin@gms.local` / `gardener123`

## Ports

- API default: `8080` (override with `API_PORT`)
- Web default: first free port from `5173, 19526, 3000`
  - Override with `FRONT_PORT` or `FRONT_PORTS`

## Environment Overrides

- `API_PORT` - API port (default 8080)
- `FRONT_PORT` - Force web port
- `FRONT_PORTS` - Comma-separated fallback ports
- `BASE_PATH` - Vite base path (default `/`)
- `API_URL` - API target for the dev proxy (default `http://localhost:8080`)
