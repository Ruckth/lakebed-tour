import { boolean, capsule, endpoint, json, mutation, query, string, table, text } from "lakebed/server";
import {
  choiceOrDefault,
  cleanLongText,
  cleanText,
  csvHeaders,
  csvTemplate,
  defaultFaqs,
  demoMedia,
  demoProperties,
  isHttpUrl,
  joinMultiValue,
  leadStatuses,
  listingStatuses,
  normalizePropertyInput,
  parseCsvText,
  propertyInputFromCsvRow,
  propertyQualityIssues,
  slugify,
  splitMultiValue,
  validateCsvRow,
  type CsvImportRecord,
  type FaqRecord,
  type ImportMode,
  type InquiryRecord,
  type LeadStatus,
  type ListingStatus,
  type MutationResult,
  type PropertyInput,
  type PropertyMediaRecord,
  type PropertyRecord
} from "../shared/content";

type Row = Record<string, unknown> & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

function rowList<T>(rows: Row[]): T[] {
  return rows as unknown as T[];
}

function isAdmin(ctx: { auth: { provider: string; isGuest: boolean } }): boolean {
  return ctx.auth.provider === "google" && !ctx.auth.isGuest;
}

function requireAdmin<T>(ctx: { auth: { provider: string; isGuest: boolean } }, fallback: T): T | null {
  return isAdmin(ctx) ? null : fallback;
}

function mutationAuthError(): MutationResult {
  return {
    ok: false,
    error: "Google sign-in is required for admin actions."
  };
}

function properties(ctx: { db: Record<string, { orderBy(field: string, direction?: "asc" | "desc"): { all(): Row[] }; all(): Row[] }> }): PropertyRecord[] {
  return rowList<PropertyRecord>(ctx.db.properties.orderBy("updatedAt", "desc").all());
}

function media(ctx: { db: Record<string, { orderBy(field: string, direction?: "asc" | "desc"): { all(): Row[] }; all(): Row[] }> }): PropertyMediaRecord[] {
  return rowList<PropertyMediaRecord>(ctx.db.propertyMedia.orderBy("sortOrder", "asc").all());
}

function inquiries(ctx: { db: Record<string, { orderBy(field: string, direction?: "asc" | "desc"): { all(): Row[] }; all(): Row[] }> }): InquiryRecord[] {
  return rowList<InquiryRecord>(ctx.db.inquiries.orderBy("createdAt", "desc").all());
}

function faqs(ctx: { db: Record<string, { orderBy(field: string, direction?: "asc" | "desc"): { all(): Row[] }; all(): Row[] }> }): FaqRecord[] {
  return rowList<FaqRecord>(ctx.db.faqs.orderBy("sortOrder", "asc").all());
}

function imports(ctx: { db: Record<string, { orderBy(field: string, direction?: "asc" | "desc"): { all(): Row[] }; all(): Row[] }> }): CsvImportRecord[] {
  return rowList<CsvImportRecord>(ctx.db.csvImports.orderBy("createdAt", "desc").all());
}

function isOwnedBy(record: { createdBy?: string; uploadedBy?: string }, userId: string): boolean {
  return record.createdBy === userId || record.uploadedBy === userId;
}

function ownedProperties(ctx: { db: Record<string, { orderBy(field: string, direction?: "asc" | "desc"): { all(): Row[] }; all(): Row[] }> }, userId: string): PropertyRecord[] {
  return properties(ctx).filter((property) => isOwnedBy(property, userId));
}

function ownedPropertyIds(ctx: { db: Record<string, { orderBy(field: string, direction?: "asc" | "desc"): { all(): Row[] }; all(): Row[] }> }, userId: string): Set<string> {
  return new Set(ownedProperties(ctx, userId).map((property) => property.id));
}

function ownedMedia(ctx: { db: Record<string, { orderBy(field: string, direction?: "asc" | "desc"): { all(): Row[] }; all(): Row[] }> }, userId: string): PropertyMediaRecord[] {
  const propertyIds = ownedPropertyIds(ctx, userId);
  return media(ctx).filter((item) => propertyIds.has(item.propertyId));
}

