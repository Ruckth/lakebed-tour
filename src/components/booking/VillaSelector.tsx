"use client";

import { PropertyImage } from "@/components/property/PropertyImage";
import { SwipeRail } from "@/components/ui/SwipeRail";
import type { BookingProperty } from "@/lib/booking/booking";
import { resort } from "@/lib/data/resort-config";
import { cn } from "@/lib/utils";

export function VillaSelector({
  properties,
  selectedId,
  availablePropertyIds,
  onSelect,
}: {
  properties: BookingProperty[];
  selectedId: string;
  availablePropertyIds: Set<string>;
  onSelect: (property: BookingProperty) => void;
}) {
  function renderCard(item: BookingProperty) {
    const unavailable = !availablePropertyIds.has(item.slug);
    const selected = selectedId === item.slug;

    return (
      <button
        key={item.slug}
        type="button"
        onClick={() => onSelect(item)}
        disabled={unavailable}
        className={cn(
          "group h-full w-full overflow-hidden rounded-xl border bg-card text-left transition",
          selected ? "border-gold ring-2 ring-gold/30" : "border-border hover:border-gold/50",
          unavailable && "cursor-not-allowed opacity-55",
        )}
      >
        <div className="relative aspect-[4/3]">
          <PropertyImage
            images={item.images}
            alt={item.name}
            sizes="(min-width: 768px) 33vw, 82vw"
            imgClassName="transition-transform duration-500 group-hover:scale-105"
          />
          {unavailable ? (
            <span className="absolute right-3 top-3 rounded-full bg-destructive px-2.5 py-1 text-[10px] font-bold text-destructive-foreground">
              Unavailable
            </span>
          ) : null}
          <span className="absolute bottom-3 right-3 rounded-full bg-background/90 px-2.5 py-1 text-[10px] font-bold text-foreground shadow-lg backdrop-blur">
            Up to {item.maxGuests} guests
          </span>
        </div>
        <div className="p-3">
          <p className="text-sm font-semibold text-foreground">{item.name}</p>
          <p className="text-xs text-muted-foreground">
            {resort.currencySymbol}
            {item.pricePerNight.toLocaleString()}/night
          </p>
        </div>
      </button>
    );
  }

  return (
    <>
      <div className="md:hidden">
        <SwipeRail
          label="Villa options"
          viewportClassName="-mx-5 px-5"
          itemClassName="basis-[84%]"
        >
          {properties.map((item) => renderCard(item))}
        </SwipeRail>
      </div>
      <div className="hidden gap-3 md:grid md:grid-cols-3">
        {properties.map((item) => renderCard(item))}
      </div>
    </>
  );
}
