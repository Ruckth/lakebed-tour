# Lakebed Tour

Lakebed-style preview site built from the former `360-tour` Next.js app foundation.

The public preview presents Lakebed as an agent-native CLI and runtime for small full-stack TypeScript apps called capsules. The existing Convex, admin, and webhook code remains in the repo, but the first preview build is frontend-only and does not require a Convex deployment key.

## Stack

- Next.js App Router
- Tailwind CSS v4
- Vercel preview deployments
- Convex code retained for later backend work

## Commands

```sh
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm test:e2e
pnpm build
```

## Preview Deploy

Vercel should use:

- Install command: `pnpm install`
- Build command: `pnpm build`
- Output directory: unset

Set `NEXT_PUBLIC_CONVEX_URL=placeholder` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=placeholder` only if a hosting environment requires those keys to exist. They are not required for the public Lakebed preview.