function ownedInquiries(ctx: { db: Record<string, { orderBy(field: string, direction?: "asc" | "desc"): { all(): Row[] }; all(): Row[] }> }, userId: string): InquiryRecord[] {
  const propertyIds = ownedPropertyIds(ctx, userId);
  return inquiries(ctx).filter((inquiry) => propertyIds.has(inquiry.propertyId));
}

function ownedFaqs(ctx: { db: Record<string, { orderBy(field: string, direction?: "asc" | "desc"): { all(): Row[] }; all(): Row[] }> }, userId: string): FaqRecord[] {
  return faqs(ctx).filter((faq) => isOwnedBy(faq, userId));
}

function ownedImports(ctx: { db: Record<string, { orderBy(field: string, direction?: "asc" | "desc"): { all(): Row[] }; all(): Row[] }> }, userId: string): CsvImportRecord[] {
  return imports(ctx).filter((item) => isOwnedBy(item, userId));
}

function publishedProperties(ctx: { db: Record<string, { where(field: string, value: unknown): { orderBy(field: string, direction?: "asc" | "desc"): { all(): Row[] } } }> }): PropertyRecord[] {
  const rows = rowList<PropertyRecord>(ctx.db.properties.where("status", "published").orderBy("updatedAt", "desc").all());
  return rows.length ? rows : demoProperties;
}

function activeFaqs(ctx: { db: Record<string, { where(field: string, value: unknown): { orderBy(field: string, direction?: "asc" | "desc"): { all(): Row[] } } }> }): FaqRecord[] {
  const rows = rowList<FaqRecord>(ctx.db.faqs.where("active", true).orderBy("sortOrder", "asc").all());
  return rows.length ? rows : defaultFaqs;
}

function publishedMedia(ctx: { db: Record<string, { orderBy(field: string, direction?: "asc" | "desc"): { all(): Row[] }; where(field: string, value: unknown): { orderBy(field: string, direction?: "asc" | "desc"): { all(): Row[] } } }> }): PropertyMediaRecord[] {
  const livePublishedIds = new Set(rowList<PropertyRecord>(ctx.db.properties.where("status", "published").orderBy("updatedAt", "desc").all()).map((property) => property.id));
  if (!livePublishedIds.size) {
    return demoMedia;
  }

  return media(ctx).filter((item) => livePublishedIds.has(item.propertyId));
}

function findPropertyByIdOrSlug(ctx: { db: Record<string, { all(): Row[] }> }, idOrSlug: string): PropertyRecord | null {
  const match = rowList<PropertyRecord>(ctx.db.properties.all()).find((property) => property.id === idOrSlug || property.slug === idOrSlug) ??
    demoProperties.find((property) => property.id === idOrSlug || property.slug === idOrSlug);

  return match ?? null;
}

function uniqueSlugError(ctx: { db: Record<string, { all(): Row[] }> }, slug: string, ignoreId = ""): string {
  const duplicate = rowList<PropertyRecord>(ctx.db.properties.all()).find((property) => property.slug === slug && property.id !== ignoreId);
  return duplicate ? "Slug must be unique." : "";
}

function prepareProperty(ctx: { db: Record<string, { all(): Row[] }> }, input: PropertyInput, actorId: string, existing?: PropertyRecord): MutationResult<Omit<PropertyRecord, "id" | "createdAt" | "updatedAt">> {
  const normalized = normalizePropertyInput(input, actorId, existing);
  const duplicateSlug = uniqueSlugError(ctx, normalized.slug, existing?.id);
  if (duplicateSlug) {
    return { ok: false, errors: [duplicateSlug] };
  }

  const issues = propertyQualityIssues(normalized, normalized.status);
  if (issues.length) {
    return { ok: false, errors: issues };
  }

  return { ok: true, data: normalized };
}

