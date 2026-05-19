<script lang="ts">
  import { page } from "$app/state";
  import { Menu, X } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";
  import { resort } from "$lib/data/resort-config";

  const navLinks = [
    { href: "/#villas", label: "Villas" },
    { href: "/#amenities", label: "Amenities" },
    { href: "/#reviews", label: "Reviews" },
    { href: "/#contact", label: "Contact" },
  ];

  let mobileMenuOpen = $state(false);
  let scrolled = $state(false);
  const isHome = $derived(page.url.pathname === "/");
  const solid = $derived(scrolled || !isHome || mobileMenuOpen);

  function handleScroll() {
    scrolled = window.scrollY > 40;
  }

  function closeMobileMenu() {
    mobileMenuOpen = false;
  }

  onMount(() => {
    handleScroll();
  });
</script>

<svelte:window onscroll={handleScroll} />

<header
  class="fixed inset-x-0 top-0 z-40 transition-all duration-300 {solid
    ? 'border-border bg-background/95 border-b shadow-sm backdrop-blur-md'
    : 'bg-transparent'}"
>
  <nav
    class="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 md:px-8 md:py-4"
  >
    <a href="/" class="flex items-center gap-2" onclick={closeMobileMenu}>
      <span
        class="font-serif text-xl font-semibold tracking-tight md:text-2xl {solid
          ? 'text-foreground'
          : 'text-white'}"
      >
        {resort.name}
      </span>
    </a>

    <div class="hidden items-center gap-8 md:flex">
      {#each navLinks as link}
        <a
          href={link.href}
          class="text-sm font-medium transition-colors {solid
            ? 'text-muted-foreground hover:text-foreground'
            : 'text-white/70 hover:text-white'}"
        >
          {link.label}
        </a>
      {/each}
      <Button href="/booking" size="nav" variant={solid ? "default" : "glass"}
        >Book</Button
      >
      <ThemeToggle {solid} />
    </div>

    <div class="flex items-center gap-2 md:hidden">
      <ThemeToggle {solid} />
      <button
        onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
        class="flex h-9 w-9 items-center justify-center rounded-full {solid
          ? 'text-foreground'
          : 'text-white'}"
        aria-label="Toggle menu"
        aria-expanded={mobileMenuOpen}
      >
        {#if mobileMenuOpen}
          <X class="h-5 w-5" />
        {:else}
          <Menu class="h-5 w-5" />
        {/if}
      </button>
    </div>
  </nav>

  {#if mobileMenuOpen}
    <div
      class="border-border bg-background/98 border-t backdrop-blur-md md:hidden"
    >
      <div class="flex flex-col space-y-1 px-5 py-4">
        {#each navLinks as link}
          <a
            href={link.href}
            onclick={closeMobileMenu}
            class="text-foreground hover:bg-muted rounded-lg px-3 py-2.5 text-sm font-medium transition"
          >
            {link.label}
          </a>
        {/each}
        <Button
          href="/booking"
          size="nav"
          class="mt-2 w-full justify-center"
          onclick={closeMobileMenu}
        >
          Book
        </Button>
      </div>
    </div>
  {/if}
</header>
