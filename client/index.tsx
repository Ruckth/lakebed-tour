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

const focusRing = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766d]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white";
const buttonBase = `inline-flex min-h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-60 ${focusRing}`;
const primaryButton = `${buttonBase} bg-[#0f766d] text-white hover:bg-[#0b5e56]`;
const ctaButton = `${buttonBase} bg-[#b85239] text-white hover:bg-[#963f2b]`;
const darkButton = `${buttonBase} bg-[#17211f] text-white hover:bg-neutral-950`;
const secondaryButton = `${buttonBase} bg-white text-neutral-800 ring-1 ring-inset ring-neutral-200 hover:bg-neutral-50 hover:ring-neutral-300`;
const quietButton = `${buttonBase} bg-transparent text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950`;
const textLink = `font-semibold text-[#0f766d] underline-offset-4 hover:text-[#084943] hover:underline ${focusRing}`;
const fieldClass = `min-h-11 rounded-md border bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-neutral-400 ${focusRing}`;
const surfaceClass = "rounded-lg bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)]";
const mutedPanelClass = "rounded-md bg-neutral-50 p-3";
const agencyPhoneNumber = "+15125550119";
const agencyPhoneDisplay = "(512) 555-0119";

function underlineTabClass(active: boolean, extra?: string): string {
  return cx(
    "relative shrink-0 border-b-2 px-1 pb-2 pt-1 text-sm font-semibold transition",
    active ? "border-[#0f766d] text-[#0f766d]" : "border-transparent text-neutral-500 hover:text-neutral-950",
    focusRing,
    extra
  );
}

function ResultMessage({ result }: { result: MutationResult | null }) {
  if (!result) {
    return null;
  }

  return (
    <div
      className={cx(
        "rounded-md px-3 py-2 text-sm ring-1 ring-inset",
        result.ok ? "bg-emerald-50 text-emerald-900 ring-emerald-200" : "bg-rose-50 text-rose-900 ring-rose-200"
      )}
    >
      {result.ok ? "Saved." : result.error || result.errors?.join(" ")}
    </div>
  );
}

