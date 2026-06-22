export const listingStatuses = ["draft", "published", "hidden", "archived"] as const;
export type ListingStatus = (typeof listingStatuses)[number];

export const transactionModes = ["rent", "sale"] as const;
export type TransactionMode = (typeof transactionModes)[number];

export const propertyTypes = ["apartment", "condo", "house", "townhouse", "villa", "land", "commercial", "other"] as const;
export type PropertyType = (typeof propertyTypes)[number];

export const leadStatuses = ["new", "contacted", "viewing_scheduled", "closed", "ignored"] as const;
export type LeadStatus = (typeof leadStatuses)[number];

export const mediaTypes = ["photo", "floor_plan"] as const;
export type MediaType = (typeof mediaTypes)[number];

export type ImportMode = "create" | "update" | "upsert";

export type PropertyRecord = {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: ListingStatus;
  transactionMode: TransactionMode;
  propertyType: PropertyType;
  price: string;
  currency: string;
  deposit: string;
  feesText: string;
  bedrooms: string;
  bathrooms: string;
  areaSize: string;
  areaUnit: string;
  addressDisplay: string;
  city: string;
  district: string;
  provinceOrState: string;
  country: string;
  googleMapsUrl: string;
  availabilityText: string;
  availableFrom: string;
  amenities: string;
  youtubeUrl: string;
  floorPlanUrl: string;
  primaryImageUrl: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type PropertyInput = Partial<Omit<PropertyRecord, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">>;

export type PropertyMediaRecord = {
  id: string;
  propertyId: string;
  type: MediaType;
  url: string;
  altText: string;
  caption: string;
  sortOrder: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};

export type InquiryRecord = {
  id: string;
  propertyId: string;
  propertyTitle: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  preferredContactMethod: string;
  moveInTimeline: string;
  budget: string;
  sourcePage: string;
  status: LeadStatus;
  adminNotes: string;
  createdAt: string;
  updatedAt: string;
};

export type FaqRecord = {
  id: string;
  question: string;
  answer: string;
  keywords: string;
  active: boolean;
  sortOrder: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type CsvImportRecord = {
  id: string;
  filename: string;
  uploadedBy: string;
  rowCount: string;
  validCount: string;
  errorCount: string;
  status: string;
  errors: string;
  createdAt: string;
  updatedAt: string;
};

export type MutationResult<T = unknown> = {
  ok: boolean;
  error?: string;
  errors?: string[];
  data?: T;
};

export const statusLabels: Record<ListingStatus, string> = {
  draft: "Draft",
  published: "Published",
  hidden: "Hidden",
  archived: "Archived"
};

export const transactionModeLabels: Record<TransactionMode, string> = {
  rent: "For rent",
  sale: "For sale"
};

export const propertyTypeLabels: Record<PropertyType, string> = {
  apartment: "Apartment",
  condo: "Condo",
  house: "House",
  townhouse: "Townhouse",
  villa: "Villa",
  land: "Land",
  commercial: "Commercial",
  other: "Other"
};

export const leadStatusLabels: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  viewing_scheduled: "Viewing scheduled",
  closed: "Closed",
  ignored: "Ignored"
};

export const requiredPublishFields: Array<{ field: keyof PropertyInput; label: string }> = [
  { field: "title", label: "Title" },
  { field: "slug", label: "Slug" },
  { field: "transactionMode", label: "Listing type" },
  { field: "propertyType", label: "Property type" },
  { field: "price", label: "Price or rent" },
  { field: "currency", label: "Currency" },
  { field: "addressDisplay", label: "Address display" },
  { field: "bedrooms", label: "Bedrooms" },
  { field: "bathrooms", label: "Bathrooms" },
  { field: "primaryImageUrl", label: "Primary image" }
];
