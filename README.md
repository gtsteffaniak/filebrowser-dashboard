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

## Build

```bash
npm run build
# Output in dist/
```

Deploy `dist/` to `/var/www/dashboard/` on the proxy host.

## Data

Production loads `/v1/latest.json` from the same origin (proxied from S3). The JSON is built daily by the `dashboard-builder` Lambda in [infra-cloud](https://github.com/quantumx-apps/infra-cloud).

Schema: `schema/dashboard-v1.schema.json` (TODO) — see `fixtures/dashboard.sample.json` for reference.

## Time windows

| Window | Granularity | Points |
|--------|-------------|--------|
| 7d | Daily | 7 |
| 90d | Weekly | 12 |
| 1y | Monthly | 12 |
