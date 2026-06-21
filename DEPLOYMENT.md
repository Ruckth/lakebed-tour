# Lakebed Preview Deployment

This repository deploys as a frontend-first Next.js preview on Vercel.

## Vercel Project Settings

Use these settings for the `lakebed-tour` Vercel project:

| Setting | Value |
| --- | --- |
| Framework preset | `Next.js` |
| Install command | `pnpm install` |
| Build command | `pnpm build` |
| Output directory | Leave unset |

The original Convex deployment command is intentionally not used for the first preview. The app still keeps Convex source files for later backend work, but the public Lakebed site does not need `CONVEX_DEPLOY_KEY`.

## Environment Variables

No environment variables are required for the public preview.

If Vercel or local testing needs placeholder client keys, use:

```sh
NEXT_PUBLIC_CONVEX_URL=placeholder
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=placeholder
```

Do not add production secrets for the initial preview unless backend routes are intentionally reactivated.

## Verification

Before deployment:

```sh
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm test:e2e
pnpm build
```

After deployment:

- Home page loads with `Lakebed [alpha]` as the first-viewport signal.
- `npx lakebed new` command affordance is visible.
- Docs and example links open `docs.lakebed.dev`.
- `/booking`, `/chat`, and `/rooms/pool-villa` redirect to `/`.
- No resort booking UI, concierge chat launcher, or demo disclaimer appears on public pages.