function publicInquiryErrors(input: {
  name: string;
  email: string;
  phone: string;
  message: string;
}): string[] {
  const errors: string[] = [];
  if (!cleanText(input.name)) {
    errors.push("Name is required.");
  }

  if (!cleanText(input.email) && !cleanText(input.phone)) {
    errors.push("Email or phone is required.");
  }

  if (cleanText(input.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanText(input.email))) {
    errors.push("Email format looks invalid.");
  }

  if (!cleanText(input.message)) {
    errors.push("Message is required.");
  }

  return errors;
}

function mediaInputFromText(property: PropertyRecord, photoText: string): Array<Omit<PropertyMediaRecord, "id" | "createdAt" | "updatedAt">> {
  const seen = new Set<string>();
  const lines = cleanLongText(photoText)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const rows: Array<Omit<PropertyMediaRecord, "id" | "createdAt" | "updatedAt">> = [];

  const addPhoto = (line: string, index: number) => {
    const [url, altText, caption] = line.split("|").map((part) => cleanText(part, 2000));
    if (!url || seen.has(url)) {
      return;
    }
    seen.add(url);
    rows.push({
      propertyId: property.id,
      type: "photo",
      url,
      altText: altText || property.title,
      caption,
      sortOrder: String(index + 1),
      isPrimary: rows.length === 0
    });
  };

  if (property.primaryImageUrl) {
    addPhoto(`${property.primaryImageUrl}|${property.title}|Primary image`, 0);
  }

  for (const [index, line] of lines.entries()) {
    addPhoto(line, index + 1);
  }

  if (property.floorPlanUrl) {
    rows.push({
      propertyId: property.id,
      type: "floor_plan",
      url: property.floorPlanUrl,
      altText: `${property.title} floor plan`,
      caption: "Public floor plan",
      sortOrder: "99",
      isPrimary: false
    });
  }

  return rows;
}

function replacePropertyMedia(ctx: { db: Record<string, { all(): Row[]; delete(id: string): void; insert(value: Record<string, unknown>): Row }> }, property: PropertyRecord, photoText: string): string[] {
  const rows = mediaInputFromText(property, photoText);
  const errors: string[] = [];
  for (const row of rows) {
    if (!isHttpUrl(row.url)) {
      errors.push(`${row.type === "floor_plan" ? "Floor plan" : "Photo"} URL must be valid: ${row.url}`);
    }
  }

  if (errors.length) {
    return errors;
  }

  for (const item of rowList<PropertyMediaRecord>(ctx.db.propertyMedia.all()).filter((item) => item.propertyId === property.id)) {
    ctx.db.propertyMedia.delete(item.id);
  }

  for (const row of rows) {
    ctx.db.propertyMedia.insert(row);
  }

  return [];
}

function serializeErrors(errors: string[]): string {
  return errors.join("\n").slice(0, 20000);
}

