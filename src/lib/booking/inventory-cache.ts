import type { BookingProperty } from "@/lib/booking/booking";

const BOOKING_INVENTORY_CACHE_VERSION = 1;
const BOOKING_INVENTORY_CACHE_TTL_MS = 5 * 60 * 1000;

type BookingInventoryCache = {
  version: number;
  todayIso: string;
  locale: string;
  propertyList: BookingProperty[];
  blockedByProperty: Record<string, string[]>;
  updatedAt: number;
};

function getBookingInventoryCacheKey(locale: string, todayIso: string) {
  return `sv_booking_inventory:${locale}:${todayIso}`;
}

function isBookingPropertyList(value: unknown): value is BookingProperty[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => {
      if (!item || typeof item !== "object") return false;
      const property = item as Partial<BookingProperty>;
      return (
        typeof property.slug === "string" &&
        typeof property.name === "string" &&
        typeof property.pricePerNight === "number" &&
        typeof property.currency === "string" &&
        typeof property.directDiscountPercent === "number" &&
        (property.source === "live" || property.source === "demo")
      );
    })
  );
}

function isBlockedByProperty(value: unknown): value is Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every(
    (dates) => Array.isArray(dates) && dates.every((date) => typeof date === "string"),
  );
}

export function readBookingInventoryCache(locale: string, todayIso: string) {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(getBookingInventoryCacheKey(locale, todayIso));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<BookingInventoryCache>;
    if (parsed.version !== BOOKING_INVENTORY_CACHE_VERSION) return null;
    if (parsed.locale !== locale || parsed.todayIso !== todayIso) return null;
    if (typeof parsed.updatedAt !== "number") return null;
    if (Date.now() - parsed.updatedAt > BOOKING_INVENTORY_CACHE_TTL_MS) return null;
    if (!isBookingPropertyList(parsed.propertyList)) return null;
    if (!isBlockedByProperty(parsed.blockedByProperty)) return null;

    return {
      propertyList: parsed.propertyList,
      blockedByProperty: parsed.blockedByProperty,
    };
  } catch {
    return null;
  }
}

export function writeBookingInventoryCache(
  locale: string,
  todayIso: string,
  propertyList: BookingProperty[],
  blockedByProperty: Record<string, string[]>,
) {
  if (typeof window === "undefined" || !propertyList.length) return;

  const cache: BookingInventoryCache = {
    version: BOOKING_INVENTORY_CACHE_VERSION,
    locale,
    todayIso,
    propertyList,
    blockedByProperty,
    updatedAt: Date.now(),
  };

  try {
    window.sessionStorage.setItem(
      getBookingInventoryCacheKey(locale, todayIso),
      JSON.stringify(cache),
    );
  } catch {
    // Cache is a speed hint only.
  }
}
