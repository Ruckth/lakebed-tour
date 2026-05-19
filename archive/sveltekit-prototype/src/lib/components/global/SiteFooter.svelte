<script lang="ts">
  import { resort } from "$lib/data/resort-config";
</script>

<footer class="border-border bg-primary text-primary-foreground border-t">
  <div class="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
    <div class="grid gap-8 md:grid-cols-4">
      <div class="md:col-span-2">
        <p class="font-serif text-2xl font-semibold">{resort.name}</p>
        <p
          class="text-primary-foreground/70 mt-2 max-w-md text-sm leading-relaxed"
        >
          {resort.description}
        </p>
      </div>

      <div>
        <h4
          class="text-primary-foreground/50 text-xs font-semibold tracking-[0.2em] uppercase"
        >
          Explore
        </h4>
        <div class="mt-3 flex flex-col gap-2">
          <a
            href="/#villas"
            class="text-primary-foreground/70 hover:text-primary-foreground text-sm transition"
          >
            Our Villas
          </a>
          <a
            href="/#amenities"
            class="text-primary-foreground/70 hover:text-primary-foreground text-sm transition"
          >
            Amenities
          </a>
          <a
            href="/#reviews"
            class="text-primary-foreground/70 hover:text-primary-foreground text-sm transition"
          >
            Guest Reviews
          </a>
          <a
            href="/#contact"
            class="text-primary-foreground/70 hover:text-primary-foreground text-sm transition"
          >
            Contact
          </a>
        </div>
      </div>

      <div>
        <h4
          class="text-primary-foreground/50 text-xs font-semibold tracking-[0.2em] uppercase"
        >
          Contact
        </h4>
        <div
          class="text-primary-foreground/70 mt-3 flex flex-col gap-2 text-sm"
        >
          <p>{resort.contactEmail}</p>
          <p>{resort.contactPhone}</p>
          <p>{resort.address}</p>
        </div>
      </div>
    </div>

    <div
      class="border-primary-foreground/10 text-primary-foreground/40 mt-10 border-t pt-6 text-center text-xs"
    >
      &copy; {new Date().getFullYear()}
      {resort.name}. All rights reserved.
    </div>
  </div>
</footer>
