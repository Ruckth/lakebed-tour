<script lang="ts">
  import { onMount } from "svelte";
  import AIChatWidget from "$lib/components/chat/AIChatWidget.svelte";
  import { resort } from "$lib/data/resort-config";
  import { pageContext } from "$lib/stores/page-context.svelte";
  import { themeState } from "$lib/stores/theme.svelte";
  import PageLoadingOverlay from "./PageLoadingOverlay.svelte";
  import SiteFooter from "./SiteFooter.svelte";
  import SiteHeader from "./SiteHeader.svelte";

  let { children } = $props();

  let pageLoaded = $state(false);

  onMount(() => {
    themeState.init();
    requestAnimationFrame(() => {
      pageLoaded = true;
    });
  });
</script>

{#if !pageLoaded}
  <PageLoadingOverlay />
{/if}

<div
  class="bg-background text-foreground flex min-h-screen flex-col transition-opacity duration-500 {pageLoaded
    ? 'opacity-100'
    : 'opacity-0'}"
>
  <SiteHeader />

  <main class="flex-1">
    {@render children()}
  </main>

  <SiteFooter />

  <AIChatWidget
    propertySlug={pageContext.propertySlug}
    propertyName={pageContext.propertyName}
    whatsappNumber={resort.whatsapp}
    lineId={resort.lineId}
  />
</div>
