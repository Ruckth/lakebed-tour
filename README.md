# Lakebed Tour

A real Lakebed capsule for trying Lakebed auth and database behavior.

The app includes:

- Lakebed guest auth and Google sign-in.
- A private notes table filtered by the current `ctx.auth.userId`.
- A shared guestbook table that stores trusted author metadata from `ctx.auth`.
- A status endpoint at `/api/status`.

## Run Locally

```sh
npx lakebed auth as alice
npx lakebed dev
```

Open:

```txt
http://localhost:3000
```

To compare users in different tabs:

```txt
http://localhost:3000/?lakebed_guest=alice
http://localhost:3000/?lakebed_guest=bob
```

Inspect local state while the dev server is running:

```sh
npx lakebed db list --port 3000
npx lakebed db dump --port 3000
npx lakebed logs --port 3000
```

## Deploy

```sh
npx lakebed deploy . --public-inspect
```
