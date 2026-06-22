# Lakebed Tour

A Lakebed capsule for a rental-first real estate agency workspace.

The app includes:

- Public listing browse, search, filters, details, media, floor plan links, map links, and inquiry capture.
- Google-authenticated admin listing management for owned rows.
- CSV listing import with shared client/server parsing and validation.
- Inquiry inbox and lead status tracking for owned properties.
- Admin-managed FAQ records plus controlled public FAQ answers.
- A status endpoint at `/api/status` and a CSV template endpoint at `/api/csv-template`.

## Run Locally

```sh
npx lakebed dev
```

Open:

```txt
http://localhost:3000
```

Inspect local state while the dev server is running:

```sh
npx lakebed db dump --port 3000
```

## Build

```sh
npx lakebed build . --target anonymous --json
```

## Deploy

```sh
npx lakebed deploy . --public-inspect --json
```
