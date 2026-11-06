# FileBrowser Quantum Analytics Dashboard

Public analytics dashboard for FileBrowser Quantum deployments. Served at [dashboard.filebrowserquantum.com](https://dashboard.filebrowserquantum.com).

## Development

```bash
make help      # list all commands
make setup     # npm install
make dev       # dev server on http://localhost:5173 (loads the public API data)
make build     # production build → dist/
make preview   # serve dist/ on http://localhost:5173
```

Or use npm directly: `npm run dev`, `npm run build`, etc.

### Environment

No environment variables — the app has a single data source and no modes.
Both `vite dev` and `vite preview` are pinned to port **5173**
(`strictPort: true` in `vite.config.ts`) on purpose: the API only sends
`Access-Control-Allow-Origin` for `https://dashboard.filebrowserquantum.com`
and `http://localhost:5173`, so local runs must come from that origin for CORS
to pass.

## Build

```bash
npm run build
# Output in dist/
```

Deploy `dist/` to `/var/www/dashboard/` on the proxy host.

## Data

The app always loads `https://api.filebrowserquantum.com/v1/dashboard/latest.json`
(`src/data/loadDashboard.ts`), which nginx proxies+caches from an IP-restricted S3
bucket. Dated snapshots live at `.../v1/dashboard/<YYYY-MM-DD>.json` and the
version list at `.../v1/dashboard/index.json`. The JSON is built weekly by the
`dashboard-builder` Lambda in [infra-cloud](https://github.com/quantumx-apps/infra-cloud).

There is **no offline/fixture mode**: dev and preview require network access to
the API. The document shape is defined by `src/types/dashboard-v1.ts`.

## Time windows

| Window | Granularity | Points |
|--------|-------------|--------|
| 7d | Daily | 7 |
| 90d | Weekly | 12 |
| 1y | Monthly | 12 |
