# FileBrowser Analytics Dashboard

Public analytics dashboard for FileBrowser Quantum deployments. Served at [dashboard.filebrowserquantum.com](https://dashboard.filebrowserquantum.com).

## Development

```bash
make help      # list all commands
make setup     # npm install + ensure sample dashboard.json
make dev       # local dev server (public/dashboard.json)
make dev-remote # dev against production data URL
make build     # production build → dist/
```

Or use npm directly: `npm run dev`, `npm run build`, etc.

### Environment

| Variable | Default (dev) | Description |
|----------|---------------|-------------|
| `VITE_USE_LOCAL_DATA` | `true` | Load `public/dashboard.json` instead of remote |
| `VITE_DATA_URL` | unset | Absolute URL for dashboard JSON; overrides `config.json` `dataUrl` when `VITE_USE_LOCAL_DATA` is not `true` (set by `.env.remote` for `make dev-remote`) |

## Build

```bash
npm run build
# Output in dist/
```

Deploy `dist/` to `/var/www/dashboard/` on the proxy host.

## Data

Production loads `https://api.filebrowserquantum.com/v1/dashboard/latest.json` (from `public/config.json` `dataUrl`), which nginx proxies+caches from an IP-restricted S3 bucket. Dated snapshots live at `.../v1/dashboard/<YYYY-MM-DD>.json` and the version list at `.../v1/dashboard/index.json`. The JSON is built weekly by the `dashboard-builder` Lambda in [infra-cloud](https://github.com/quantumx-apps/infra-cloud).

`make dev-remote` runs `vite --mode remote`, which loads `.env.remote` (`VITE_USE_LOCAL_DATA=false` + `VITE_DATA_URL` pointing at the production URL). `VITE_DATA_URL` takes precedence over `config.json` `dataUrl`.

Schema: `schema/dashboard-v1.schema.json` (TODO) — see `fixtures/dashboard.sample.json` for reference.

## Time windows

| Window | Granularity | Points |
|--------|-------------|--------|
| 7d | Daily | 7 |
| 90d | Weekly | 12 |
| 1y | Monthly | 12 |
