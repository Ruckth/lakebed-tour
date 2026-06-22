import {
  Link,
  Route,
  Router,
  Routes,
  SignInWithGoogle,
  signOut,
  useAuth,
  useMutation,
  useParams
} from "lakebed/client";
import { useEffect, useMemo, useState } from "preact/hooks";
import {
  cleanLongText,
  cleanText,
  csvTemplate,
  defaultFaqs,
  answerPropertyQuestion,
  filterAdminListings,
  filterPublicListings,
  formatMoney,
  initialFaqAnswer,
  leadStatusLabels,
  leadStatuses,
  listingStatuses,
  normalizePropertyInput,
  parseCsvText,
  propertyQualityIssues,
  propertyTypeLabels,
  propertyTypes,
  slugify,
  sortOrderNumber,
  splitMultiValue,
  statusLabels,
  suggestedFaqQuestions,
  transactionModeLabels,
  transactionModes,
  type CsvImportRecord,
  type FaqRecord,
  type InquiryRecord,
  type LeadStatus,
  type ListingStatus,
  type MutationResult,
  type PropertyInput,
  type PropertyMediaRecord,
  type PropertyRecord
} from "../shared/content";
import { useQuery } from "lakebed/client";

type DashboardData = {
  signedIn: boolean;
  counts: Record<ListingStatus, number>;
  recentInquiries: InquiryRecord[];
  latestImport: CsvImportRecord | null;
};

type InquiryFormState = {
  name: string;
  email: string;
  phone: string;
  preferredContactMethod: string;
  moveInTimeline: string;
  budget: string;
  message: string;
};

const emptyProperty: PropertyInput = {
  slug: "",
  title: "",
  description: "",
  status: "draft",
  transactionMode: "rent",
  propertyType: "apartment",
  price: "",
  currency: "USD",
  deposit: "",
  feesText: "",
  bedrooms: "",
  bathrooms: "",
  areaSize: "",
  areaUnit: "sqft",
  addressDisplay: "",
  city: "",
  district: "",
  provinceOrState: "",
  country: "United States",
  googleMapsUrl: "",
  availabilityText: "",
  availableFrom: "",
  amenities: "",
  youtubeUrl: "",
  floorPlanUrl: "",
  primaryImageUrl: ""
};

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

function ResultMessage({ result }: { result: MutationResult | null }) {
  if (!result) {
    return null;
  }

  return (
    <div
      className={cx(
        "rounded-md border px-3 py-2 text-sm",
        result.ok ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"
      )}
    >
      {result.ok ? "Saved." : result.error || result.errors?.join(" ")}
    </div>
  );
}

function StatusPill({ status }: { status: ListingStatus | LeadStatus }) {
  const color = status === "published" || status === "contacted" || status === "viewing_scheduled"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : status === "hidden" || status === "ignored"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : status === "archived" || status === "closed"
        ? "border-neutral-300 bg-neutral-100 text-neutral-700"
        : "border-[#dceef3] bg-[#eef8fa] text-[#084943]";
  const label = (statusLabels as Record<string, string>)[status] || (leadStatusLabels as Record<string, string>)[status] || status;

  return <span className={cx("inline-flex rounded-full border px-2 py-1 text-xs font-medium", color)}>{label}</span>;
}

