<script lang="ts">
  import "../app.css";
  import {
    PUBLIC_CONVEX_URL,
    PUBLIC_CLERK_PUBLISHABLE_KEY,
  } from "$env/static/public";
  import { setupConvex } from "convex-svelte";
  import { ClerkProvider } from "svelte-clerk";
  import ConvexClerkAuth from "$lib/components/auth/ConvexClerkAuth.svelte";
  import SiteShell from "$lib/components/global/SiteShell.svelte";

  let { children } = $props();

  setupConvex(PUBLIC_CONVEX_URL);
  const clerkEnabled =
    Boolean(PUBLIC_CLERK_PUBLISHABLE_KEY) &&
    !PUBLIC_CLERK_PUBLISHABLE_KEY.includes("placeholder");
</script>

{#if clerkEnabled}
  <ClerkProvider publishableKey={PUBLIC_CLERK_PUBLISHABLE_KEY}>
    <ConvexClerkAuth />
    <SiteShell>
      {@render children()}
    </SiteShell>
  </ClerkProvider>
{:else}
  <SiteShell>
    {@render children()}
  </SiteShell>
{/if}
