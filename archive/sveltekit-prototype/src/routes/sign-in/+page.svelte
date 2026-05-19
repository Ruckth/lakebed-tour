<script lang="ts">
  import { PUBLIC_CLERK_PUBLISHABLE_KEY } from "$env/static/public";
  import { SignIn } from "svelte-clerk";

  const clerkEnabled =
    Boolean(PUBLIC_CLERK_PUBLISHABLE_KEY) &&
    !PUBLIC_CLERK_PUBLISHABLE_KEY.includes("placeholder");
</script>

<div class="flex min-h-[80vh] items-center justify-center pt-20">
  {#if clerkEnabled}
    <SignIn signUpUrl="/sign-up" />
  {:else}
    <div
      class="max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-lg"
    >
      <h1 class="font-serif text-2xl font-semibold text-card-foreground">
        Guest login is not enabled in this demo
      </h1>
      <p class="mt-3 text-sm leading-relaxed text-muted-foreground">
        The direct-booking experience is available without an account. Continue
        browsing villas or head straight to the booking flow.
      </p>
      <div class="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <a
          href="/"
          class="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          >Browse villas</a
        >
        <a
          href="/booking"
          class="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >Book direct</a
        >
      </div>
    </div>
  {/if}
</div>