export default capsule({
  name: "lakebed-tour",

  schema: {
    properties: table({
      slug: string().default(""),
      title: string().default(""),
      description: string().default(""),
      status: string().default("draft"),
      transactionMode: string().default("rent"),
      propertyType: string().default("apartment"),
      price: string().default(""),
      currency: string().default("USD"),
      deposit: string().default(""),
      feesText: string().default(""),
      bedrooms: string().default(""),
      bathrooms: string().default(""),
      areaSize: string().default(""),
      areaUnit: string().default("sqft"),
      addressDisplay: string().default(""),
      city: string().default(""),
      district: string().default(""),
      provinceOrState: string().default(""),
      country: string().default("United States"),
      googleMapsUrl: string().default(""),
      availabilityText: string().default(""),
      availableFrom: string().default(""),
      amenities: string().default(""),
      youtubeUrl: string().default(""),
      floorPlanUrl: string().default(""),
      primaryImageUrl: string().default(""),
      contactName: string().default(""),
      contactPhone: string().default(""),
      contactWhatsappPhone: string().default(""),
      contactLineUrl: string().default(""),
      contactInstagramUrl: string().default(""),
      createdBy: string().default(""),
      updatedBy: string().default("")
    }),
    propertyMedia: table({
      propertyId: string().default(""),
      type: string().default("photo"),
      url: string().default(""),
      altText: string().default(""),
      caption: string().default(""),
      sortOrder: string().default("0"),
      isPrimary: boolean().default(false)
    }),
    inquiries: table({
      propertyId: string().default(""),
      propertyTitle: string().default(""),
      name: string().default(""),
      email: string().default(""),
      phone: string().default(""),
      message: string().default(""),
      preferredContactMethod: string().default("email"),
      moveInTimeline: string().default(""),
      budget: string().default(""),
      sourcePage: string().default(""),
      status: string().default("new"),
      adminNotes: string().default("")
    }),
    faqs: table({
      question: string().default(""),
      answer: string().default(""),
      keywords: string().default(""),
      active: boolean().default(true),
      sortOrder: string().default("0"),
      createdBy: string().default(""),
      updatedBy: string().default("")
    }),
    csvImports: table({
      filename: string().default(""),
      uploadedBy: string().default(""),
      rowCount: string().default("0"),
      validCount: string().default("0"),
      errorCount: string().default("0"),
      status: string().default("completed"),
      errors: string().default("")
    })
  },

  queries: {
    listPublishedProperties: query((ctx) => publishedProperties(ctx)),
    listPublishedPropertyMedia: query((ctx) => publishedMedia(ctx)),
    listActiveFaqs: query((ctx) => activeFaqs(ctx)),
    adminListProperties: query((ctx) => requireAdmin(ctx, [] as PropertyRecord[]) ?? ownedProperties(ctx, ctx.auth.userId)),
    adminListPropertyMedia: query((ctx) => requireAdmin(ctx, [] as PropertyMediaRecord[]) ?? ownedMedia(ctx, ctx.auth.userId)),
    adminListInquiries: query((ctx) => requireAdmin(ctx, [] as InquiryRecord[]) ?? ownedInquiries(ctx, ctx.auth.userId)),
    adminListFaqs: query((ctx) => requireAdmin(ctx, [] as FaqRecord[]) ?? ownedFaqs(ctx, ctx.auth.userId)),
    adminListImports: query((ctx) => requireAdmin(ctx, [] as CsvImportRecord[]) ?? ownedImports(ctx, ctx.auth.userId)),
    adminDashboard: query((ctx) => {
      if (!isAdmin(ctx)) {
        return {
          signedIn: false,
          counts: { draft: 0, published: 0, hidden: 0, archived: 0 },
          recentInquiries: [] as InquiryRecord[],
          latestImport: null as CsvImportRecord | null
        };
      }

      const allProperties = ownedProperties(ctx, ctx.auth.userId);
      const counts = {
        draft: allProperties.filter((property) => property.status === "draft").length,
        published: allProperties.filter((property) => property.status === "published").length,
        hidden: allProperties.filter((property) => property.status === "hidden").length,
        archived: allProperties.filter((property) => property.status === "archived").length
      };

      return {
        signedIn: true,
        counts,
        recentInquiries: ownedInquiries(ctx, ctx.auth.userId).slice(0, 5),
        latestImport: ownedImports(ctx, ctx.auth.userId)[0] ?? null
      };
    }),
    runtimeStatus: query((ctx) => ({
      ok: true,
      app: "lakebed-tour",
      authUserId: ctx.auth.userId,
      authDisplayName: ctx.auth.displayName,
      authProvider: ctx.auth.provider,
      mode: "lakebed"
    }))
  },

  mutations: {
    adminCreateProperty: mutation((ctx, input: PropertyInput): MutationResult<{ id: string }> => {
      if (!isAdmin(ctx)) {
        return mutationAuthError();
      }

      const prepared = prepareProperty(ctx, input, ctx.auth.userId);
      if (!prepared.ok || !prepared.data) {
        return { ok: false, errors: prepared.errors ?? [prepared.error ?? "Unable to create listing."] };
      }

      const row = ctx.db.properties.insert(prepared.data);
      return { ok: true, data: { id: row.id } };
    }),
    adminUpdateProperty: mutation((ctx, id: string, input: PropertyInput): MutationResult<{ id: string }> => {
      if (!isAdmin(ctx)) {
        return mutationAuthError();
      }

      const existing = ctx.db.properties.get(id) as unknown as PropertyRecord | null;
      if (!existing || !isOwnedBy(existing, ctx.auth.userId)) {
        return { ok: false, error: "Listing not found." };
      }

      const prepared = prepareProperty(ctx, input, ctx.auth.userId, existing);
      if (!prepared.ok || !prepared.data) {
        return { ok: false, errors: prepared.errors ?? [prepared.error ?? "Unable to update listing."] };
      }

      ctx.db.properties.update(id, prepared.data);
      return { ok: true, data: { id } };
    }),
    adminUpdatePropertyStatus: mutation((ctx, id: string, status: ListingStatus): MutationResult<{ id: string }> => {
      if (!isAdmin(ctx)) {
        return mutationAuthError();
      }

      const existing = ctx.db.properties.get(id) as unknown as PropertyRecord | null;
      if (!existing || !isOwnedBy(existing, ctx.auth.userId)) {
        return { ok: false, error: "Listing not found." };
      }

      const nextStatus = choiceOrDefault(status, listingStatuses, "draft");
      const issues = propertyQualityIssues({ ...existing, status: nextStatus }, nextStatus);
      if (issues.length) {
        return { ok: false, errors: issues };
      }

      ctx.db.properties.update(id, { status: nextStatus, updatedBy: ctx.auth.userId });
      return { ok: true, data: { id } };
    }),
    adminDeleteOrArchiveProperty: mutation((ctx, id: string): MutationResult<{ id: string }> => {
      if (!isAdmin(ctx)) {
        return mutationAuthError();
      }

      const existing = ctx.db.properties.get(id) as unknown as PropertyRecord | null;
      if (!existing || !isOwnedBy(existing, ctx.auth.userId)) {
        return { ok: false, error: "Listing not found." };
      }

      ctx.db.properties.update(id, { status: "archived", updatedBy: ctx.auth.userId });
      return { ok: true, data: { id } };
    }),
    adminUpsertPropertyMedia: mutation((ctx, propertyId: string, photoText: string): MutationResult<{ count: number }> => {
      if (!isAdmin(ctx)) {
        return mutationAuthError();
      }

      const property = ctx.db.properties.get(propertyId) as unknown as PropertyRecord | null;
      if (!property || !isOwnedBy(property, ctx.auth.userId)) {
        return { ok: false, error: "Listing not found." };
      }

      const errors = replacePropertyMedia(ctx, property, photoText);
      if (errors.length) {
        return { ok: false, errors };
      }

      const count = rowList<PropertyMediaRecord>(ctx.db.propertyMedia.all()).filter((item) => item.propertyId === propertyId).length;
      return { ok: true, data: { count } };
    }),
    createInquiry: mutation(
      (
        ctx,
        input: {
          propertyId: string;
          name: string;
          email: string;
          phone: string;
          preferredContactMethod: string;
          moveInTimeline: string;
          budget: string;
          message: string;
          sourcePage: string;
        }
      ): MutationResult<{ id: string; propertyTitle: string }> => {
        const property = findPropertyByIdOrSlug(ctx, input.propertyId);
        if (!property || property.status !== "published") {
          return { ok: false, error: "This listing is not currently available for inquiries." };
        }

        const inquiry = {
          propertyId: property.id,
          propertyTitle: property.title,
          name: cleanText(input.name, 120),
          email: cleanText(input.email, 180),
          phone: cleanText(input.phone, 80),
          preferredContactMethod: cleanText(input.preferredContactMethod || "email", 80),
          moveInTimeline: cleanText(input.moveInTimeline, 160),
          budget: cleanText(input.budget, 120),
          message: cleanLongText(input.message || `I am interested in ${property.title}.`, 4000),
          sourcePage: cleanText(input.sourcePage, 2000),
          status: "new" as LeadStatus,
          adminNotes: ""
        };

        const errors = publicInquiryErrors(inquiry);
        if (errors.length) {
          return { ok: false, errors };
        }

        const row = ctx.db.inquiries.insert(inquiry);
        return { ok: true, data: { id: row.id, propertyTitle: property.title } };
      }
    ),
    adminUpdateInquiry: mutation((ctx, id: string, patch: { status?: LeadStatus; adminNotes?: string }): MutationResult<{ id: string }> => {
      if (!isAdmin(ctx)) {
        return mutationAuthError();
      }

      const inquiry = ctx.db.inquiries.get(id) as unknown as InquiryRecord | null;
      if (!inquiry) {
        return { ok: false, error: "Inquiry not found." };
      }

      const property = ctx.db.properties.get(inquiry.propertyId) as unknown as PropertyRecord | null;
      if (!property || !isOwnedBy(property, ctx.auth.userId)) {
        return { ok: false, error: "Inquiry not found." };
      }

      const status = choiceOrDefault(patch.status ?? inquiry.status, leadStatuses, "new");
      ctx.db.inquiries.update(id, {
        status,
        adminNotes: cleanLongText(patch.adminNotes ?? inquiry.adminNotes, 4000)
      });

      return { ok: true, data: { id } };
    }),
    adminCreateFaq: mutation((ctx, input: { question: string; answer: string; keywords: string; active: boolean; sortOrder: string }): MutationResult<{ id: string }> => {
      if (!isAdmin(ctx)) {
        return mutationAuthError();
      }

      const question = cleanText(input.question, 300);
      const answer = cleanLongText(input.answer, 3000);
      if (!question || !answer) {
        return { ok: false, errors: ["Question and answer are required."] };
      }

      const row = ctx.db.faqs.insert({
        question,
        answer,
        keywords: joinMultiValue(splitMultiValue(input.keywords)),
        active: Boolean(input.active),
        sortOrder: cleanText(input.sortOrder || "0", 20),
        createdBy: ctx.auth.userId,
        updatedBy: ctx.auth.userId
      });

      return { ok: true, data: { id: row.id } };
    }),
    adminUpdateFaq: mutation((ctx, id: string, input: { question: string; answer: string; keywords: string; active: boolean; sortOrder: string }): MutationResult<{ id: string }> => {
      if (!isAdmin(ctx)) {
        return mutationAuthError();
      }

      const faq = ctx.db.faqs.get(id) as unknown as FaqRecord | null;
      if (!faq || !isOwnedBy(faq, ctx.auth.userId)) {
        return { ok: false, error: "FAQ not found." };
      }

      const question = cleanText(input.question, 300);
      const answer = cleanLongText(input.answer, 3000);
      if (!question || !answer) {
        return { ok: false, errors: ["Question and answer are required."] };
      }

      ctx.db.faqs.update(id, {
        question,
        answer,
        keywords: joinMultiValue(splitMultiValue(input.keywords)),
        active: Boolean(input.active),
        sortOrder: cleanText(input.sortOrder || "0", 20),
        updatedBy: ctx.auth.userId
      });

      return { ok: true, data: { id } };
    }),
    adminImportPropertiesFromCsv: mutation((ctx, csvText: string, mode: ImportMode, filename = "pasted-listings.csv"): MutationResult<{ created: number; updated: number; skipped: number; errors: string[] }> => {
      if (!isAdmin(ctx)) {
        return mutationAuthError();
      }

      const importMode = choiceOrDefault(mode, ["create", "update", "upsert"] as const, "upsert");
      const parsed = parseCsvText(csvText);
      const missingHeaders = csvHeaders.filter((header) => !parsed.headers.includes(header));
      const errors = [...parsed.errors, ...missingHeaders.map((header) => `Missing CSV column: ${header}`)];
      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (const [index, row] of parsed.rows.entries()) {
        const rowNumber = index + 2;
        const rowErrors = validateCsvRow(row, rowNumber);
        if (rowErrors.length) {
          errors.push(...rowErrors);
          skipped += 1;
          continue;
        }

        const input = propertyInputFromCsvRow(row);
        const slug = slugify(input.slug || input.title);
        const existing = ownedProperties(ctx, ctx.auth.userId).find((property) => property.slug === slug);

        if (existing && importMode === "create") {
          errors.push(`Row ${rowNumber}: listing with slug "${existing.slug}" already exists.`);
          skipped += 1;
          continue;
        }

        if (!existing && importMode === "update") {
          errors.push(`Row ${rowNumber}: no listing exists for slug "${slug}".`);
          skipped += 1;
          continue;
        }

        const prepared = prepareProperty(ctx, input, ctx.auth.userId, existing);
        if (!prepared.ok || !prepared.data) {
          errors.push(...(prepared.errors ?? [`Row ${rowNumber}: unable to import row.`]));
          skipped += 1;
          continue;
        }

        let property: PropertyRecord;
        if (existing) {
          ctx.db.properties.update(existing.id, prepared.data);
          property = { ...existing, ...prepared.data };
          updated += 1;
        } else {
          property = ctx.db.properties.insert(prepared.data) as unknown as PropertyRecord;
          created += 1;
        }

        const mediaErrors = replacePropertyMedia(ctx, property, splitMultiValue(row.photoUrls).join("\n"));
        if (mediaErrors.length) {
          errors.push(...mediaErrors.map((error) => `Row ${rowNumber}: ${error}`));
        }
      }

      ctx.db.csvImports.insert({
        filename: cleanText(filename, 240),
        uploadedBy: ctx.auth.userId,
        rowCount: String(parsed.rows.length),
        validCount: String(created + updated),
        errorCount: String(errors.length),
        status: errors.length ? "completed_with_errors" : "completed",
        errors: serializeErrors(errors)
      });

      return {
        ok: errors.length === 0,
        errors,
        data: {
          created,
          updated,
          skipped,
          errors
        }
      };
    }),
    adminSeedDemoData: mutation((ctx): MutationResult<{ properties: number; faqs: number }> => {
      if (!isAdmin(ctx)) {
        return mutationAuthError();
      }

      let propertyCount = 0;
      let faqCount = 0;
      const existingSlugs = new Set(properties(ctx).map((property) => property.slug));
      for (const demo of demoProperties) {
        if (!existingSlugs.has(demo.slug)) {
          const { id, createdAt, updatedAt, ...insertable } = demo;
          const row = ctx.db.properties.insert({ ...insertable, createdBy: ctx.auth.userId, updatedBy: ctx.auth.userId }) as unknown as PropertyRecord;
          replacePropertyMedia(ctx, row, demoMedia.filter((item) => item.propertyId === demo.id && item.url !== demo.primaryImageUrl).map((item) => `${item.url}|${item.altText}|${item.caption}`).join("\n"));
          propertyCount += 1;
        }
      }

      const existingQuestions = new Set(faqs(ctx).map((faq) => faq.question.toLowerCase()));
      for (const faq of defaultFaqs) {
        if (!existingQuestions.has(faq.question.toLowerCase())) {
          ctx.db.faqs.insert({
            question: faq.question,
            answer: faq.answer,
            keywords: faq.keywords,
            active: faq.active,
            sortOrder: faq.sortOrder,
            createdBy: ctx.auth.userId,
            updatedBy: ctx.auth.userId
          });
          faqCount += 1;
        }
      }

      return { ok: true, data: { properties: propertyCount, faqs: faqCount } };
    })
  },

  endpoints: {
    status: endpoint({ method: "GET", path: "/api/status" }, (ctx) =>
      json({
        ok: true,
        app: "lakebed-tour",
        authUserId: ctx.auth.userId,
        authDisplayName: ctx.auth.displayName,
        authProvider: ctx.auth.provider,
        mode: "lakebed"
      })
    ),
    csvTemplate: endpoint({ method: "GET", path: "/api/csv-template" }, () => text(csvTemplate))
  }
});
