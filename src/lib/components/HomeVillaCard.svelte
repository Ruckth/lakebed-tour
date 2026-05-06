<script lang="ts">
  import Explore360Button from "$lib/components/Explore360Button.svelte";
  import StarRating from "$lib/components/social/StarRating.svelte";
  import { resort } from "$lib/data/resort-config";
  import type { Property } from "$lib/data/properties";
  import type { PropertySocialProof } from "$lib/data/reviews";

  let {
    property,
    socialProof,
    storyTagline = "",
  }: {
    property: Property;
    socialProof?: PropertySocialProof;
    storyTagline?: string;
  } = $props();

  let currentIndex = $state(0);
  let touchStartX = $state(0);
  let touchDeltaX = $state(0);
  let isDragging = $state(false);

  const galleryImages = $derived(
    property.images.length ? property.images : [resort.heroImage],
  );
  const hasMultipleImages = $derived(galleryImages.length > 1);

  function goTo(index: number) {
    currentIndex = Math.max(0, Math.min(index, galleryImages.length - 1));
  }

  function next() {
    if (!hasMultipleImages) return;
    goTo(currentIndex + 1);
  }

  function prev() {
    if (!hasMultipleImages) return;
    goTo(currentIndex - 1);
  }

  function handleTouchStart(event: TouchEvent) {
    if (!hasMultipleImages) return;
    touchStartX = event.touches[0].clientX;
    touchDeltaX = 0;
    isDragging = true;
  }

  function handleTouchMove(event: TouchEvent) {
    if (!isDragging) return;
    touchDeltaX = event.touches[0].clientX - touchStartX;
  }

  function handleTouchEnd() {
    if (!isDragging) return;
    isDragging = false;
    if (touchDeltaX > 60) prev();
    else if (touchDeltaX < -60) next();
    touchDeltaX = 0;
  }
</script>

<article
  class="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-xl"
>
  <div class="relative aspect-[4/3] overflow-hidden bg-muted">
    <div
      class="relative z-0 flex h-full transition-transform duration-500 ease-out"
      style="transform: translateX(calc(-{currentIndex * 100}% + {isDragging
        ? touchDeltaX
        : 0}px));"
      ontouchstart={handleTouchStart}
      ontouchmove={handleTouchMove}
      ontouchend={handleTouchEnd}
      role="region"
      aria-label={`${property.name} photo gallery`}
    >
      {#each galleryImages as src, i (src)}
        <div class="h-full w-full flex-shrink-0">
          <img
            {src}
            alt={`${property.name} photo ${i + 1}`}
            class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      {/each}
    </div>

    <div
      class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 via-black/15 to-transparent"
    ></div>

    <div
      class="absolute bottom-3 right-3 rounded-full bg-navy/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm md:text-sm"
    >
      {resort.currencySymbol}{property.pricePerNight.toLocaleString()}<span
        class="text-[10px] font-normal text-white/60 md:text-xs">/night</span
      >
    </div>

    {#if hasMultipleImages}
      <div class="absolute bottom-3 left-3 z-10 flex gap-1.5">
        {#each galleryImages as _, i (`dot-${i}`)}
          <button
            onclick={() => goTo(i)}
            class="h-2 rounded-full transition-all duration-300 {currentIndex ===
            i
              ? 'w-6 bg-white'
              : 'w-2 bg-white/45 hover:bg-white/70'}"
            aria-label={`Show photo ${i + 1}`}
          ></button>
        {/each}
      </div>

      <button
        onclick={prev}
        aria-label="Previous photo"
        class="absolute left-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-lg transition opacity-0 hover:bg-background focus-visible:opacity-100 group-hover:opacity-100 md:flex"
      >
        <svg
          class="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>
      <button
        onclick={next}
        aria-label="Next photo"
        class="absolute right-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-lg transition opacity-0 hover:bg-background focus-visible:opacity-100 group-hover:opacity-100 md:flex"
      >
        <svg
          class="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    {/if}
  </div>

  <div class="p-5 md:p-7">
    <h3
      class="font-serif text-xl font-semibold text-card-foreground md:text-2xl"
    >
      {property.name}
    </h3>
    {#if socialProof}
      <div class="mt-1.5">
        <StarRating
          rating={socialProof.overallRating}
          size="sm"
          showValue
          reviewCount={socialProof.totalReviews}
        />
      </div>
    {/if}
    <p class="mt-2 text-sm text-muted-foreground">{property.tagline}</p>
    {#if storyTagline}
      <p class="mt-2 font-serif text-sm italic text-muted-foreground/70">
        {storyTagline}
      </p>
    {/if}

    <div class="mt-4 flex flex-wrap gap-2">
      <span
        class="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-1.5 text-xs font-medium text-white"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
          />
        </svg>
        {property.maxGuests} guests
      </span>
      <span
        class="rounded-lg bg-navy px-3 py-1.5 text-xs font-medium text-white"
      >
        {property.bedrooms} bed{property.bedrooms > 1 ? "s" : ""}
      </span>
      <span
        class="rounded-lg bg-navy px-3 py-1.5 text-xs font-medium text-white"
      >
        {property.bathrooms} bath{property.bathrooms > 1 ? "s" : ""}
      </span>
      <span
        class="rounded-lg bg-navy px-3 py-1.5 text-xs font-medium text-white"
      >
        {property.area} m&sup2;
      </span>
    </div>

    <div class="mt-5 flex flex-col gap-2 sm:flex-row">
      <Explore360Button propertyId={property.id} class="w-full sm:flex-1" />
      <a
        href="/rooms/{property.id}"
        class="inline-flex w-full items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted sm:flex-1"
      >
        View Details
      </a>
    </div>
  </div>
</article>