function StatusPill({ status }: { status: ListingStatus | LeadStatus }) {
  const color = status === "published" || status === "contacted" || status === "viewing_scheduled"
    ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
    : status === "hidden" || status === "ignored"
      ? "bg-amber-50 text-amber-800 ring-amber-200"
      : status === "archived" || status === "closed"
        ? "bg-neutral-100 text-neutral-700 ring-neutral-200"
        : "bg-[#eef8fa] text-[#084943] ring-[#dceef3]";
  const label = (statusLabels as Record<string, string>)[status] || (leadStatusLabels as Record<string, string>)[status] || status;

  return <span className={cx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", color)}>{label}</span>;
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
    <label className="grid gap-1.5 text-sm font-semibold text-neutral-800" htmlFor={inputId}>
      <span>{label}</span>
      <input
        aria-describedby={hint || error ? helpId : undefined}
        aria-invalid={Boolean(error)}
        className={cx(
          fieldClass,
          error
            ? "border-rose-300"
            : "border-neutral-200 hover:border-neutral-300 focus:border-[#0f766d]"
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
    <label className="grid gap-1.5 text-sm font-semibold text-neutral-800" htmlFor={inputId}>
      <span>{label}</span>
      <textarea
        aria-describedby={hint || error ? helpId : undefined}
        aria-invalid={Boolean(error)}
        className={cx(
          fieldClass,
          "leading-6",
          error
            ? "border-rose-300"
            : "border-neutral-200 hover:border-neutral-300 focus:border-[#0f766d]"
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
    <label className="grid gap-1.5 text-sm font-semibold text-neutral-800" htmlFor={inputId}>
      <span>{label}</span>
      <select
        className={cx(fieldClass, "border-neutral-200 hover:border-neutral-300 focus:border-[#0f766d]")}
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
    return { label: "Available now", className: "bg-emerald-50 text-emerald-800 ring-emerald-200" };
  }

  if (hasKnownDate && property.availableFrom) {
    return { label: `Available ${shortDate(property.availableFrom)}`, className: "bg-[#fff7e6] text-[#765016] ring-[#b9862e]/30" };
  }

  if (text.includes("limited") || text.includes("soon")) {
    return { label: cleanText(property.availabilityText, 60), className: "bg-[#f8e7e1] text-[#7c2b1e] ring-[#c24b32]/30" };
  }

  return {
    label: property.availabilityText || "Confirm availability",
    className: "bg-white text-neutral-700 ring-neutral-200"
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

function listingContactTemplate(property: PropertyRecord): string {
  return `Hi, I am interested in ${property.title}. I would like to confirm availability, fees, and viewing options. My preferred viewing time is [day/time]. My move-in timeline is [timeline].`;
}

function smoothScrollToHash(event: MouseEvent, href: string) {
  const target = document.getElementById(href.replace(/^#/, ""));
  if (!target) {
    return;
  }

  event.preventDefault();
  history.pushState(null, "", href);
  target.scrollIntoView({ behavior: "smooth", block: "start" });
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

function isDeskHash(hash: string): boolean {
  return hash === "#desk" || hash === "#admin";
}

function NavItem({ children, to }: { children: string; to: string }) {
  const current = typeof window === "undefined" ? "/" : window.location.pathname;
  const hash = typeof window === "undefined" ? "" : window.location.hash;
  const active = to === "/" ? current === "/" && !isDeskHash(hash) : current.startsWith(to);

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={underlineTabClass(active, "px-0")}
      to={to}
    >
      {children}
    </Link>
  );
}

function DeskNavItem() {
  const active = typeof window !== "undefined" && isDeskHash(window.location.hash);

  return (
    <a aria-current={active ? "page" : undefined} className={underlineTabClass(active, "px-0")} href="/#desk">
      Admin
    </a>
  );
}

function AuthBadge() {
  const auth = useAuth();
  const label = auth.displayName || "Guest";

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg bg-neutral-50 px-3 py-2">
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
        <button className={cx(secondaryButton, "min-h-8 px-2.5 py-1.5 text-xs")} type="button" onClick={() => signOut()}>
          Sign out
        </button>
      ) : null}
    </div>
  );
}

function Shell() {
  const [hash, setHash] = useState(() => (typeof window === "undefined" ? "" : window.location.hash));
  const [menuOpen, setMenuOpen] = useState(false);
  const showDesk = isDeskHash(hash);

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  return (
    <main className="min-h-screen bg-neutral-50 text-[#17211f]">
      <header className="bg-white/95 shadow-sm shadow-neutral-200/70">
        <div className="mx-auto flex max-w-7xl items-start justify-between gap-4 px-4 py-4 md:items-center md:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0d6b63]">Rental agency workspace</p>
            <Link className={cx("mt-1 block text-2xl font-semibold tracking-normal text-neutral-950 md:text-4xl", focusRing)} to="/">
              OpenHouse Desk
            </Link>
            <p className="mt-2 hidden max-w-2xl text-sm leading-6 text-neutral-600 sm:block">
              Public listings for renters, plus the protected desk that keeps inventory and leads moving.
            </p>
          </div>
          <div className="hidden items-center gap-6 md:flex">
            <nav className="flex gap-6 text-sm font-semibold text-neutral-700">
              <NavItem to="/">Listings</NavItem>
              <DeskNavItem />
            </nav>
            <AuthBadge />
          </div>
          <button
            className={cx("inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-neutral-50 ring-1 ring-inset ring-neutral-200 md:hidden", focusRing)}
            type="button"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="grid gap-1" aria-hidden="true">
              <span className={cx("block h-0.5 w-5 rounded-full bg-neutral-900 transition", menuOpen ? "translate-y-1.5 rotate-45" : "")} />
              <span className={cx("block h-0.5 w-5 rounded-full bg-neutral-900 transition", menuOpen ? "opacity-0" : "")} />
              <span className={cx("block h-0.5 w-5 rounded-full bg-neutral-900 transition", menuOpen ? "-translate-y-1.5 -rotate-45" : "")} />
            </span>
          </button>
        </div>
        {menuOpen ? (
          <div className="border-t border-neutral-100 px-4 py-3 md:hidden">
            <div className="mx-auto grid max-w-7xl gap-3">
              <nav className="flex gap-6 text-sm font-semibold text-neutral-700" onClick={() => setMenuOpen(false)}>
                <NavItem to="/">Listings</NavItem>
                <DeskNavItem />
              </nav>
              <AuthBadge />
            </div>
          </div>
        ) : null}
      </header>

      {showDesk ? (
        <AdminPage />
      ) : (
        <Routes>
          <Route path="/" element={<ListingsPage />} />
          <Route path="/property/:slug" element={<PropertyDetailPage />} />
          <Route path="/desk" element={<AdminPage />} />
          <Route
            path="*"
            element={
              <section className="mx-auto max-w-4xl px-4 py-16 md:px-6">
                <h1 className="text-3xl font-semibold">That page is not listed.</h1>
                <Link className={cx(primaryButton, "mt-4")} to="/">
                  Back to listings
                </Link>
              </section>
            }
          />
        </Routes>
      )}
    </main>
  );
}

function ListingSkeleton() {
  return (
    <article className="grid gap-3" aria-label="Loading listings">
      <div className="aspect-[4/3] animate-pulse rounded-lg bg-neutral-200" />
      <div className="grid gap-3 px-1">
        <div className="h-4 w-32 rounded bg-neutral-200" />
        <div className="h-7 w-4/5 rounded bg-neutral-200" />
        <div className="h-5 w-40 rounded bg-neutral-200" />
        <div className="h-4 w-3/5 rounded bg-neutral-100" />
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
    <article className="group grid overflow-hidden rounded-lg bg-white shadow-sm shadow-neutral-200/80 ring-1 ring-inset ring-neutral-200 transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-neutral-200/80 hover:ring-neutral-300">
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-200">
        {property.primaryImageUrl ? (
          <img alt={`${property.title} primary photo`} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" src={property.primaryImageUrl} />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#dceef3] px-4 text-center text-sm font-semibold text-[#084943]">
            Image coming soon
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#17211f]/55 to-transparent" />
        <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-2">
          <span className={cx("rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ring-1 ring-inset", availability.className)}>
            {availability.label}
          </span>
            {property.floorPlanUrl ? <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-neutral-800 shadow-sm ring-1 ring-inset ring-white/70">Floor plan</span> : null}
          {property.youtubeUrl ? <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-neutral-800 shadow-sm ring-1 ring-inset ring-white/70">Tour</span> : null}
        </div>
        <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1.5 text-sm font-semibold text-neutral-950 shadow-sm ring-1 ring-inset ring-white/70">
          {formatMoney(property.price, property.currency)}
          {property.transactionMode === "rent" ? <span className="font-medium text-neutral-500"> / mo</span> : null}
        </span>
        <span className="absolute bottom-3 right-3 rounded-full bg-[#17211f]/85 px-2.5 py-1 text-xs font-semibold text-white">
          {photoCount} photo{photoCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="grid gap-3 p-4">
        <div className="grid gap-1.5">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 text-sm font-semibold text-[#0f766d]">{locationText(property)}</p>
            <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">
              {propertyTypeLabels[property.propertyType] ?? property.propertyType}
            </span>
          </div>
          <h2 className="text-xl font-semibold leading-tight text-neutral-950">{property.title}</h2>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-700">
          {specs.map((spec) => (
            <p key={spec.label}>
              <span className="font-semibold text-neutral-950">{spec.value}</span> {spec.label}
            </p>
          ))}
        </div>

        <div className="grid gap-1 text-sm leading-6 text-neutral-600">
          <p>{property.deposit ? `Deposit ${formatMoney(property.deposit, property.currency)}.` : "Move-in costs should be confirmed with the agency."}</p>
          {property.feesText ? <p>{property.feesText}</p> : null}
        </div>

        {amenities.length ? (
          <div className="flex flex-wrap gap-2">
            {amenities.map((amenity) => (
              <span key={amenity} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 ring-1 ring-inset ring-neutral-200">
                {amenity}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Link className={cx(primaryButton, "min-h-9 px-3 py-1.5")} to={`/property/${property.slug}`}>
            View details
          </Link>
          <Link className={cx(secondaryButton, "min-h-9 px-3 py-1.5 hover:text-[#7c2b1e]")} to={`/property/${property.slug}#inquiry`}>
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
    setType("all");
    setMinPrice("");
    setMaxPrice("");
    setBeds("any");
    setBaths("any");
    setSort("newest");
    setDensity("comfortable");
  }

  const activeFilters = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];
    if (search) {
      chips.push({ key: "search", label: `Search: ${search}`, onRemove: () => setSearch("") });
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
  }, [baths, beds, maxPrice, minPrice, search, type]);

  const locationSummary = search ? `in ${search}` : "across current markets";

  function renderModeTabs() {
    return (
      <div className="flex gap-5 overflow-x-auto text-sm font-semibold" aria-label="Listing mode">
        {[{ label: "All", value: "all" }, ...transactionModes.map((item) => ({ label: transactionModeLabels[item].replace("For ", ""), value: item }))].map((item) => (
          <button
            key={item.value}
            className={underlineTabClass(mode === item.value, "capitalize")}
            type="button"
            onClick={() => setMode(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
    );
  }

  function renderFilterControls(prefix: string, showReset: boolean) {
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
        <div className="grid gap-3 border-t border-neutral-100 pt-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold text-neutral-800">Card density</legend>
            <div className="flex gap-4 text-sm font-semibold">
              {(["comfortable", "compact"] as const).map((item) => (
                <button key={item} className={underlineTabClass(density === item, "capitalize")} type="button" onClick={() => setDensity(item)}>
                  {item}
                </button>
              ))}
            </div>
          </fieldset>
          {showReset ? (
            <button className={quietButton} type="button" onClick={resetFilters}>
              Reset
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <section className="grid gap-5 pb-10 md:gap-7">
      <div className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 md:px-6 md:py-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0d6b63] md:text-xs">Public listings</p>
            <h1 className="mt-1 max-w-4xl text-2xl font-semibold leading-tight tracking-normal md:mt-2 md:text-5xl">Find a place, then ask the agency for the live details.</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600 md:mt-3 md:text-base md:leading-7">
              Search current inventory, compare move-in costs, and send one focused inquiry when a listing looks right.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 md:px-6">
        <section className="hidden gap-5 rounded-lg bg-white p-5 shadow-sm shadow-neutral-200/80 lg:grid">
          {renderFilterControls("desktop", true)}
          {activeFilters.length ? (
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((chip) => (
                <button key={chip.key} aria-label={`Remove ${chip.label}`} className="rounded-full bg-[#e9f4f2] px-3 py-1.5 text-sm font-semibold text-[#084943] ring-1 ring-inset ring-[#0d6b63]/15 hover:ring-[#0d6b63]/35" type="button" onClick={chip.onRemove}>
                  {chip.label} x
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <div id="results" className="sticky top-0 z-20 -mx-4 bg-white/95 px-4 py-3 shadow-sm shadow-neutral-200/80 backdrop-blur md:-mx-6 md:px-6">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-900">
                {isLoading ? "Loading listings" : `${filtered.length} listing${filtered.length === 1 ? "" : "s"} ${locationSummary}`}
              </p>
              <p className="text-xs text-neutral-500">Map context appears on each detail page; cards stay focused for comparison.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className={cx(secondaryButton, "lg:hidden")} type="button" onClick={() => setFiltersOpen(true)}>
                Filters
              </button>
              {renderModeTabs()}
            </div>
          </div>
          {activeFilters.length ? (
            <div className="mx-auto mt-3 flex max-w-7xl gap-2 overflow-x-auto pb-1 lg:hidden">
              {activeFilters.map((chip) => (
                <button key={chip.key} aria-label={`Remove ${chip.label}`} className="shrink-0 rounded-full bg-[#e9f4f2] px-3 py-1.5 text-sm font-semibold text-[#084943] ring-1 ring-inset ring-[#0d6b63]/15" type="button" onClick={chip.onRemove}>
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
          <div className="grid gap-4 rounded-lg bg-white px-4 py-12 text-center shadow-sm shadow-neutral-200/80">
            <div>
              <h2 className="text-xl font-semibold">No listings match those filters.</h2>
              <p className="mt-2 text-sm text-neutral-600">Clear filters, broaden the price range, or ask the agency about off-market options.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button className={primaryButton} type="button" onClick={resetFilters}>
                Clear filters
              </button>
              <button className={secondaryButton} type="button" onClick={() => {
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
          <section className="absolute inset-x-0 bottom-0 grid max-h-[88vh] gap-5 overflow-auto rounded-t-lg bg-white p-4 shadow-2xl" role="dialog" aria-label="Listing filters" aria-modal="true">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Filters</h2>
              <button className={secondaryButton} type="button" onClick={() => setFiltersOpen(false)}>
                Close
              </button>
            </div>
            {renderFilterControls("mobile", false)}
            <div className="sticky bottom-0 -mx-4 grid grid-cols-2 gap-2 bg-white p-4 shadow-[0_-14px_30px_rgba(15,23,42,0.08)]">
              <button className={secondaryButton} type="button" onClick={resetFilters}>
                Reset
              </button>
              <button className={primaryButton} type="button" onClick={() => setFiltersOpen(false)}>
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
  const selectedIndex = Math.max(0, gallery.findIndex((item) => item.id === selectedId));
  const selected = gallery[selectedIndex] ?? gallery[0];

  function showAdjacentPhoto(offset: number) {
    if (gallery.length < 2) {
      return;
    }

    const nextIndex = (selectedIndex + offset + gallery.length) % gallery.length;
    setSelectedId(gallery[nextIndex].id);
  }

  return (
    <section id="photos" className="grid gap-3 scroll-mt-20">
      <div className="relative overflow-hidden rounded-lg bg-neutral-200 shadow-sm shadow-neutral-300/60">
        <img alt={selected.altText || property.title} className="aspect-[4/3] w-full object-cover lg:aspect-[16/11]" src={selected.url || property.primaryImageUrl} />
        {gallery.length > 1 ? (
          <>
            <button
              aria-label="Show previous photo"
              className={cx("absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/70 text-neutral-950 shadow-sm ring-1 ring-inset ring-white/75 backdrop-blur transition hover:bg-white/90 sm:h-10 sm:w-10", focusRing)}
              type="button"
              onClick={() => showAdjacentPhoto(-1)}
            >
              <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
              </svg>
            </button>
            <button
              aria-label="Show next photo"
              className={cx("absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/70 text-neutral-950 shadow-sm ring-1 ring-inset ring-white/75 backdrop-blur transition hover:bg-white/90 sm:h-10 sm:w-10", focusRing)}
              type="button"
              onClick={() => showAdjacentPhoto(1)}
            >
              <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                <path d="M9 5l7 7-7 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
              </svg>
            </button>
          </>
        ) : null}
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-[#17211f]/85 px-2.5 py-1 text-xs font-semibold text-white">
            {gallery.length} photo{gallery.length === 1 ? "" : "s"}
          </span>
          {property.floorPlanUrl ? <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-neutral-800">Floor plan</span> : null}
          {property.youtubeUrl ? <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-neutral-800">Video tour</span> : null}
        </div>
      </div>
      {gallery.length > 1 ? (
        <div className="hidden gap-2 overflow-x-auto pb-1 sm:flex">
          {gallery.map((item) => (
            <button
              key={item.id}
              aria-label={`Show ${item.caption || item.altText || property.title}`}
              className={cx("h-20 w-28 shrink-0 overflow-hidden rounded-md ring-2 ring-offset-2 ring-offset-neutral-50 transition", item.id === selected.id ? "ring-[#0f766d]" : "ring-transparent hover:ring-neutral-200", focusRing)}
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
  const messageTemplate = listingContactTemplate(property);
  const encodedTemplate = encodeURIComponent(messageTemplate);
  const whatsappNumber = agencyPhoneNumber.replace(/\D/g, "");
  const contactActions = [
    { label: "Call", href: `tel:${agencyPhoneNumber}`, helper: agencyPhoneDisplay },
    { label: "WhatsApp", href: `https://wa.me/${whatsappNumber}?text=${encodedTemplate}`, helper: "Prefilled", external: true },
    { label: "LINE", href: `https://line.me/R/msg/text/?${encodedTemplate}`, helper: "Prefilled", external: true },
    { label: "Message", href: `sms:${agencyPhoneNumber}?&body=${encodedTemplate}`, helper: "Prefilled" },
    { label: "Instagram", href: "https://ig.me/m/openhousedesk", helper: "Use template", external: true }
  ];
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<InquiryFormState>({
    name: "",
    email: "",
    phone: "",
    preferredContactMethod: "email",
    moveInTimeline: "",
    budget: "",
    message: messageTemplate
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
    setFormOpen(true);
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
      setForm((current) => ({ ...current, message: messageTemplate }));
    }
  }

  return (
    <section id="inquiry" className={cx("grid scroll-mt-20 gap-4", surfaceClass)}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0d6b63]">Contact agency</p>
        <h2 className="mt-1 text-2xl font-semibold">Ask about {property.title}</h2>
        <p className="mt-1 text-sm leading-6 text-neutral-600">Use a quick channel now, or open the desk inquiry form when you want a tracked follow-up.</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {contactActions.map((action) => (
          <a
            key={action.label}
            className={cx(action.label === "Call" ? primaryButton : secondaryButton, "min-h-12 flex-col gap-0.5 px-2 py-2 text-center")}
            href={action.href}
            rel={action.external ? "noreferrer" : undefined}
            target={action.external ? "_blank" : undefined}
          >
            <span>{action.label}</span>
            <span className={cx("text-[11px] font-medium", action.label === "Call" ? "text-white/80" : "text-neutral-500")}>{action.helper}</span>
          </a>
        ))}
      </div>
      <div className="rounded-md bg-neutral-50 p-3 text-sm leading-6 text-neutral-700 ring-1 ring-inset ring-neutral-100">
        <p className="font-semibold text-neutral-950">Message template</p>
        <p className="mt-1">{messageTemplate}</p>
      </div>
      <button className={formOpen ? secondaryButton : ctaButton} type="button" onClick={() => setFormOpen((current) => !current)}>
        {formOpen ? "Hide inquiry form" : "Open inquiry form"}
      </button>
      {formOpen || result ? <ResultMessage result={result} /> : null}
      {result?.ok ? (
        <div className="grid gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-inset ring-emerald-200">
          <p className="font-semibold">Inquiry received for {property.title}.</p>
          <p>The agency will confirm current availability, move-in costs, and viewing options using your preferred contact method.</p>
          <button className={cx(secondaryButton, "min-h-8 justify-self-start px-3 py-1.5 text-xs text-emerald-900")} type="button" onClick={() => {
            setAttempted(false);
            setResult(null);
            setFormOpen(true);
          }}>
            Send another question
          </button>
        </div>
      ) : null}
      {formOpen && !result?.ok ? (
        <form className="grid gap-3 border-t border-neutral-100 pt-4" onSubmit={(event) => void submit(event)}>
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
          <details className="rounded-md bg-neutral-50 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-neutral-800">Optional details</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Move-in timeline" name="moveInTimeline" value={form.moveInTimeline} onInput={(value) => setField("moveInTimeline", value)} />
              <Field label="Budget" name="budget" value={form.budget} onInput={(value) => setField("budget", value)} />
            </div>
          </details>
          <button className={cx(ctaButton, "w-full sm:w-auto")} disabled={submitting} type="submit">
            {submitting ? "Sending..." : "Send inquiry"}
          </button>
        </form>
      ) : null}
    </section>
  );
}

function FaqChat({ faqs, onNeedHelp, property }: { faqs: FaqRecord[]; onNeedHelp: (question: string) => void; property: PropertyRecord }) {
  const [open, setOpen] = useState(false);
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
    setOpen(true);
  }

  return (
    <section id="faq" className={cx("grid scroll-mt-20 gap-4", surfaceClass)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Questions about this listing</h2>
          <p className="mt-1 text-sm leading-6 text-neutral-600">Open quick answers from listing details and approved FAQ only.</p>
        </div>
        <button className={open ? secondaryButton : darkButton} type="button" onClick={() => setOpen((current) => !current)}>
          {open ? "Hide FAQ" : "Ask FAQ"}
        </button>
      </div>
      {open ? (
        <>
          <div className="flex flex-wrap gap-2">
            {suggestedFaqQuestions.map((item) => (
              <button key={item} className={cx(secondaryButton, "min-h-9 px-3 py-1.5")} type="button" onClick={() => answerQuestion(item)}>
                {item}
              </button>
            ))}
          </div>
          <div className="rounded-md bg-neutral-50 p-3 text-sm leading-6 text-neutral-800">{answer}</div>
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => {
            event.preventDefault();
            answerQuestion(question);
          }}>
            <input
              className={cx(fieldClass, "min-w-0 flex-1 border-neutral-200 hover:border-neutral-300 focus:border-[#0f766d]")}
              placeholder="Ask about rent, availability, floor plan, location..."
              value={question}
              onInput={(event) => setQuestion((event.currentTarget as HTMLInputElement).value)}
            />
            <button className={darkButton} type="submit">
              Ask
            </button>
          </form>
          <button
            className={cx(secondaryButton, "justify-self-start text-[#7c2b1e] hover:bg-[#f8e7e1]")}
            type="button"
            onClick={() => onNeedHelp(lastQuestion || question || `I have a question about ${property.title}.`)}
          >
            I still need help
          </button>
          <p className="text-xs leading-5 text-neutral-500">Confirm property details, pricing, and availability with the agency before making a decision.</p>
        </>
      ) : (
        <p className="rounded-md bg-neutral-50 p-3 text-sm leading-6 text-neutral-600">Tap to ask about rent, availability, floor plans, location, or viewing details without expanding the full section by default.</p>
      )}
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
    { href: "#inquiry", label: "Contact" }
  ];

  return (
    <nav className="sticky top-0 z-20 -mx-4 flex gap-6 overflow-x-auto bg-white/95 px-4 py-3 text-sm font-semibold shadow-sm shadow-neutral-200/80 backdrop-blur md:-mx-6 md:px-6 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:shadow-none" aria-label="Property sections">
      {anchors.map((anchor) => (
        <a key={anchor.href} className={underlineTabClass(false, "px-0")} href={anchor.href} onClick={(event) => smoothScrollToHash(event, anchor.href)}>
          {anchor.label}
        </a>
      ))}
    </nav>
  );
}

function ResourceLink({ description, href, label }: { description: string; href: string; label: string }) {
  return (
    <a className={cx("grid gap-1 rounded-md bg-neutral-50 p-4 text-sm transition hover:bg-[#eef8fa]", focusRing)} href={href} rel="noreferrer" target="_blank">
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
    <section id="map" className={cx("grid scroll-mt-20 gap-4", surfaceClass)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Location</h2>
          <p className="mt-1 text-sm leading-6 text-neutral-600">{property.addressDisplay || locationText(property, true)}</p>
        </div>
        {mapUrl ? (
          <a className={secondaryButton} href={mapUrl} rel="noreferrer" target="_blank">
            Open in Google Maps
          </a>
        ) : null}
      </div>
      {embedUrl ? (
        <iframe
          className="aspect-[4/3] w-full rounded-md"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={embedUrl}
          title={`Map for ${property.title}`}
        />
      ) : (
        <div className="rounded-md bg-neutral-50 p-6 text-sm text-neutral-600">
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
    <section className={cx("grid gap-3", surfaceClass)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Related listings</h2>
          <p className="mt-1 text-sm text-neutral-600">Keep comparing without starting over.</p>
        </div>
        <Link className={cx(textLink, "text-sm")} to="/">
          Back to all listings
        </Link>
      </div>
      <div className="divide-y divide-neutral-100">
        {related.map((property) => (
          <Link key={property.id} className={cx("grid gap-1 py-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center", focusRing)} to={`/property/${property.slug}`}>
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
        <Link className={cx(primaryButton, "mt-4")} to="/">
          Back to listings
        </Link>
      </section>
    );
  }

  const availability = availabilityMeta(property);
  const amenities = splitMultiValue(property.amenities);
  const mapUrl = externalMapsUrl(property);

  return (
    <section className="mx-auto grid max-w-7xl gap-7 px-4 pb-28 pt-6 md:px-6 lg:pb-12">
      <Link className={cx(textLink, "text-sm")} to="/">
        Back to listings
      </Link>

      <div id="overview" className="grid scroll-mt-20 gap-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <p className="text-sm font-semibold text-[#0d6b63]">{locationText(property, true)}</p>
            <h1 className="mt-1 text-3xl font-semibold leading-tight tracking-normal md:text-5xl">{property.title}</h1>
            <p className="mt-3 max-w-3xl leading-7 text-neutral-600">{property.description || "The agency has not added a full description yet."}</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm shadow-neutral-200/80">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Availability updated</p>
            <p className="mt-1 font-semibold text-neutral-950">{shortDate(property.updatedAt) || "Recently"}</p>
          </div>
        </div>
        <DetailAnchorNav hasFloorPlan={Boolean(property.floorPlanUrl)} hasMap={Boolean(mapUrl || mapsQuery(property))} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_380px] lg:items-start">
        <PropertyGallery media={media} property={property} />
        <aside className={cx("grid content-start gap-5 lg:sticky lg:top-5", surfaceClass)}>
          <span className={cx("justify-self-start rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ring-inset", availability.className)}>{availability.label}</span>
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
              <div key={label} className={mutedPanelClass}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">{label}</p>
                <p className="mt-1 font-semibold text-neutral-950">{value}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-2">
            <a className={ctaButton} href="#inquiry" onClick={(event) => smoothScrollToHash(event, "#inquiry")}>
              Contact agency
            </a>
            {mapUrl ? (
              <a className={secondaryButton} href={mapUrl} rel="noreferrer" target="_blank">
                Open in Google Maps
              </a>
            ) : null}
          </div>
          <p className="text-xs leading-5 text-neutral-500">Agency confirmation is required before applications, payments, or viewing plans.</p>
        </aside>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="grid gap-6">
          <section className={cx("grid gap-4", surfaceClass)}>
            <h2 className="text-2xl font-semibold">Costs and availability</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={mutedPanelClass}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">Price</p>
                <p className="mt-1 font-semibold">{formatMoney(property.price, property.currency)}{property.transactionMode === "rent" ? " / mo" : ""}</p>
              </div>
              <div className={mutedPanelClass}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">Deposit</p>
                <p className="mt-1 font-semibold">{property.deposit ? formatMoney(property.deposit, property.currency) : "Confirm with agency"}</p>
              </div>
              <div className={mutedPanelClass}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">Available from</p>
                <p className="mt-1 font-semibold">{shortDate(property.availableFrom) || property.availabilityText || "Confirm availability"}</p>
              </div>
              <div className={mutedPanelClass}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">Fees</p>
                <p className="mt-1 font-semibold">{property.feesText || "Ask agency to confirm"}</p>
              </div>
            </div>
          </section>

          <section id="amenities" className={cx("grid scroll-mt-20 gap-4", surfaceClass)}>
            <h2 className="text-2xl font-semibold">Amenities</h2>
            {amenities.length ? (
              <div className="flex flex-wrap gap-2">
                {amenities.map((amenity) => (
                  <span key={amenity} className="rounded-full bg-neutral-50 px-3 py-1 text-sm font-medium text-neutral-700 ring-1 ring-inset ring-neutral-100">
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
            <section id="floor-plan" className={cx("grid scroll-mt-20 gap-3", surfaceClass)}>
              <h2 className="text-2xl font-semibold">Media and documents</h2>
              {property.floorPlanUrl ? (
                <ResourceLink description="Review the public floor plan in a new tab. Confirm measurements with the agency." href={property.floorPlanUrl} label="Floor plan" />
              ) : null}
              {property.youtubeUrl ? (
                <ResourceLink description="Watch the public video tour on YouTube without leaving this listing behind." href={property.youtubeUrl} label="Video tour" />
              ) : null}
            </section>
          ) : null}

          <section className="rounded-lg bg-amber-50 p-4 text-sm leading-6 text-amber-950 ring-1 ring-inset ring-amber-200">
            Prices, availability, fees, property details, and FAQ answers are informational and should be confirmed directly with the agency.
          </section>

          <RelatedListings current={property} properties={properties} />
        </div>
        <div className="grid content-start gap-6">
          <InquiryForm prefillMessage={inquiryPrefill} property={property} />
          <FaqChat faqs={faqs} onNeedHelp={sendFaqToInquiry} property={property} />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 bg-white/95 p-3 shadow-2xl backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-neutral-950">{property.title}</p>
            <p className="text-xs text-neutral-600">{formatMoney(property.price, property.currency)}{property.transactionMode === "rent" ? " / mo" : ""}</p>
          </div>
          <a className={ctaButton} href="#inquiry" onClick={(event) => smoothScrollToHash(event, "#inquiry")}>
            Contact
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
        <div className={cx("grid gap-4", surfaceClass)}>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#0d6b63]">Admin access</p>
          <h1 className="text-3xl font-semibold">Sign in with Google to manage listings.</h1>
          <p className="leading-7 text-neutral-600">Public browsing and inquiries do not require accounts. Listing management, imports, inquiries, and FAQ maintenance are protected.</p>
          <SignInWithGoogle className={cx(primaryButton, "justify-self-start")} />
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
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:px-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#0d6b63]">Agency admin</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-normal md:text-5xl">Manage listings, leads, and FAQ content</h1>
      </div>
      <div className="flex gap-6 overflow-x-auto">
        {tabs.map(([id, label]) => (
          <button key={id} className={underlineTabClass(tab === id)} type="button" onClick={() => setTab(id)}>
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
          <button key={status} className={cx("rounded-lg bg-white p-4 text-left shadow-sm shadow-neutral-200/80 transition hover:-translate-y-0.5 hover:shadow-md", focusRing)} type="button" onClick={() => onOpenTab("listings")}>
            <p className="text-sm font-medium text-neutral-500">{statusLabels[status]}</p>
            <p className="mt-2 text-3xl font-semibold">{dashboard?.counts?.[status] ?? 0}</p>
          </button>
        ))}
      </div>

      <section className={cx("grid gap-4", surfaceClass)}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#c24b32]">Today's work</p>
            <h2 className="mt-1 text-2xl font-semibold">Attention queue</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={primaryButton} type="button" onClick={() => onOpenTab("listings")}>
              Create listing
            </button>
            <button className={secondaryButton} type="button" onClick={() => onOpenTab("import")}>
              Import CSV
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <button className={cx("rounded-md bg-[#f8e7e1] p-4 text-left ring-1 ring-inset ring-[#c24b32]/20", focusRing)} type="button" onClick={() => onOpenTab("inquiries")}>
            <p className="text-sm font-semibold text-[#7c2b1e]">New inquiries</p>
            <p className="mt-2 text-3xl font-semibold">{newInquiries.length}</p>
          </button>
          <button className={cx("rounded-md bg-[#fff7e6] p-4 text-left ring-1 ring-inset ring-[#b9862e]/20", focusRing)} type="button" onClick={() => onOpenTab("listings")}>
            <p className="text-sm font-semibold text-[#765016]">Publish blockers</p>
            <p className="mt-2 text-3xl font-semibold">{publishBlocked.length}</p>
          </button>
          <button className={cx("rounded-md bg-neutral-50 p-4 text-left", focusRing)} type="button" onClick={() => onOpenTab("listings")}>
            <p className="text-sm font-semibold text-neutral-700">Stale availability</p>
            <p className="mt-2 text-3xl font-semibold">{stalePublished.length}</p>
          </button>
          <button className={cx("rounded-md bg-neutral-50 p-4 text-left", focusRing)} type="button" onClick={() => onOpenTab("import")}>
            <p className="text-sm font-semibold text-neutral-700">Imports with errors</p>
            <p className="mt-2 text-3xl font-semibold">{importErrors.length}</p>
          </button>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <section className={surfaceClass}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Lead response status</h2>
            <button className={cx(textLink, "text-sm")} type="button" onClick={() => onOpenTab("inquiries")}>
              Open inbox
            </button>
          </div>
          <div className="mt-4 divide-y divide-neutral-100">
            {inquiries.length ? (
              inquiries.slice(0, 5).map((inquiry) => (
                <div key={inquiry.id} className="py-3 text-sm">
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
        <section className={cx("grid gap-4", surfaceClass)}>
          <h2 className="text-xl font-semibold">Import and demo data</h2>
          <p className="text-sm leading-6 text-neutral-600">
            Seed demo content for a complete public walkthrough, or use CSV import for agency inventory. Latest import: {dashboard?.latestImport ? `${dashboard.latestImport.status} with ${dashboard.latestImport.errorCount} errors` : "none"}.
          </p>
          <ResultMessage result={result} />
          <button className={darkButton} type="button" onClick={async () => setResult(await seedDemoData())}>
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
        <div className={cx("grid gap-4", surfaceClass)}>
          <div className="grid gap-3">
            <Field label="Search listings" name="adminSearch" value={search} onInput={setSearch} />
            <div className="flex flex-wrap gap-5" aria-label="Listing status filters">
              {statusFilters.map((item) => (
                <button
                  key={item.value}
                  className={underlineTabClass(status === item.value)}
                  type="button"
                  onClick={() => setStatus(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <button className={cx(primaryButton, "justify-self-start")} type="button" onClick={startCreate}>
            Create listing
          </button>
        </div>
        <div className="overflow-hidden rounded-lg bg-white shadow-sm shadow-neutral-200/80">
          <div className="hidden grid-cols-[1.4fr_0.7fr_0.8fr_0.7fr] gap-3 bg-neutral-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500 md:grid">
            <span>Listing</span>
            <span>Status</span>
            <span>Readiness</span>
            <span>Actions</span>
          </div>
          <div className="divide-y divide-neutral-100">
            {filtered.map((property) => {
              const issues = propertyQualityIssues({ ...property, status: "published" }, "published");
              return (
                <article key={property.id} className="grid gap-3 p-4 md:grid-cols-[1.4fr_0.7fr_0.8fr_0.7fr] md:items-center">
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
                      <span className="rounded-full bg-[#f8e7e1] px-2.5 py-1 text-xs font-semibold text-[#7c2b1e] ring-1 ring-inset ring-[#c24b32]/30">
                        {issues.length} blocker{issues.length === 1 ? "" : "s"}
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200">Ready</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className={cx(secondaryButton, "min-h-9 px-3 py-1.5")} type="button" onClick={() => startEdit(property)}>
                      Edit
                    </button>
                    <button className={cx(secondaryButton, "min-h-9 px-3 py-1.5")} type="button" onClick={async () => {
                      if (confirm(`Hide ${property.title || "this listing"}?`)) {
                        setResult(await updateStatus(property.id, "hidden"));
                      }
                    }}>
                      Hide
                    </button>
                    <button className={cx(secondaryButton, "min-h-9 px-3 py-1.5 hover:text-[#7c2b1e]")} type="button" onClick={async () => {
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
          </div>
          {!filtered.length ? <div className="p-8 text-center text-sm text-neutral-500">No admin listings match.</div> : null}
        </div>
      </div>

      <form className={cx("grid gap-5", surfaceClass)} onSubmit={(event) => event.preventDefault()}>
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
        <div className="rounded-md bg-neutral-50 p-4">
          <h3 className="font-semibold">Publishing checklist</h3>
          <div className="mt-2">
            <MissingFields property={form} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={secondaryButton} type="button" onClick={() => void save("draft")}>
            Save draft
          </button>
          <button className={primaryButton} type="button" onClick={() => void save("published")}>
            Publish
          </button>
          <button className={secondaryButton} type="button" onClick={() => void save("hidden")}>
            Hide
          </button>
          <button className={secondaryButton} type="button" onClick={() => void save("archived")}>
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
      <div className={cx("grid gap-4", surfaceClass)}>
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
        <button className={primaryButton} type="button" onClick={async () => setResult(await importCsv(csvText, mode, filename))}>
          Import valid rows
        </button>
      </div>

      <div className="grid content-start gap-4">
        <section className={surfaceClass}>
          <h3 className="text-xl font-semibold">Preview</h3>
          <p className="mt-2 text-sm text-neutral-600">{parsed.rows.length} rows, {parsed.headers.length} columns.</p>
          {parsed.errors.length ? (
            <ul className="mt-3 grid gap-1 text-sm text-rose-700">
              {parsed.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-4 max-h-[420px] overflow-auto rounded-md ring-1 ring-inset ring-neutral-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50">
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
                  <tr key={index} className="border-t border-neutral-100">
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
        <section className={surfaceClass}>
          <h3 className="text-xl font-semibold">Recent imports</h3>
          <div className="mt-4 divide-y divide-neutral-100">
            {imports.length ? (
              imports.map((item) => (
                <div key={item.id} className="py-3 text-sm">
                  <p className="font-semibold">{item.filename}</p>
                  <p className="mt-1 text-neutral-600">{item.status}: {item.validCount} valid, {item.errorCount} errors</p>
                  {item.errors ? <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded-md bg-neutral-50 p-2 text-xs text-rose-800">{item.errors}</pre> : null}
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
          <article key={inquiry.id} className={cx("grid gap-4", surfaceClass)}>
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
            <p className="rounded-md bg-neutral-50 p-3 text-sm leading-6">{inquiry.message}</p>
            <div className="grid gap-3 md:grid-cols-[220px_1fr_auto] md:items-end">
              <SelectField label="Lead status" name={`lead-${inquiry.id}`} value={inquiry.status} options={leadStatuses.map((status) => ({ label: leadStatusLabels[status], value: status }))} onInput={async (value) => setResult(await updateInquiry(inquiry.id, { status: value as LeadStatus, adminNotes: notes[inquiry.id] ?? inquiry.adminNotes }))} />
              <TextAreaField label="Admin notes" name={`notes-${inquiry.id}`} rows={2} value={notes[inquiry.id] ?? inquiry.adminNotes} onInput={(value) => setNotes((current) => ({ ...current, [inquiry.id]: value }))} />
              <button className={darkButton} type="button" onClick={async () => setResult(await updateInquiry(inquiry.id, { status: inquiry.status, adminNotes: notes[inquiry.id] ?? inquiry.adminNotes }))}>
                Save notes
              </button>
            </div>
          </article>
        ))
      ) : (
        <div className="rounded-lg bg-white p-8 text-center text-sm text-neutral-500 shadow-sm shadow-neutral-200/80">No inquiries yet.</div>
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
      <div className={cx("grid content-start gap-4", surfaceClass)}>
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
          <button className={primaryButton} type="button" onClick={() => void save()}>
            Save FAQ
          </button>
          {editing ? (
            <button className={secondaryButton} type="button" onClick={() => {
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
            <article key={faq.id} className="rounded-lg bg-white p-4 shadow-sm shadow-neutral-200/80">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{faq.question}</h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">{faq.answer}</p>
                  <p className="mt-2 text-xs text-neutral-500">Keywords: {faq.keywords || "none"}</p>
                </div>
                <span className={cx("rounded-full px-2 py-1 text-xs font-semibold ring-1 ring-inset", faq.active ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-neutral-100 text-neutral-700 ring-neutral-200")}>{faq.active ? "Active" : "Inactive"}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <button className={cx(secondaryButton, "min-h-9 px-3 py-1.5")} type="button" onClick={() => {
                  setEditing(faq.id);
                  setForm({ question: faq.question, answer: faq.answer, keywords: faq.keywords, active: faq.active, sortOrder: faq.sortOrder });
                }}>
                  Edit
                </button>
                <button className={cx(secondaryButton, "min-h-9 px-3 py-1.5")} type="button" onClick={async () => setResult(await updateFaq(faq.id, { ...faq, active: !faq.active }))}>
                  {faq.active ? "Deactivate" : "Activate"}
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-lg bg-white p-8 text-center text-sm text-neutral-500 shadow-sm shadow-neutral-200/80">No FAQ records yet. Public pages use demo FAQ content until admin records exist.</div>
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
