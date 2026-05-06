<script lang="ts">
  import { Moon, Monitor, Sun } from "@lucide/svelte";
  import { themeState } from "$lib/stores/theme.svelte";

  let { solid = true }: { solid?: boolean } = $props();
</script>

<button
  onclick={() => themeState.cycle()}
  class="flex h-9 w-9 items-center justify-center rounded-full transition-colors {solid
    ? 'bg-muted text-foreground hover:bg-muted/80'
    : 'text-white/60 hover:bg-white/10 hover:text-white'}"
  aria-label="Toggle theme: {themeState.mode}"
>
  {#if themeState.mode === "light"}
    <Sun class="h-4 w-4" />
  {:else if themeState.mode === "dark"}
    <Moon class="h-4 w-4" />
  {:else}
    <Monitor class="h-4 w-4" />
  {/if}
</button>