function Field({
  error,
  hint,
  label,
  name,
  onInput,
  placeholder,
  type = "text",
  value
}: {
  error?: string;
  hint?: string;
  label: string;
  name: string;
  onInput: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  const inputId = `field-${name}`;
  const helpId = `${inputId}-help`;

  return (
    <label className="grid gap-1.5 text-sm font-medium text-neutral-800" htmlFor={inputId}>
      <span>{label}</span>
      <input
        aria-describedby={hint || error ? helpId : undefined}
        aria-invalid={Boolean(error)}
        className={cx(
          "min-h-10 rounded-md border bg-white px-3 py-2 text-sm outline-none transition focus:ring-2",
          error
            ? "border-rose-300 focus:border-rose-600 focus:ring-rose-100"
            : "border-neutral-300 focus:border-[#0d6b63] focus:ring-[#d9ebe8]"
        )}
        id={inputId}
        name={name}
        placeholder={placeholder}
        type={type}
        value={value}
        onInput={(event) => onInput((event.currentTarget as HTMLInputElement).value)}
      />
      {error ? (
        <span id={helpId} className="text-xs font-semibold text-rose-700">
          {error}
        </span>
      ) : hint ? (
        <span id={helpId} className="text-xs font-normal text-neutral-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function TextAreaField({
  error,
  hint,
  label,
  name,
  onInput,
  placeholder,
  rows = 4,
  value
}: {
  error?: string;
  hint?: string;
  label: string;
  name: string;
  onInput: (value: string) => void;
  placeholder?: string;
  rows?: number;
  value: string;
}) {
  const inputId = `field-${name}`;
  const helpId = `${inputId}-help`;

  return (
    <label className="grid gap-1.5 text-sm font-medium text-neutral-800" htmlFor={inputId}>
      <span>{label}</span>
      <textarea
        aria-describedby={hint || error ? helpId : undefined}
        aria-invalid={Boolean(error)}
        className={cx(
          "rounded-md border bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:ring-2",
          error
            ? "border-rose-300 focus:border-rose-600 focus:ring-rose-100"
            : "border-neutral-300 focus:border-[#0d6b63] focus:ring-[#d9ebe8]"
        )}
        id={inputId}
        name={name}
        placeholder={placeholder}
        rows={rows}
        value={value}
        onInput={(event) => onInput((event.currentTarget as HTMLTextAreaElement).value)}
      />
      {error ? (
        <span id={helpId} className="text-xs font-semibold text-rose-700">
          {error}
        </span>
      ) : hint ? (
        <span id={helpId} className="text-xs font-normal text-neutral-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function SelectField({
  label,
  name,
  onInput,
  options,
  value
}: {
  label: string;
  name: string;
  onInput: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  const inputId = `field-${name}`;

  return (
    <label className="grid gap-1.5 text-sm font-medium text-neutral-800" htmlFor={inputId}>
      <span>{label}</span>
      <select
        className="min-h-10 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#0d6b63] focus:ring-2 focus:ring-[#d9ebe8]"
        id={inputId}
        name={name}
        value={value}
        onInput={(event) => onInput((event.currentTarget as HTMLSelectElement).value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function locationText(property: PropertyRecord, includeState = false): string {
  const parts = includeState
    ? [property.district, property.city, property.provinceOrState]
    : [property.district, property.city];
  return parts.filter(Boolean).join(", ") || property.city || "Location on request";
}

function shortDate(value: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function relativeAge(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown age";
  }

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 60) {
    return `${minutes || 1}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function isStale(value: string, days = 21): boolean {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return Date.now() - date.getTime() > days * 24 * 60 * 60 * 1000;
}

function availabilityMeta(property: PropertyRecord): { label: string; className: string } {
  const text = cleanText(property.availabilityText).toLowerCase();
  const availableFrom = property.availableFrom ? new Date(property.availableFrom) : null;
  const hasKnownDate = availableFrom && !Number.isNaN(availableFrom.getTime());
  const isFutureDate = Boolean(hasKnownDate && availableFrom && availableFrom.getTime() > Date.now());

  if (text.includes("now") || (hasKnownDate && !isFutureDate)) {
    return { label: "Available now", className: "border-emerald-200 bg-emerald-50 text-emerald-800" };
  }

  if (hasKnownDate && property.availableFrom) {
    return { label: `Available ${shortDate(property.availableFrom)}`, className: "border-[#b9862e]/30 bg-[#fff7e6] text-[#765016]" };
  }

  if (text.includes("limited") || text.includes("soon")) {
    return { label: cleanText(property.availabilityText, 60), className: "border-[#c24b32]/30 bg-[#f8e7e1] text-[#7c2b1e]" };
  }

  return {
    label: property.availabilityText || "Confirm availability",
    className: "border-neutral-200 bg-white text-neutral-700"
  };
}

function mapsQuery(property: PropertyRecord): string {
  if (property.googleMapsUrl) {
    try {
      const url = new URL(property.googleMapsUrl);
      return url.searchParams.get("query") || url.searchParams.get("q") || property.googleMapsUrl;
    } catch {
      return property.googleMapsUrl;
    }
  }

  return [property.addressDisplay, property.district, property.city, property.provinceOrState, property.country].filter(Boolean).join(", ");
}

function googleMapsEmbedUrl(property: PropertyRecord): string {
  const query = mapsQuery(property);
  return query ? `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed` : "";
}

function externalMapsUrl(property: PropertyRecord): string {
  const query = mapsQuery(property);
  return property.googleMapsUrl || (query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : "");
}

function inquiryErrors(form: InquiryFormState): Partial<Record<keyof InquiryFormState, string>> {
  const errors: Partial<Record<keyof InquiryFormState, string>> = {};
  const email = cleanText(form.email);
  const phone = cleanText(form.phone);

  if (!cleanText(form.name)) {
    errors.name = "Name is required.";
  }

  if (!email && !phone) {
    errors.email = "Add email or phone.";
    errors.phone = "Add email or phone.";
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Email format looks invalid.";
  }

  if (!cleanText(form.message)) {
    errors.message = "Message is required.";
  }

  return errors;
}

function NavItem({ children, to }: { children: string; to: string }) {
  const current = typeof window === "undefined" ? "/" : window.location.pathname;
  const active = to === "/" ? current === "/" : current.startsWith(to);

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cx(
        "rounded-md border px-3 py-2 transition focus:outline-none focus:ring-2 focus:ring-[#d9ebe8]",
        active
          ? "border-[#0d6b63] bg-[#0d6b63] text-white"
          : "border-neutral-200 bg-[#f5f7f2] text-neutral-700 hover:border-[#0d6b63] hover:text-[#084943]"
      )}
      to={to}
    >
      {children}
    </Link>
  );
}

function AuthBadge() {
  const auth = useAuth();
  const label = auth.displayName || "Guest";

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2 shadow-sm">
      {auth.picture ? (
        <img alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" src={auth.picture} />
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#17211f] text-sm font-semibold text-white">
          {label.slice(0, 1).toUpperCase() || "G"}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-neutral-900">{label}</p>
        <p className="text-xs text-neutral-500">{auth.isLoading ? "Checking session" : auth.isGuest ? "Public visitor" : "Google admin"}</p>
      </div>
      {!auth.isLoading && !auth.isGuest ? (
        <button className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#d9ebe8]" type="button" onClick={() => signOut()}>
          Sign out
        </button>
      ) : null}
    </div>
  );
}

function Shell() {
  return (
    <main className="min-h-screen bg-[#f5f7f2] text-[#17211f]">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0d6b63]">Rental agency workspace</p>
            <Link className="mt-1 block text-3xl font-semibold tracking-tight text-neutral-950 md:text-4xl" to="/">
              OpenHouse Desk
            </Link>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
              Public listings for renters, plus the protected desk that keeps inventory and leads moving.
            </p>
          </div>
          <AuthBadge />
        </div>
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-4 text-sm font-semibold text-neutral-700 md:px-6">
          <NavItem to="/">Listings</NavItem>
          <NavItem to="/admin">Admin</NavItem>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<ListingsPage />} />
        <Route path="/property/:slug" element={<PropertyDetailPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route
          path="*"
          element={
            <section className="mx-auto max-w-4xl px-4 py-16 md:px-6">
              <h1 className="text-3xl font-semibold">That page is not listed.</h1>
              <Link className="mt-4 inline-flex rounded-md bg-[#0d6b63] px-4 py-2 text-sm font-semibold text-white hover:bg-[#084943]" to="/">
                Back to listings
              </Link>
            </section>
          }
        />
      </Routes>
    </main>
  );
}

function ListingSkeleton() {
  return (
    <article className="grid overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm" aria-label="Loading listings">
      <div className="aspect-[4/3] animate-pulse bg-neutral-200" />
      <div className="grid gap-4 p-4">
        <div className="h-4 w-32 rounded bg-neutral-200" />
        <div className="h-7 w-4/5 rounded bg-neutral-200" />
        <div className="h-5 w-40 rounded bg-neutral-200" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-10 rounded bg-neutral-100" />
          <div className="h-10 rounded bg-neutral-100" />
          <div className="h-10 rounded bg-neutral-100" />
        </div>
        <p className="text-sm font-semibold text-neutral-500">Loading listings</p>
      </div>
    </article>
  );
}

function ListingCard({ media, property }: { media: PropertyMediaRecord[]; property: PropertyRecord }) {
  const propertyMedia = media.filter((item) => item.propertyId === property.id);
  const photoCount = Math.max(1, propertyMedia.filter((item) => item.type === "photo").length);
  const availability = availabilityMeta(property);
  const specs = [
    { label: "Beds", value: property.bedrooms || "-" },
    { label: "Baths", value: property.bathrooms || "-" },
    { label: "Area", value: property.areaSize ? `${property.areaSize} ${property.areaUnit}` : "Area TBD" }
  ];
  const amenities = splitMultiValue(property.amenities).slice(0, 3);

  return (
    <article className="grid overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#0d6b63]/50 hover:shadow-md">
      <div className="relative aspect-[4/3] bg-neutral-200">
        {property.primaryImageUrl ? (
          <img alt={`${property.title} primary photo`} className="h-full w-full object-cover" src={property.primaryImageUrl} />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#dceef3] px-4 text-center text-sm font-semibold text-[#084943]">
            Image coming soon
          </div>
        )}
        <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-2">
          <span className={cx("rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm", availability.className)}>
            {availability.label}
          </span>
          {property.floorPlanUrl ? <span className="rounded-full border border-white/70 bg-white/90 px-2.5 py-1 text-xs font-semibold text-neutral-800 shadow-sm">Floor plan</span> : null}
          {property.youtubeUrl ? <span className="rounded-full border border-white/70 bg-white/90 px-2.5 py-1 text-xs font-semibold text-neutral-800 shadow-sm">Tour</span> : null}
        </div>
        <span className="absolute bottom-3 right-3 rounded-full bg-[#17211f]/85 px-2.5 py-1 text-xs font-semibold text-white">
          {photoCount} photo{photoCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="grid gap-4 p-4">
        <div className="grid gap-2">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 text-sm font-semibold text-[#0d6b63]">{locationText(property)}</p>
            <span className="shrink-0 rounded-md border border-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-700">
              {propertyTypeLabels[property.propertyType] ?? property.propertyType}
            </span>
          </div>
          <h2 className="text-xl font-semibold leading-tight text-neutral-950">{property.title}</h2>
          <p className="text-2xl font-semibold text-neutral-950">
            {formatMoney(property.price, property.currency)}
            {property.transactionMode === "rent" ? <span className="text-sm font-medium text-neutral-500"> / mo</span> : null}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm">
          {specs.map((spec) => (
            <div key={spec.label} className="rounded-md border border-neutral-200 bg-[#f5f7f2] px-2 py-2">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-neutral-500">{spec.label}</p>
              <p className="mt-0.5 font-semibold text-neutral-900">{spec.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-2 text-sm text-neutral-600">
          <p>{property.deposit ? `Deposit ${formatMoney(property.deposit, property.currency)}.` : "Move-in costs should be confirmed with the agency."}</p>
          {property.feesText ? <p>{property.feesText}</p> : null}
        </div>

        {amenities.length ? (
          <div className="flex flex-wrap gap-2">
            {amenities.map((amenity) => (
              <span key={amenity} className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700">
                {amenity}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Link className="rounded-md bg-[#0d6b63] px-3 py-2 text-sm font-semibold text-white hover:bg-[#084943] focus:outline-none focus:ring-2 focus:ring-[#d9ebe8]" to={`/property/${property.slug}`}>
            View details
          </Link>
          <Link className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-800 hover:border-[#c24b32] hover:text-[#7c2b1e] focus:outline-none focus:ring-2 focus:ring-[#f8e7e1]" to={`/property/${property.slug}#inquiry`}>
            Contact
          </Link>
        </div>
      </div>
    </article>
  );
}

function ListingsPage() {
  const propertiesResult = useQuery<PropertyRecord[]>("listPublishedProperties");
  const mediaResult = useQuery<PropertyMediaRecord[]>("listPublishedPropertyMedia");
  const properties = propertiesResult ?? [];
  const media = mediaResult ?? [];
  const isLoading = !propertiesResult || !mediaResult;
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("all");
  const [type, setType] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [beds, setBeds] = useState("any");
  const [baths, setBaths] = useState("any");
  const [sort, setSort] = useState("newest");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtered = useMemo(() => {
    return filterPublicListings(properties, { search, mode, type, minPrice, maxPrice, beds, baths, sort });
  }, [baths, beds, maxPrice, minPrice, mode, properties, search, sort, type]);

  function resetFilters() {
    setSearch("");
    setMode("all");
    setType("all");
    setMinPrice("");
    setMaxPrice("");
    setBeds("any");
    setBaths("any");
    setSort("newest");
  }

  const activeFilters = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];
    if (search) {
      chips.push({ key: "search", label: `Search: ${search}`, onRemove: () => setSearch("") });
    }
    if (mode !== "all") {
      chips.push({ key: "mode", label: transactionModeLabels[mode as keyof typeof transactionModeLabels] ?? mode, onRemove: () => setMode("all") });
    }
    if (type !== "all") {
      chips.push({ key: "type", label: propertyTypeLabels[type as keyof typeof propertyTypeLabels] ?? type, onRemove: () => setType("all") });
    }
    if (minPrice) {
      chips.push({ key: "min", label: `From ${formatMoney(minPrice)}`, onRemove: () => setMinPrice("") });
    }
    if (maxPrice) {
      chips.push({ key: "max", label: `Up to ${formatMoney(maxPrice)}`, onRemove: () => setMaxPrice("") });
    }
    if (beds !== "any") {
      chips.push({ key: "beds", label: `${beds === "0" ? "Studio" : `${beds}+ beds`}`, onRemove: () => setBeds("any") });
    }
    if (baths !== "any") {
      chips.push({ key: "baths", label: `${baths}+ baths`, onRemove: () => setBaths("any") });
    }
    return chips;
  }, [baths, beds, maxPrice, minPrice, mode, search, type]);

  const locationSummary = search ? `in ${search}` : "across current markets";

  function renderFilterControls(prefix: string) {
    return (
      <div className="grid gap-3">
        <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr_0.75fr]">
          <Field label="Location or keyword" name={`${prefix}-search`} placeholder="Austin, Downtown, parking..." value={search} onInput={setSearch} />
          <SelectField
            label="Property type"
            name={`${prefix}-type`}
            value={type}
            options={[{ label: "All types", value: "all" }, ...propertyTypes.map((item) => ({ label: propertyTypeLabels[item], value: item }))]}
            onInput={setType}
          />
          <SelectField
            label="Sort"
            name={`${prefix}-sort`}
            value={sort}
            options={[
              { label: "Newest", value: "newest" },
              { label: "Price low-high", value: "price-asc" },
              { label: "Price high-low", value: "price-desc" }
            ]}
            onInput={setSort}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Min price" name={`${prefix}-minPrice`} type="number" value={minPrice} onInput={setMinPrice} />
          <Field label="Max price" name={`${prefix}-maxPrice`} type="number" value={maxPrice} onInput={setMaxPrice} />
          <SelectField
            label="Bedrooms"
            name={`${prefix}-beds`}
            value={beds}
            options={[
              { label: "Any", value: "any" },
              { label: "Studio+", value: "0" },
              { label: "1+", value: "1" },
              { label: "2+", value: "2" },
              { label: "3+", value: "3" },
              { label: "4+", value: "4" }
            ]}
            onInput={setBeds}
          />
          <SelectField
            label="Bathrooms"
            name={`${prefix}-baths`}
            value={baths}
            options={[
              { label: "Any", value: "any" },
              { label: "1+", value: "1" },
              { label: "2+", value: "2" },
              { label: "3+", value: "3" }
            ]}
            onInput={setBaths}
          />
        </div>
      </div>
    );
  }

  return (
    <section className="grid gap-6 pb-8">
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 md:px-6 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0d6b63]">Public listings</p>
            <h1 className="mt-2 max-w-4xl text-3xl font-semibold tracking-tight md:text-5xl">Find a place, then ask the agency for the live details.</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-neutral-600">
              Search current inventory, compare move-in costs, and send one focused inquiry when a listing looks right.
            </p>
          </div>
          <div className="grid gap-3 rounded-lg border border-neutral-200 bg-[#f5f7f2] p-3">
            <div className="grid grid-cols-3 rounded-md border border-neutral-200 bg-white p-1 text-sm font-semibold">
              {[{ label: "All", value: "all" }, ...transactionModes.map((item) => ({ label: transactionModeLabels[item].replace("For ", ""), value: item }))].map((item) => (
                <button
                  key={item.value}
                  className={cx("rounded px-3 py-2 transition", mode === item.value ? "bg-[#17211f] text-white" : "text-neutral-700 hover:bg-neutral-100")}
                  type="button"
                  onClick={() => setMode(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <a className="rounded-md bg-[#c24b32] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#9d3724] focus:outline-none focus:ring-2 focus:ring-[#f8e7e1]" href="#results">
              Browse results
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 md:px-6">
        <section className="hidden gap-4 rounded-lg border border-neutral-200 bg-white p-4 lg:grid">
          {renderFilterControls("desktop")}
          {activeFilters.length ? (
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((chip) => (
                <button key={chip.key} aria-label={`Remove ${chip.label}`} className="rounded-full border border-[#0d6b63]/25 bg-[#e4efe3] px-3 py-1.5 text-sm font-semibold text-[#084943] hover:border-[#0d6b63]" type="button" onClick={chip.onRemove}>
                  {chip.label} x
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <div id="results" className="sticky top-0 z-20 -mx-4 border-y border-neutral-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur md:-mx-6 md:px-6">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-900">
                {isLoading ? "Loading listings" : `${filtered.length} listing${filtered.length === 1 ? "" : "s"} ${locationSummary}`}
              </p>
              <p className="text-xs text-neutral-500">Map context appears on each detail page; cards stay focused for comparison.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-800 hover:border-[#0d6b63] lg:hidden" type="button" onClick={() => setFiltersOpen(true)}>
                Filters
              </button>
              <div className="grid grid-cols-2 rounded-md border border-neutral-300 bg-white p-1 text-sm font-semibold">
                {(["comfortable", "compact"] as const).map((item) => (
                  <button key={item} className={cx("rounded px-3 py-1.5 capitalize", density === item ? "bg-[#17211f] text-white" : "text-neutral-700 hover:bg-neutral-100")} type="button" onClick={() => setDensity(item)}>
                    {item}
                  </button>
                ))}
              </div>
              <button className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-800 hover:border-neutral-900" type="button" onClick={resetFilters}>
                Reset
              </button>
            </div>
          </div>
          {activeFilters.length ? (
            <div className="mx-auto mt-3 flex max-w-7xl gap-2 overflow-x-auto pb-1 lg:hidden">
              {activeFilters.map((chip) => (
                <button key={chip.key} aria-label={`Remove ${chip.label}`} className="shrink-0 rounded-full border border-[#0d6b63]/25 bg-[#e4efe3] px-3 py-1.5 text-sm font-semibold text-[#084943]" type="button" onClick={chip.onRemove}>
                  {chip.label} x
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {isLoading ? (
          <div className={cx("grid gap-5", density === "compact" ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2 xl:grid-cols-3")}>
            {["a", "b", "c", "d", "e", "f"].map((key) => (
              <ListingSkeleton key={key} />
            ))}
          </div>
        ) : filtered.length ? (
          <div className={cx("grid gap-5", density === "compact" ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2 xl:grid-cols-3")}>
          {filtered.map((property) => (
            <ListingCard key={property.id} media={media} property={property} />
          ))}
        </div>
        ) : (
          <div className="grid gap-4 rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-12 text-center">
            <div>
              <h2 className="text-xl font-semibold">No listings match those filters.</h2>
              <p className="mt-2 text-sm text-neutral-600">Clear filters, broaden the price range, or ask the agency about off-market options.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button className="rounded-md bg-[#0d6b63] px-4 py-2 text-sm font-semibold text-white hover:bg-[#084943]" type="button" onClick={resetFilters}>
                Clear filters
              </button>
              <button className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 hover:border-[#c24b32]" type="button" onClick={() => {
                setMinPrice("");
                setMaxPrice("");
              }}>
                Broaden price
              </button>
            </div>
          </div>
        )}
      </div>

      {filtersOpen ? (
        <div className="fixed inset-0 z-40 bg-[#17211f]/40 lg:hidden" role="presentation">
          <section className="absolute inset-x-0 bottom-0 grid max-h-[88vh] gap-4 overflow-auto rounded-t-lg bg-white p-4 shadow-2xl" role="dialog" aria-label="Listing filters" aria-modal="true">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Filters</h2>
              <button className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold" type="button" onClick={() => setFiltersOpen(false)}>
                Close
              </button>
            </div>
            {renderFilterControls("mobile")}
            <div className="sticky bottom-0 -mx-4 grid grid-cols-2 gap-2 border-t border-neutral-200 bg-white p-4">
              <button className="rounded-md border border-neutral-300 px-4 py-3 text-sm font-semibold" type="button" onClick={resetFilters}>
                Reset
              </button>
              <button className="rounded-md bg-[#0d6b63] px-4 py-3 text-sm font-semibold text-white" type="button" onClick={() => setFiltersOpen(false)}>
                Show results
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function PropertyGallery({ media, property }: { media: PropertyMediaRecord[]; property: PropertyRecord }) {
  const photos = media.filter((item) => item.propertyId === property.id && item.type === "photo").sort((left, right) => sortOrderNumber(left.sortOrder) - sortOrderNumber(right.sortOrder));
  const gallery = photos.length
    ? photos
    : [
        {
          id: `${property.id}-primary`,
          propertyId: property.id,
          type: "photo" as const,
          url: property.primaryImageUrl,
          altText: `${property.title} primary photo`,
          caption: "Primary image",
          sortOrder: "1",
          isPrimary: true,
          createdAt: property.createdAt,
          updatedAt: property.updatedAt
        }
      ];
  const [selectedId, setSelectedId] = useState(gallery[0]?.id ?? "");
  const selected = gallery.find((item) => item.id === selectedId) ?? gallery[0];

  return (
    <section id="photos" className="grid gap-3 scroll-mt-20">
      <div className="relative overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200">
        <img alt={selected.altText || property.title} className="aspect-[4/3] w-full object-cover lg:aspect-[16/11]" src={selected.url || property.primaryImageUrl} />
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-[#17211f]/85 px-2.5 py-1 text-xs font-semibold text-white">
            {gallery.length} photo{gallery.length === 1 ? "" : "s"}
          </span>
          {property.floorPlanUrl ? <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-neutral-800">Floor plan</span> : null}
          {property.youtubeUrl ? <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-neutral-800">Video tour</span> : null}
        </div>
      </div>
      {gallery.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {gallery.map((item) => (
            <button
              key={item.id}
              aria-label={`Show ${item.caption || item.altText || property.title}`}
              className={cx("h-20 w-28 shrink-0 overflow-hidden rounded-md border focus:outline-none focus:ring-2 focus:ring-[#d9ebe8]", item.id === selected.id ? "border-[#0d6b63]" : "border-neutral-200")}
              type="button"
              onClick={() => setSelectedId(item.id)}
            >
              <img alt={item.altText || property.title} className="h-full w-full object-cover" src={item.url} />
            </button>
          ))}
        </div>
      ) : null}
      {selected.caption ? <p className="text-sm text-neutral-500">{selected.caption}</p> : null}
    </section>
  );
}

function InquiryForm({ prefillMessage, property }: { prefillMessage: string; property: PropertyRecord }) {
  const createInquiry = useMutation<[input: InquiryFormState & { propertyId: string; sourcePage: string }], MutationResult<{ id: string; propertyTitle: string }>>("createInquiry");
  const [form, setForm] = useState<InquiryFormState>({
    name: "",
    email: "",
    phone: "",
    preferredContactMethod: "email",
    moveInTimeline: "",
    budget: "",
    message: `I am interested in ${property.title}.`
  });
  const [result, setResult] = useState<MutationResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const setField = (field: keyof InquiryFormState, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const errors = attempted ? inquiryErrors(form) : {};

  useEffect(() => {
    if (!prefillMessage) {
      return;
    }

    setForm((current) => ({ ...current, message: prefillMessage }));
    setResult(null);
  }, [prefillMessage]);

  async function submit(event: Event) {
    event.preventDefault();
    setAttempted(true);
    const validationErrors = inquiryErrors(form);
    if (Object.keys(validationErrors).length) {
      setResult({ ok: false, errors: Object.values(validationErrors).filter(Boolean) });
      return;
    }

    setSubmitting(true);
    const response = await createInquiry({
      ...form,
      propertyId: property.id,
      sourcePage: `/property/${property.slug}`
    });
    setResult(response);
    setSubmitting(false);
    if (response.ok) {
      setForm((current) => ({ ...current, message: `I am interested in ${property.title}.` }));
    }
  }

  return (
    <section id="inquiry" className="grid scroll-mt-20 gap-4 rounded-lg border border-neutral-200 bg-white p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0d6b63]">Usually same business day</p>
        <h2 className="mt-1 text-2xl font-semibold">Ask about {property.title}</h2>
        <p className="mt-1 text-sm leading-6 text-neutral-600">We use this only to respond about this listing and confirm availability, fees, and viewing options.</p>
      </div>
      <ResultMessage result={result} />
      {result?.ok ? (
        <div className="grid gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <p className="font-semibold">Inquiry received for {property.title}.</p>
          <p>The agency will confirm current availability, move-in costs, and viewing options using your preferred contact method.</p>
          <button className="justify-self-start rounded-md border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-900" type="button" onClick={() => {
            setAttempted(false);
            setResult(null);
          }}>
            Send another question
          </button>
        </div>
      ) : null}
      <form className="grid gap-3" onSubmit={(event) => void submit(event)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field error={errors.name} label="Name" name="name" value={form.name} onInput={(value) => setField("name", value)} />
          <Field error={errors.email} label="Email" name="email" type="email" value={form.email} onInput={(value) => setField("email", value)} />
          <Field error={errors.phone} label="Phone" name="phone" value={form.phone} onInput={(value) => setField("phone", value)} />
          <SelectField
            label="Preferred contact"
            name="preferredContactMethod"
            value={form.preferredContactMethod}
            options={[
              { label: "Email", value: "email" },
              { label: "Phone", value: "phone" },
              { label: "Text", value: "text" }
            ]}
            onInput={(value) => setField("preferredContactMethod", value)}
          />
        </div>
        <TextAreaField error={errors.message} label="Message" name="message" rows={4} value={form.message} onInput={(value) => setField("message", value)} />
        <details className="rounded-md border border-neutral-200 bg-[#f5f7f2] p-3">
          <summary className="cursor-pointer text-sm font-semibold text-neutral-800">Optional details</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Move-in timeline" name="moveInTimeline" value={form.moveInTimeline} onInput={(value) => setField("moveInTimeline", value)} />
            <Field label="Budget" name="budget" value={form.budget} onInput={(value) => setField("budget", value)} />
          </div>
        </details>
        <button className="w-full rounded-md bg-[#c24b32] px-4 py-3 text-sm font-semibold text-white hover:bg-[#9d3724] disabled:opacity-60 sm:w-auto" disabled={submitting || result?.ok} type="submit">
          {submitting ? "Sending..." : "Send inquiry"}
        </button>
      </form>
    </section>
  );
}

function FaqChat({ faqs, onNeedHelp, property }: { faqs: FaqRecord[]; onNeedHelp: (question: string) => void; property: PropertyRecord }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(initialFaqAnswer);
  const [lastQuestion, setLastQuestion] = useState("");

  function answerQuestion(value: string) {
    const nextAnswer = answerPropertyQuestion(value, property, faqs);
    if (!nextAnswer) {
      return;
    }

    setAnswer(nextAnswer);
    setLastQuestion(value);
    setQuestion("");
  }

  return (
    <section id="faq" className="grid scroll-mt-20 gap-4 rounded-lg border border-neutral-200 bg-white p-5">
      <div>
        <h2 className="text-2xl font-semibold">Questions about this listing</h2>
        <p className="mt-1 text-sm leading-6 text-neutral-600">Answered from listing details and approved FAQ only.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestedFaqQuestions.map((item) => (
          <button key={item} className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 hover:border-[#0d6b63] hover:text-[#084943]" type="button" onClick={() => answerQuestion(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="rounded-md border border-neutral-200 bg-[#f5f7f2] p-3 text-sm leading-6 text-neutral-800">{answer}</div>
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => {
        event.preventDefault();
        answerQuestion(question);
      }}>
        <input
          className="min-h-10 min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#0d6b63] focus:ring-2 focus:ring-[#d9ebe8]"
          placeholder="Ask about rent, availability, floor plan, location..."
          value={question}
          onInput={(event) => setQuestion((event.currentTarget as HTMLInputElement).value)}
        />
        <button className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white" type="submit">
          Ask
        </button>
      </form>
      <button
        className="justify-self-start rounded-md border border-[#c24b32] px-3 py-2 text-sm font-semibold text-[#7c2b1e] hover:bg-[#f8e7e1]"
        type="button"
        onClick={() => onNeedHelp(lastQuestion || question || `I have a question about ${property.title}.`)}
      >
        I still need help
      </button>
      <p className="text-xs leading-5 text-neutral-500">Confirm property details, pricing, and availability with the agency before making a decision.</p>
    </section>
  );
}

function DetailAnchorNav({ hasFloorPlan, hasMap }: { hasFloorPlan: boolean; hasMap: boolean }) {
  const anchors = [
    { href: "#overview", label: "Overview" },
    { href: "#photos", label: "Photos" },
    { href: "#amenities", label: "Amenities" },
    ...(hasMap ? [{ href: "#map", label: "Map" }] : []),
    ...(hasFloorPlan ? [{ href: "#floor-plan", label: "Floor plan" }] : []),
    { href: "#faq", label: "FAQ" },
    { href: "#inquiry", label: "Inquiry" }
  ];

  return (
    <nav className="sticky top-0 z-20 -mx-4 flex gap-2 overflow-x-auto border-y border-neutral-200 bg-white/95 px-4 py-3 text-sm font-semibold backdrop-blur md:-mx-6 md:px-6 lg:static lg:mx-0 lg:border lg:px-3" aria-label="Property sections">
      {anchors.map((anchor) => (
        <a key={anchor.href} className="shrink-0 rounded-full border border-neutral-200 bg-[#f5f7f2] px-3 py-1.5 text-neutral-700 hover:border-[#0d6b63] hover:text-[#084943]" href={anchor.href}>
          {anchor.label}
        </a>
      ))}
    </nav>
  );
}

function ResourceLink({ description, href, label }: { description: string; href: string; label: string }) {
  return (
    <a className="grid gap-1 rounded-md border border-neutral-200 bg-white p-4 text-sm transition hover:border-[#0d6b63] hover:shadow-sm" href={href} rel="noreferrer" target="_blank">
      <span className="font-semibold text-neutral-950">{label}</span>
      <span className="leading-6 text-neutral-600">{description}</span>
      <span className="font-semibold text-[#0d6b63]">Open externally</span>
    </a>
  );
}

function MapPanel({ property }: { property: PropertyRecord }) {
  const embedUrl = googleMapsEmbedUrl(property);
  const mapUrl = externalMapsUrl(property);

  return (
    <section id="map" className="grid scroll-mt-20 gap-4 rounded-lg border border-neutral-200 bg-white p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Location</h2>
          <p className="mt-1 text-sm leading-6 text-neutral-600">{property.addressDisplay || locationText(property, true)}</p>
        </div>
        {mapUrl ? (
          <a className="rounded-md border border-[#0d6b63] px-3 py-2 text-sm font-semibold text-[#084943] hover:bg-[#e4efe3]" href={mapUrl} rel="noreferrer" target="_blank">
            Open in Google Maps
          </a>
        ) : null}
      </div>
      {embedUrl ? (
        <iframe
          className="aspect-[4/3] w-full rounded-md border border-neutral-200"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={embedUrl}
          title={`Map for ${property.title}`}
        />
      ) : (
        <div className="rounded-md border border-dashed border-neutral-300 bg-[#f5f7f2] p-6 text-sm text-neutral-600">
          Public map details are not listed yet. The agency can confirm location details before scheduling.
        </div>
      )}
    </section>
  );
}

function RelatedListings({ current, properties }: { current: PropertyRecord; properties: PropertyRecord[] }) {
  const related = properties
    .filter((property) => property.id !== current.id)
    .filter((property) => property.city === current.city || property.propertyType === current.propertyType)
    .slice(0, 3);

  if (!related.length) {
    return null;
  }

  return (
    <section className="grid gap-3 rounded-lg border border-neutral-200 bg-white p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Related listings</h2>
          <p className="mt-1 text-sm text-neutral-600">Keep comparing without starting over.</p>
        </div>
        <Link className="text-sm font-semibold text-[#0d6b63] hover:text-[#084943]" to="/">
          Back to all listings
        </Link>
      </div>
      <div className="grid gap-3">
        {related.map((property) => (
          <Link key={property.id} className="grid gap-1 rounded-md border border-neutral-200 p-3 text-sm hover:border-[#0d6b63] sm:grid-cols-[1fr_auto] sm:items-center" to={`/property/${property.slug}`}>
            <span>
              <span className="block font-semibold text-neutral-950">{property.title}</span>
              <span className="block text-neutral-600">{locationText(property)} - {propertyTypeLabels[property.propertyType]}</span>
            </span>
            <span className="font-semibold text-neutral-950">
              {formatMoney(property.price, property.currency)}
              {property.transactionMode === "rent" ? " / mo" : ""}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function PropertyDetailPage() {
  const { slug } = useParams<{ slug?: string }>();
  const properties = useQuery<PropertyRecord[]>("listPublishedProperties") ?? [];
  const media = useQuery<PropertyMediaRecord[]>("listPublishedPropertyMedia") ?? [];
  const faqs = useQuery<FaqRecord[]>("listActiveFaqs") ?? defaultFaqs;
  const property = properties.find((item) => item.slug === slug);
  const [inquiryPrefill, setInquiryPrefill] = useState("");

  function sendFaqToInquiry(question: string) {
    const prompt = question.startsWith("I ") ? question : `I still need help with: ${question}`;
    setInquiryPrefill(prompt);
    setTimeout(() => document.getElementById("inquiry")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  if (!property) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-16 md:px-6">
        <h1 className="text-3xl font-semibold">Listing not found.</h1>
        <Link className="mt-4 inline-flex rounded-md bg-[#0d6b63] px-4 py-2 text-sm font-semibold text-white hover:bg-[#084943]" to="/">
          Back to listings
        </Link>
      </section>
    );
  }

  const availability = availabilityMeta(property);
  const amenities = splitMultiValue(property.amenities);
  const mapUrl = externalMapsUrl(property);

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-28 pt-6 md:px-6 lg:pb-10">
      <Link className="text-sm font-semibold text-[#0d6b63] hover:text-[#084943]" to="/">
        Back to listings
      </Link>

      <div id="overview" className="grid scroll-mt-20 gap-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <p className="text-sm font-semibold text-[#0d6b63]">{locationText(property, true)}</p>
            <h1 className="mt-1 text-3xl font-semibold leading-tight md:text-5xl">{property.title}</h1>
            <p className="mt-3 max-w-3xl leading-7 text-neutral-600">{property.description || "The agency has not added a full description yet."}</p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Availability updated</p>
            <p className="mt-1 font-semibold text-neutral-950">{shortDate(property.updatedAt) || "Recently"}</p>
          </div>
        </div>
        <DetailAnchorNav hasFloorPlan={Boolean(property.floorPlanUrl)} hasMap={Boolean(mapUrl || mapsQuery(property))} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_380px] lg:items-start">
        <PropertyGallery media={media} property={property} />
        <aside className="grid content-start gap-5 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm lg:sticky lg:top-5">
          <span className={cx("justify-self-start rounded-full border px-3 py-1.5 text-sm font-semibold", availability.className)}>{availability.label}</span>
          <div>
            <p className="text-3xl font-semibold">
              {formatMoney(property.price, property.currency)}
              {property.transactionMode === "rent" ? <span className="text-base font-medium text-neutral-500"> / mo</span> : null}
            </p>
            <p className="mt-1 text-sm text-neutral-600">{property.addressDisplay || locationText(property)}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              ["Beds", property.bedrooms || "-"],
              ["Baths", property.bathrooms || "-"],
              ["Area", property.areaSize ? `${property.areaSize} ${property.areaUnit}` : "-"],
              ["Type", propertyTypeLabels[property.propertyType] ?? property.propertyType]
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-neutral-200 bg-[#f5f7f2] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">{label}</p>
                <p className="mt-1 font-semibold text-neutral-950">{value}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-2">
            <a className="rounded-md bg-[#c24b32] px-3 py-3 text-center text-sm font-semibold text-white hover:bg-[#9d3724]" href="#inquiry">
              Ask about this listing
            </a>
            {mapUrl ? (
              <a className="rounded-md border border-[#0d6b63] px-3 py-2 text-center text-sm font-semibold text-[#084943] hover:bg-[#e4efe3]" href={mapUrl} rel="noreferrer" target="_blank">
                Open in Google Maps
              </a>
            ) : null}
          </div>
          <p className="text-xs leading-5 text-neutral-500">Agency confirmation is required before applications, payments, or viewing plans.</p>
        </aside>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="grid gap-6">
          <section className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-5">
            <h2 className="text-2xl font-semibold">Costs and availability</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-neutral-200 bg-[#f5f7f2] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">Price</p>
                <p className="mt-1 font-semibold">{formatMoney(property.price, property.currency)}{property.transactionMode === "rent" ? " / mo" : ""}</p>
              </div>
              <div className="rounded-md border border-neutral-200 bg-[#f5f7f2] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">Deposit</p>
                <p className="mt-1 font-semibold">{property.deposit ? formatMoney(property.deposit, property.currency) : "Confirm with agency"}</p>
              </div>
              <div className="rounded-md border border-neutral-200 bg-[#f5f7f2] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">Available from</p>
                <p className="mt-1 font-semibold">{shortDate(property.availableFrom) || property.availabilityText || "Confirm availability"}</p>
              </div>
              <div className="rounded-md border border-neutral-200 bg-[#f5f7f2] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">Fees</p>
                <p className="mt-1 font-semibold">{property.feesText || "Ask agency to confirm"}</p>
              </div>
            </div>
          </section>

          <section id="amenities" className="grid scroll-mt-20 gap-4 rounded-lg border border-neutral-200 bg-white p-5">
            <h2 className="text-2xl font-semibold">Amenities</h2>
            {amenities.length ? (
              <div className="flex flex-wrap gap-2">
                {amenities.map((amenity) => (
                  <span key={amenity} className="rounded-full border border-neutral-200 bg-[#f5f7f2] px-3 py-1 text-sm font-medium text-neutral-700">
                    {amenity}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-neutral-600">Amenities have not been listed publicly yet.</p>
            )}
          </section>

          <MapPanel property={property} />

          {property.youtubeUrl || property.floorPlanUrl ? (
            <section id="floor-plan" className="grid scroll-mt-20 gap-3 rounded-lg border border-neutral-200 bg-white p-5">
              <h2 className="text-2xl font-semibold">Media and documents</h2>
              {property.floorPlanUrl ? (
                <ResourceLink description="Review the public floor plan in a new tab. Confirm measurements with the agency." href={property.floorPlanUrl} label="Floor plan" />
              ) : null}
              {property.youtubeUrl ? (
                <ResourceLink description="Watch the public video tour on YouTube without leaving this listing behind." href={property.youtubeUrl} label="Video tour" />
              ) : null}
            </section>
          ) : null}

          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            Prices, availability, fees, property details, and FAQ answers are informational and should be confirmed directly with the agency.
          </section>

          <RelatedListings current={property} properties={properties} />
        </div>
        <div className="grid content-start gap-6">
          <InquiryForm prefillMessage={inquiryPrefill} property={property} />
          <FaqChat faqs={faqs} onNeedHelp={sendFaqToInquiry} property={property} />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/95 p-3 shadow-2xl backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-neutral-950">{property.title}</p>
            <p className="text-xs text-neutral-600">{formatMoney(property.price, property.currency)}{property.transactionMode === "rent" ? " / mo" : ""}</p>
          </div>
          <a className="rounded-md bg-[#c24b32] px-4 py-3 text-sm font-semibold text-white" href="#inquiry">
            Inquire
          </a>
        </div>
      </div>
    </section>
  );
}

function AdminPage() {
  const auth = useAuth();
  const [tab, setTab] = useState("dashboard");

  if (auth.isLoading) {
    return <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">Checking admin session...</section>;
  }

  if (auth.isGuest) {
    return (
      <section className="mx-auto grid max-w-3xl gap-5 px-4 py-10 md:px-6">
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#0d6b63]">Admin access</p>
          <h1 className="mt-2 text-3xl font-semibold">Sign in with Google to manage listings.</h1>
          <p className="mt-3 leading-7 text-neutral-600">Public browsing and inquiries do not require accounts. Listing management, imports, inquiries, and FAQ maintenance are protected.</p>
          <SignInWithGoogle className="mt-5 rounded-md bg-[#0d6b63] px-4 py-3 text-sm font-semibold text-white hover:bg-[#084943]" />
        </div>
      </section>
    );
  }

  const tabs = [
    ["dashboard", "Dashboard"],
    ["listings", "Listings"],
    ["import", "CSV import"],
    ["inquiries", "Inquiries"],
    ["faq", "FAQ"]
  ];

  return (
    <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 md:px-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#0d6b63]">Agency admin</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-5xl">Manage listings, leads, and FAQ content</h1>
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map(([id, label]) => (
          <button key={id} className={cx("rounded-md border px-3 py-2 text-sm font-semibold", tab === id ? "border-[#0d6b63] bg-[#0d6b63] text-white" : "border-neutral-300 bg-white text-neutral-800 hover:border-[#0d6b63]")} type="button" onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "dashboard" ? <AdminDashboard onOpenTab={setTab} /> : null}
      {tab === "listings" ? <AdminListings /> : null}
      {tab === "import" ? <CsvImportPanel /> : null}
      {tab === "inquiries" ? <InquiryInbox /> : null}
      {tab === "faq" ? <FaqAdmin /> : null}
    </section>
  );
}

function AdminDashboard({ onOpenTab }: { onOpenTab: (tab: string) => void }) {
  const dashboard = useQuery<DashboardData>("adminDashboard");
  const properties = useQuery<PropertyRecord[]>("adminListProperties") ?? [];
  const inquiries = useQuery<InquiryRecord[]>("adminListInquiries") ?? [];
  const imports = useQuery<CsvImportRecord[]>("adminListImports") ?? [];
  const seedDemoData = useMutation<[], MutationResult<{ properties: number; faqs: number }>>("adminSeedDemoData");
  const [result, setResult] = useState<MutationResult | null>(null);
  const newInquiries = inquiries.filter((inquiry) => inquiry.status === "new");
  const publishBlocked = properties.filter((property) => property.status !== "archived" && propertyQualityIssues({ ...property, status: "published" }, "published").length);
  const stalePublished = properties.filter((property) => property.status === "published" && isStale(property.updatedAt, 21));
  const importErrors = imports.filter((item) => Number(item.errorCount || 0) > 0).slice(0, 3);

  return (
    <section className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {listingStatuses.map((status) => (
          <button key={status} className="rounded-lg border border-neutral-200 bg-white p-4 text-left transition hover:border-[#0d6b63] hover:shadow-sm" type="button" onClick={() => onOpenTab("listings")}>
            <p className="text-sm font-medium text-neutral-500">{statusLabels[status]}</p>
            <p className="mt-2 text-3xl font-semibold">{dashboard?.counts?.[status] ?? 0}</p>
          </button>
        ))}
      </div>

      <section className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#c24b32]">Today's work</p>
            <h2 className="mt-1 text-2xl font-semibold">Attention queue</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-md bg-[#0d6b63] px-3 py-2 text-sm font-semibold text-white" type="button" onClick={() => onOpenTab("listings")}>
              Create listing
            </button>
            <button className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-800" type="button" onClick={() => onOpenTab("import")}>
              Import CSV
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <button className="rounded-md border border-[#c24b32]/30 bg-[#f8e7e1] p-4 text-left" type="button" onClick={() => onOpenTab("inquiries")}>
            <p className="text-sm font-semibold text-[#7c2b1e]">New inquiries</p>
            <p className="mt-2 text-3xl font-semibold">{newInquiries.length}</p>
          </button>
          <button className="rounded-md border border-[#b9862e]/30 bg-[#fff7e6] p-4 text-left" type="button" onClick={() => onOpenTab("listings")}>
            <p className="text-sm font-semibold text-[#765016]">Publish blockers</p>
            <p className="mt-2 text-3xl font-semibold">{publishBlocked.length}</p>
          </button>
          <button className="rounded-md border border-neutral-200 bg-[#f5f7f2] p-4 text-left" type="button" onClick={() => onOpenTab("listings")}>
            <p className="text-sm font-semibold text-neutral-700">Stale availability</p>
            <p className="mt-2 text-3xl font-semibold">{stalePublished.length}</p>
          </button>
          <button className="rounded-md border border-neutral-200 bg-[#f5f7f2] p-4 text-left" type="button" onClick={() => onOpenTab("import")}>
            <p className="text-sm font-semibold text-neutral-700">Imports with errors</p>
            <p className="mt-2 text-3xl font-semibold">{importErrors.length}</p>
          </button>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Lead response status</h2>
            <button className="text-sm font-semibold text-[#0d6b63]" type="button" onClick={() => onOpenTab("inquiries")}>
              Open inbox
            </button>
          </div>
          <div className="mt-4 grid gap-3">
            {inquiries.length ? (
              inquiries.slice(0, 5).map((inquiry) => (
                <div key={inquiry.id} className="rounded-md border border-neutral-200 p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{inquiry.name}</p>
                    <StatusPill status={inquiry.status} />
                  </div>
                  <p className="mt-1 text-neutral-600">{inquiry.propertyTitle}</p>
                  <p className="mt-1 text-xs font-semibold text-neutral-500">Received {relativeAge(inquiry.createdAt)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-neutral-500">No inquiries yet.</p>
            )}
          </div>
        </section>
        <section className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="text-xl font-semibold">Import and demo data</h2>
          <p className="text-sm leading-6 text-neutral-600">
            Seed demo content for a complete public walkthrough, or use CSV import for agency inventory. Latest import: {dashboard?.latestImport ? `${dashboard.latestImport.status} with ${dashboard.latestImport.errorCount} errors` : "none"}.
          </p>
          <ResultMessage result={result} />
          <button className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white" type="button" onClick={async () => setResult(await seedDemoData())}>
            Seed demo listings and FAQ
          </button>
        </section>
      </div>
    </section>
  );
}

function MissingFields({ property }: { property: PropertyInput }) {
  const issues = propertyQualityIssues(property, (property.status as ListingStatus) || "draft");
  if (!issues.length) {
    return <span className="text-sm text-emerald-700">Ready for selected status.</span>;
  }

  return (
    <ul className="grid gap-1 text-sm text-rose-700">
      {issues.map((issue) => (
        <li key={issue}>{issue}</li>
      ))}
    </ul>
  );
}

function AdminListings() {
  const properties = useQuery<PropertyRecord[]>("adminListProperties") ?? [];
  const media = useQuery<PropertyMediaRecord[]>("adminListPropertyMedia") ?? [];
  const createProperty = useMutation<[input: PropertyInput], MutationResult<{ id: string }>>("adminCreateProperty");
  const updateProperty = useMutation<[id: string, input: PropertyInput], MutationResult<{ id: string }>>("adminUpdateProperty");
  const updateStatus = useMutation<[id: string, status: ListingStatus], MutationResult<{ id: string }>>("adminUpdatePropertyStatus");
  const archiveProperty = useMutation<[id: string], MutationResult<{ id: string }>>("adminDeleteOrArchiveProperty");
  const upsertMedia = useMutation<[propertyId: string, photoText: string], MutationResult<{ count: number }>>("adminUpsertPropertyMedia");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState<PropertyInput>(emptyProperty);
  const [photoText, setPhotoText] = useState("");
  const [result, setResult] = useState<MutationResult | null>(null);
  const editing = properties.find((property) => property.id === editingId);

  const statusFilters = [
    { label: "Needs attention", value: "needs" },
    { label: "Active", value: "active" },
    { label: "Published", value: "published" },
    { label: "Draft", value: "draft" },
    { label: "Hidden", value: "hidden" },
    { label: "Archived", value: "archived" }
  ];
  const filtered =
    status === "needs"
      ? filterAdminListings(properties, { search, status: "active" }).filter((property) => propertyQualityIssues({ ...property, status: "published" }, "published").length)
      : filterAdminListings(properties, { search, status });

  function startEdit(property: PropertyRecord) {
    setEditingId(property.id);
    setForm(property);
    setPhotoText(
      media
        .filter((item) => item.propertyId === property.id && item.type === "photo" && item.url !== property.primaryImageUrl)
        .map((item) => `${item.url}|${item.altText}|${item.caption}`)
        .join("\n")
    );
    setResult(null);
  }

  function startCreate() {
    setEditingId("");
    setForm(emptyProperty);
    setPhotoText("");
    setResult(null);
  }

  function setField(field: keyof PropertyInput, value: string) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "title" && !cleanText(current.slug)) {
        next.slug = slugify(value);
      }
      return next;
    });
  }

  async function save(nextStatus?: ListingStatus) {
    const input = normalizePropertyInput({ ...form, status: nextStatus ?? form.status }, "client-preview");
    const response = editing ? await updateProperty(editing.id, input) : await createProperty(input);
    setResult(response);
    if (response.ok && response.data?.id) {
      setForm(input);
      await upsertMedia(response.data.id, photoText);
      setEditingId(response.data.id);
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="grid content-start gap-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="grid gap-3">
            <Field label="Search listings" name="adminSearch" value={search} onInput={setSearch} />
            <div className="flex flex-wrap gap-2" aria-label="Listing status filters">
              {statusFilters.map((item) => (
                <button
                  key={item.value}
                  className={cx("rounded-md border px-3 py-2 text-sm font-semibold", status === item.value ? "border-[#0d6b63] bg-[#0d6b63] text-white" : "border-neutral-300 bg-white text-neutral-800 hover:border-[#0d6b63]")}
                  type="button"
                  onClick={() => setStatus(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <button className="mt-3 rounded-md bg-[#0d6b63] px-3 py-2 text-sm font-semibold text-white hover:bg-[#084943]" type="button" onClick={startCreate}>
            Create listing
          </button>
        </div>
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <div className="hidden grid-cols-[1.4fr_0.7fr_0.8fr_0.7fr] gap-3 border-b border-neutral-200 bg-[#f5f7f2] px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500 md:grid">
            <span>Listing</span>
            <span>Status</span>
            <span>Readiness</span>
            <span>Actions</span>
          </div>
          {filtered.map((property) => {
            const issues = propertyQualityIssues({ ...property, status: "published" }, "published");
            return (
              <article key={property.id} className="grid gap-3 border-b border-neutral-200 p-4 last:border-b-0 md:grid-cols-[1.4fr_0.7fr_0.8fr_0.7fr] md:items-center">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">{property.title || "Untitled listing"}</h2>
                  <p className="mt-1 text-sm text-neutral-600">
                    {formatMoney(property.price, property.currency)} - {locationText(property)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-neutral-500">Updated {relativeAge(property.updatedAt)}</p>
                </div>
                <StatusPill status={property.status} />
                <div className="text-sm">
                  {issues.length ? (
                    <span className="rounded-full border border-[#c24b32]/30 bg-[#f8e7e1] px-2.5 py-1 text-xs font-semibold text-[#7c2b1e]">
                      {issues.length} blocker{issues.length === 1 ? "" : "s"}
                    </span>
                  ) : (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">Ready</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold hover:border-[#0d6b63]" type="button" onClick={() => startEdit(property)}>
                    Edit
                  </button>
                  <button className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold hover:border-[#b9862e]" type="button" onClick={async () => {
                    if (confirm(`Hide ${property.title || "this listing"}?`)) {
                      setResult(await updateStatus(property.id, "hidden"));
                    }
                  }}>
                    Hide
                  </button>
                  <button className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold hover:border-[#c24b32]" type="button" onClick={async () => {
                    if (confirm(`Archive ${property.title || "this listing"}?`)) {
                      setResult(await archiveProperty(property.id));
                    }
                  }}>
                    Archive
                  </button>
                </div>
              </article>
            );
          })}
          {!filtered.length ? <div className="p-8 text-center text-sm text-neutral-500">No admin listings match.</div> : null}
        </div>
      </div>

      <form className="grid gap-5 rounded-lg border border-neutral-200 bg-white p-5" onSubmit={(event) => event.preventDefault()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">{editing ? `Edit ${editing.title}` : "Create listing"}</h2>
            <p className="mt-1 text-sm text-neutral-600">Drafts can be incomplete. Published listings must pass the checklist.</p>
          </div>
          <StatusPill status={(form.status as ListingStatus) || "draft"} />
        </div>
        <ResultMessage result={result} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title" name="title" value={cleanText(form.title)} onInput={(value) => setField("title", value)} />
          <Field label="Slug" name="slug" value={cleanText(form.slug)} onInput={(value) => setField("slug", value)} />
          <SelectField label="Mode" name="transactionMode" value={cleanText(form.transactionMode || "rent")} options={transactionModes.map((item) => ({ label: transactionModeLabels[item], value: item }))} onInput={(value) => setField("transactionMode", value)} />
          <SelectField label="Property type" name="propertyType" value={cleanText(form.propertyType || "apartment")} options={propertyTypes.map((item) => ({ label: propertyTypeLabels[item], value: item }))} onInput={(value) => setField("propertyType", value)} />
          <SelectField label="Status" name="status" value={cleanText(form.status || "draft")} options={listingStatuses.map((item) => ({ label: statusLabels[item], value: item }))} onInput={(value) => setField("status", value)} />
          <Field label="Primary image URL" name="primaryImageUrl" value={cleanText(form.primaryImageUrl)} onInput={(value) => setField("primaryImageUrl", value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Price/rent" name="price" type="number" value={cleanText(form.price)} onInput={(value) => setField("price", value)} />
          <Field label="Currency" name="currency" value={cleanText(form.currency || "USD")} onInput={(value) => setField("currency", value)} />
          <Field label="Deposit" name="deposit" value={cleanText(form.deposit)} onInput={(value) => setField("deposit", value)} />
          <Field label="Bedrooms" name="bedrooms" value={cleanText(form.bedrooms)} onInput={(value) => setField("bedrooms", value)} />
          <Field label="Bathrooms" name="bathrooms" value={cleanText(form.bathrooms)} onInput={(value) => setField("bathrooms", value)} />
          <Field label="Area" name="areaSize" value={cleanText(form.areaSize)} onInput={(value) => setField("areaSize", value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Address display" name="addressDisplay" value={cleanText(form.addressDisplay)} onInput={(value) => setField("addressDisplay", value)} />
          <Field label="City" name="city" value={cleanText(form.city)} onInput={(value) => setField("city", value)} />
          <Field label="District" name="district" value={cleanText(form.district)} onInput={(value) => setField("district", value)} />
          <Field label="Province/state" name="provinceOrState" value={cleanText(form.provinceOrState)} onInput={(value) => setField("provinceOrState", value)} />
          <Field label="Country" name="country" value={cleanText(form.country || "United States")} onInput={(value) => setField("country", value)} />
          <Field label="Google Maps URL" name="googleMapsUrl" value={cleanText(form.googleMapsUrl)} onInput={(value) => setField("googleMapsUrl", value)} />
          <Field label="Availability text" name="availabilityText" value={cleanText(form.availabilityText)} onInput={(value) => setField("availabilityText", value)} />
          <Field label="Available from" name="availableFrom" type="date" value={cleanText(form.availableFrom)} onInput={(value) => setField("availableFrom", value)} />
        </div>
        <TextAreaField label="Description" name="description" value={cleanLongText(form.description)} rows={5} onInput={(value) => setField("description", value)} />
        <TextAreaField label="Amenities" name="amenities" hint="Separate amenities with commas, pipes, or new lines." value={cleanLongText(form.amenities)} rows={3} onInput={(value) => setField("amenities", value)} />
        <TextAreaField label="Additional photo URLs" name="photoText" hint="One per line. Optional format: URL | alt text | caption." value={photoText} rows={4} onInput={setPhotoText} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Floor plan URL" name="floorPlanUrl" value={cleanText(form.floorPlanUrl)} onInput={(value) => setField("floorPlanUrl", value)} />
          <Field label="YouTube URL" name="youtubeUrl" value={cleanText(form.youtubeUrl)} onInput={(value) => setField("youtubeUrl", value)} />
        </div>
        <div className="rounded-md border border-neutral-200 bg-[#f5f7f2] p-4">
          <h3 className="font-semibold">Publishing checklist</h3>
          <div className="mt-2">
            <MissingFields property={form} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold" type="button" onClick={() => void save("draft")}>
            Save draft
          </button>
          <button className="rounded-md bg-[#0d6b63] px-4 py-2 text-sm font-semibold text-white hover:bg-[#084943]" type="button" onClick={() => void save("published")}>
            Publish
          </button>
          <button className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold" type="button" onClick={() => void save("hidden")}>
            Hide
          </button>
          <button className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold" type="button" onClick={() => void save("archived")}>
            Archive
          </button>
        </div>
      </form>
    </section>
  );
}

function CsvImportPanel() {
  const imports = useQuery<CsvImportRecord[]>("adminListImports") ?? [];
  const importCsv = useMutation<[csvText: string, mode: "create" | "update" | "upsert", filename: string], MutationResult<{ created: number; updated: number; skipped: number; errors: string[] }>>("adminImportPropertiesFromCsv");
  const [csvText, setCsvText] = useState(csvTemplate);
  const [mode, setMode] = useState<"create" | "update" | "upsert">("upsert");
  const [filename, setFilename] = useState("agency-listings.csv");
  const [result, setResult] = useState<MutationResult | null>(null);
  const parsed = useMemo(() => parseCsvText(csvText), [csvText]);

  return (
    <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="text-2xl font-semibold">CSV import</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Filename" name="filename" value={filename} onInput={setFilename} />
          <SelectField
            label="Import mode"
            name="importMode"
            value={mode}
            options={[
              { label: "Create and update by slug", value: "upsert" },
              { label: "Create new only", value: "create" },
              { label: "Update existing only", value: "update" }
            ]}
            onInput={(value) => setMode(value as "create" | "update" | "upsert")}
          />
        </div>
        <TextAreaField label="CSV text" name="csv" rows={14} value={csvText} onInput={setCsvText} />
        <ResultMessage result={result} />
        {result?.data ? (
          <p className="text-sm text-neutral-700">
            Created {result.data.created}, updated {result.data.updated}, skipped {result.data.skipped}, errors {result.data.errors.length}.
          </p>
        ) : null}
        <button className="rounded-md bg-[#0d6b63] px-4 py-3 text-sm font-semibold text-white hover:bg-[#084943]" type="button" onClick={async () => setResult(await importCsv(csvText, mode, filename))}>
          Import valid rows
        </button>
      </div>

      <div className="grid content-start gap-4">
        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <h3 className="text-xl font-semibold">Preview</h3>
          <p className="mt-2 text-sm text-neutral-600">{parsed.rows.length} rows, {parsed.headers.length} columns.</p>
          {parsed.errors.length ? (
            <ul className="mt-3 grid gap-1 text-sm text-rose-700">
              {parsed.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-4 max-h-[420px] overflow-auto rounded-md border border-neutral-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f5f7f2]">
                <tr>
                  {parsed.headers.slice(0, 6).map((header) => (
                    <th key={header} className="px-3 py-2 font-semibold">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.rows.slice(0, 8).map((row, index) => (
                  <tr key={index} className="border-t border-neutral-200">
                    {parsed.headers.slice(0, 6).map((header) => (
                      <td key={header} className="px-3 py-2 text-neutral-700">
                        {row[header]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <h3 className="text-xl font-semibold">Recent imports</h3>
          <div className="mt-4 grid gap-3">
            {imports.length ? (
              imports.map((item) => (
                <div key={item.id} className="rounded-md border border-neutral-200 p-3 text-sm">
                  <p className="font-semibold">{item.filename}</p>
                  <p className="mt-1 text-neutral-600">{item.status}: {item.validCount} valid, {item.errorCount} errors</p>
                  {item.errors ? <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded-md bg-[#f5f7f2] p-2 text-xs text-rose-800">{item.errors}</pre> : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-neutral-500">No imports yet.</p>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

function InquiryInbox() {
  const inquiries = useQuery<InquiryRecord[]>("adminListInquiries") ?? [];
  const updateInquiry = useMutation<[id: string, patch: { status?: LeadStatus; adminNotes?: string }], MutationResult<{ id: string }>>("adminUpdateInquiry");
  const [result, setResult] = useState<MutationResult | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  return (
    <section className="grid gap-4">
      <ResultMessage result={result} />
      {inquiries.length ? (
        inquiries.map((inquiry) => (
          <article key={inquiry.id} className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{inquiry.name}</h2>
                <p className="mt-1 text-sm text-neutral-600">{inquiry.propertyTitle} - {new Date(inquiry.createdAt).toLocaleString()}</p>
              </div>
              <StatusPill status={inquiry.status} />
            </div>
            <div className="grid gap-2 text-sm text-neutral-700 md:grid-cols-3">
              <p>Email: {inquiry.email || "Not provided"}</p>
              <p>Phone: {inquiry.phone || "Not provided"}</p>
              <p>Prefers: {inquiry.preferredContactMethod}</p>
              <p>Timeline: {inquiry.moveInTimeline || "Not provided"}</p>
              <p>Budget: {inquiry.budget || "Not provided"}</p>
              <p>Source: {inquiry.sourcePage}</p>
            </div>
            <p className="rounded-md border border-neutral-200 bg-[#f5f7f2] p-3 text-sm leading-6">{inquiry.message}</p>
            <div className="grid gap-3 md:grid-cols-[220px_1fr_auto] md:items-end">
              <SelectField label="Lead status" name={`lead-${inquiry.id}`} value={inquiry.status} options={leadStatuses.map((status) => ({ label: leadStatusLabels[status], value: status }))} onInput={async (value) => setResult(await updateInquiry(inquiry.id, { status: value as LeadStatus, adminNotes: notes[inquiry.id] ?? inquiry.adminNotes }))} />
              <TextAreaField label="Admin notes" name={`notes-${inquiry.id}`} rows={2} value={notes[inquiry.id] ?? inquiry.adminNotes} onInput={(value) => setNotes((current) => ({ ...current, [inquiry.id]: value }))} />
              <button className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white" type="button" onClick={async () => setResult(await updateInquiry(inquiry.id, { status: inquiry.status, adminNotes: notes[inquiry.id] ?? inquiry.adminNotes }))}>
                Save notes
              </button>
            </div>
          </article>
        ))
      ) : (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">No inquiries yet.</div>
      )}
    </section>
  );
}

function FaqAdmin() {
  const faqs = useQuery<FaqRecord[]>("adminListFaqs") ?? [];
  const createFaq = useMutation<[input: { question: string; answer: string; keywords: string; active: boolean; sortOrder: string }], MutationResult<{ id: string }>>("adminCreateFaq");
  const updateFaq = useMutation<[id: string, input: { question: string; answer: string; keywords: string; active: boolean; sortOrder: string }], MutationResult<{ id: string }>>("adminUpdateFaq");
  const [form, setForm] = useState({ question: "", answer: "", keywords: "", active: true, sortOrder: "10" });
  const [editing, setEditing] = useState("");
  const [result, setResult] = useState<MutationResult | null>(null);
  const setField = (field: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [field]: value }));

  async function save() {
    const response = editing ? await updateFaq(editing, form) : await createFaq(form);
    setResult(response);
    if (response.ok) {
      setEditing("");
      setForm({ question: "", answer: "", keywords: "", active: true, sortOrder: "10" });
    }
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="grid content-start gap-4 rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="text-2xl font-semibold">{editing ? "Edit FAQ" : "Create FAQ"}</h2>
        <ResultMessage result={result} />
        <Field label="Question" name="faqQuestion" value={form.question} onInput={(value) => setField("question", value)} />
        <TextAreaField label="Approved answer" name="faqAnswer" rows={4} value={form.answer} onInput={(value) => setField("answer", value)} />
        <Field label="Keywords" name="faqKeywords" hint="Separate with commas or pipes." value={form.keywords} onInput={(value) => setField("keywords", value)} />
        <Field label="Sort order" name="sortOrder" value={form.sortOrder} onInput={(value) => setField("sortOrder", value)} />
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input checked={form.active} className="h-4 w-4 accent-[#0d6b63]" type="checkbox" onChange={(event) => setField("active", (event.currentTarget as HTMLInputElement).checked)} />
          Active publicly
        </label>
        <div className="flex gap-2">
          <button className="rounded-md bg-[#0d6b63] px-4 py-2 text-sm font-semibold text-white hover:bg-[#084943]" type="button" onClick={() => void save()}>
            Save FAQ
          </button>
          {editing ? (
            <button className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold" type="button" onClick={() => {
              setEditing("");
              setForm({ question: "", answer: "", keywords: "", active: true, sortOrder: "10" });
            }}>
              Cancel
            </button>
          ) : null}
        </div>
      </div>
      <div className="grid content-start gap-3">
        {faqs.length ? (
          faqs.map((faq) => (
            <article key={faq.id} className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{faq.question}</h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">{faq.answer}</p>
                  <p className="mt-2 text-xs text-neutral-500">Keywords: {faq.keywords || "none"}</p>
                </div>
                <span className={cx("rounded-full border px-2 py-1 text-xs font-semibold", faq.active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-neutral-300 bg-neutral-100 text-neutral-700")}>{faq.active ? "Active" : "Inactive"}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <button className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold" type="button" onClick={() => {
                  setEditing(faq.id);
                  setForm({ question: faq.question, answer: faq.answer, keywords: faq.keywords, active: faq.active, sortOrder: faq.sortOrder });
                }}>
                  Edit
                </button>
                <button className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold" type="button" onClick={async () => setResult(await updateFaq(faq.id, { ...faq, active: !faq.active }))}>
                  {faq.active ? "Deactivate" : "Activate"}
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">No FAQ records yet. Public pages use demo FAQ content until admin records exist.</div>
        )}
      </div>
    </section>
  );
}

export function App() {
  return (
    <Router>
      <Shell />
    </Router>
  );
}
