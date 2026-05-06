<script lang="ts">
  import { PUBLIC_CLERK_PUBLISHABLE_KEY } from "$env/static/public";
  import { SignUp } from "svelte-clerk";

  const clerkEnabled =
    Boolean(PUBLIC_CLERK_PUBLISHABLE_KEY) &&
    !PUBLIC_CLERK_PUBLISHABLE_KEY.includes("placeholder");
</script>

<div class="flex min-h-[80vh] items-center justify-center pt-20">
  {#if clerkEnabled}
    <SignUp signInUrl="/sign-in" />
  {:else}
    <div
      class="max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-lg"
    >
      <h1 class="font-serif text-2xl font-semibold text-card-foreground">
        Accounts are optional for this demo
      </h1>
      <p class="mt-3 text-sm leading-relaxed text-muted-foreground">
        This project is focused on the direct-booking funnel, so you can explore
        villas and complete the booking journey without signing up.
      </p>
      <div class="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <a
          href="/"
          class="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          >Explore resort</a
        >
        <a
          href="/booking"
          class="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >Try booking flow</a
        >
      </div>
    </div>
  {/if}
</div>
