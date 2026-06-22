import {
  listingStatuses,
  propertyTypes,
  requiredPublishFields,
  transactionModes,
  type ListingStatus,
  type PropertyInput,
  type PropertyRecord
} from "./domain";

export type PublicListingFilters = {
  search: string;
  mode: string;
  type: string;
  minPrice: string;
  maxPrice: string;
  beds: string;
  baths: string;
  sort: string;
};

export type AdminListingFilters = {
  search: string;
  status: string;
};

export function cleanText(value: unknown, maxLength = 5000): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function cleanLongText(value: unknown, maxLength = 20000): string {
  return String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().slice(0, maxLength);
}

export function slugify(value: unknown): string {
  const slug = String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "listing";
}

export function splitMultiValue(value: unknown): string[] {
  return String(value ?? "")
    .split(/\n|\||,/)
    .map((item) => cleanText(item, 200))
    .filter(Boolean);
}

export function joinMultiValue(values: string[]): string {
  return values.map((value) => cleanText(value, 200)).filter(Boolean).join("|");
}

export function parseAmount(value: unknown): number | null {
  const normalized = String(value ?? "").replace(/[$,\s]/g, "");
  if (!normalized) {
    return null;
  }

  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

export function formatMoney(value: unknown, currency = "USD"): string {
  const amount = parseAmount(value);
  if (amount === null) {
    return "Price on request";
  }

  try {
    return new Intl.NumberFormat("en-US", {
      currency: currency || "USD",
      maximumFractionDigits: 0,
      style: "currency"
    }).format(amount);
  } catch {
    return `${currency || "USD"} ${amount.toLocaleString("en-US")}`;
  }
}

export function isHttpUrl(value: unknown): boolean {
  const text = cleanText(value, 2000);
  if (!text) {
    return true;
  }

  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isYouTubeUrl(value: unknown): boolean {
  const text = cleanText(value, 2000);
  if (!text) {
    return true;
  }

  try {
    const url = new URL(text);
    const host = url.hostname.replace(/^www\./, "");
    return host === "youtube.com" || host === "youtu.be" || host === "m.youtube.com";
  } catch {
    return false;
  }
}

export function choiceOrDefault<T extends readonly string[]>(value: unknown, choices: T, fallback: T[number]): T[number] {
  return choices.includes(String(value) as T[number]) ? (String(value) as T[number]) : fallback;
}

export function propertyQualityIssues(input: PropertyInput, status: ListingStatus = choiceOrDefault(input.status, listingStatuses, "draft")): string[] {
  const issues: string[] = [];
  const cityOrDistrict = cleanText(input.city) || cleanText(input.district);

  if (status === "published") {
    for (const required of requiredPublishFields) {
      if (!cleanText(input[required.field])) {
        issues.push(`${required.label} is required to publish.`);
      }
    }

    if (!cityOrDistrict) {
      issues.push("City or district is required to publish.");
    }
  }

  if (cleanText(input.price) && parseAmount(input.price) === null) {
    issues.push("Price must be a number.");
  }

  if (cleanText(input.deposit) && parseAmount(input.deposit) === null) {
    issues.push("Deposit must be a number.");
  }

  if (cleanText(input.bedrooms) && parseAmount(input.bedrooms) === null) {
    issues.push("Bedrooms must be a number.");
  }

  if (cleanText(input.bathrooms) && parseAmount(input.bathrooms) === null) {
    issues.push("Bathrooms must be a number.");
  }

  if (!isHttpUrl(input.googleMapsUrl)) {
    issues.push("Google Maps URL must be a valid URL.");
  }

  if (!isHttpUrl(input.primaryImageUrl)) {
    issues.push("Primary image URL must be a valid URL.");
  }

  if (!isHttpUrl(input.floorPlanUrl)) {
    issues.push("Floor plan URL must be a valid URL.");
  }

  if (!isYouTubeUrl(input.youtubeUrl)) {
    issues.push("YouTube URL must be a YouTube link.");
  }

  return issues;
}

export function normalizePropertyInput(input: PropertyInput, actorId: string, existing?: PropertyRecord): Omit<PropertyRecord, "id" | "createdAt" | "updatedAt"> {
  const title = cleanText(input.title ?? existing?.title, 160);
  const slug = slugify(input.slug || existing?.slug || title);

  return {
    slug,
    title,
    description: cleanLongText(input.description ?? existing?.description, 5000),
    status: choiceOrDefault(input.status ?? existing?.status, listingStatuses, "draft"),
    transactionMode: choiceOrDefault(input.transactionMode ?? existing?.transactionMode, transactionModes, "rent"),
    propertyType: choiceOrDefault(input.propertyType ?? existing?.propertyType, propertyTypes, "apartment"),
    price: cleanText(input.price ?? existing?.price, 40),
    currency: cleanText((input.currency ?? existing?.currency) || "USD", 12).toUpperCase(),
    deposit: cleanText(input.deposit ?? existing?.deposit, 40),
    feesText: cleanText(input.feesText ?? existing?.feesText, 280),
    bedrooms: cleanText(input.bedrooms ?? existing?.bedrooms, 20),
    bathrooms: cleanText(input.bathrooms ?? existing?.bathrooms, 20),
    areaSize: cleanText(input.areaSize ?? existing?.areaSize, 30),
    areaUnit: cleanText((input.areaUnit ?? existing?.areaUnit) || "sqft", 20),
    addressDisplay: cleanText(input.addressDisplay ?? existing?.addressDisplay, 240),
    city: cleanText(input.city ?? existing?.city, 120),
    district: cleanText(input.district ?? existing?.district, 120),
    provinceOrState: cleanText(input.provinceOrState ?? existing?.provinceOrState, 120),
    country: cleanText((input.country ?? existing?.country) || "United States", 120),
    googleMapsUrl: cleanText(input.googleMapsUrl ?? existing?.googleMapsUrl, 2000),
    availabilityText: cleanText(input.availabilityText ?? existing?.availabilityText, 200),
    availableFrom: cleanText(input.availableFrom ?? existing?.availableFrom, 40),
    amenities: joinMultiValue(splitMultiValue(input.amenities ?? existing?.amenities)),
    youtubeUrl: cleanText(input.youtubeUrl ?? existing?.youtubeUrl, 2000),
    floorPlanUrl: cleanText(input.floorPlanUrl ?? existing?.floorPlanUrl, 2000),
    primaryImageUrl: cleanText(input.primaryImageUrl ?? existing?.primaryImageUrl, 2000),
    createdBy: existing?.createdBy || actorId,
    updatedBy: actorId
  };
}

export function propertySearchText(property: PropertyRecord): string {
  return [
    property.title,
    property.description,
    property.addressDisplay,
    property.city,
    property.district,
    property.provinceOrState,
    property.country,
    property.amenities
  ]
    .join(" ")
    .toLowerCase();
}

export function filterPublicListings(properties: PropertyRecord[], filters: PublicListingFilters): PropertyRecord[] {
  const min = parseAmount(filters.minPrice);
  const max = parseAmount(filters.maxPrice);
  const bedMin = filters.beds === "any" ? null : Number(filters.beds);
  const bathMin = filters.baths === "any" ? null : Number(filters.baths);
  const needle = cleanText(filters.search).toLowerCase();

  return [...properties]
    .filter((property) => {
      const price = parseAmount(property.price) ?? 0;
      const propertyBeds = parseAmount(property.bedrooms) ?? 0;
      const propertyBaths = parseAmount(property.bathrooms) ?? 0;

      return (
        (!needle || propertySearchText(property).includes(needle)) &&
        (filters.mode === "all" || property.transactionMode === filters.mode) &&
        (filters.type === "all" || property.propertyType === filters.type) &&
        (min === null || price >= min) &&
        (max === null || price <= max) &&
        (bedMin === null || propertyBeds >= bedMin) &&
        (bathMin === null || propertyBaths >= bathMin)
      );
    })
    .sort((left, right) => {
      if (filters.sort === "price-asc") {
        return (parseAmount(left.price) ?? 0) - (parseAmount(right.price) ?? 0);
      }
      if (filters.sort === "price-desc") {
        return (parseAmount(right.price) ?? 0) - (parseAmount(left.price) ?? 0);
      }
      return right.updatedAt.localeCompare(left.updatedAt);
    });
}

export function filterAdminListings(properties: PropertyRecord[], filters: AdminListingFilters): PropertyRecord[] {
  const needle = cleanText(filters.search).toLowerCase();

  return properties.filter((property) => {
    const visibleByStatus = filters.status === "active" ? property.status !== "archived" : filters.status === "all" || property.status === filters.status;
    return visibleByStatus && (!needle || propertySearchText(property).includes(needle));
  });
}

export function sortOrderNumber(value: unknown): number {
  const amount = parseAmount(value);
  return amount ?? 0;
}
