# Lakebed App Instructions

This repository is a Lakebed capsule. Lakebed is the runtime, auth layer, database, and hosting platform for this app.

## Rules

- Run Lakebed through `npx lakebed`; do not assume a global binary.
- Server code belongs in `server/index.ts` and imports from `lakebed/server`.
- Client code belongs in `client/index.tsx` and imports from `lakebed/client`.
- Shared code belongs in `shared/` and must stay free of DOM, Node, Lakebed runtime, env, and secret access.
- Use `ctx.auth` on the server and `useAuth()` on the client.
- Use `ctx.db` only from queries, mutations, and endpoints in the server contract.
- Keep user-owned rows filtered by `ctx.auth.userId`, and re-check ownership inside mutations before update/delete.
- Use `<SignInWithGoogle />` or `signOut()` from `lakebed/client` for Google auth.
- Style directly with Tailwind classes in JSX; do not add a CSS, PostCSS, or Tailwind build pipeline.

## Commands

```sh
npx lakebed dev
npx lakebed build . --target anonymous --json
npx lakebed deploy . --public-inspect --json
npx lakebed db dump --port 3000
```
