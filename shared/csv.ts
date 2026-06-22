import { listingStatuses, propertyTypes, transactionModes, type ListingStatus, type PropertyInput } from "./domain";
import { choiceOrDefault, cleanLongText, cleanText, isHttpUrl, isYouTubeUrl, parseAmount, propertyQualityIssues, splitMultiValue } from "./property";

export type CsvRow = Record<string, string>;

export type ParsedCsv = {
  headers: string[];
  rows: CsvRow[];
  errors: string[];
};

export const csvHeaders = [
  "slug",
  "title",
  "transactionMode",
  "propertyType",
  "status",
  "price",
  "currency",
  "deposit",
  "feesText",
  "bedrooms",
  "bathrooms",
  "areaSize",
  "areaUnit",
  "addressDisplay",
  "city",
  "district",
  "provinceOrState",
  "country",
  "googleMapsUrl",
  "availabilityText",
  "availableFrom",
  "amenities",
  "description",
  "primaryImageUrl",
  "photoUrls",
  "floorPlanUrl",
  "youtubeUrl",
  "contactName",
  "contactPhone",
  "contactWhatsappPhone",
  "contactLineUrl",
  "contactInstagramUrl"
];

export const csvTemplate = `${csvHeaders.join(",")}
riverfront-loft,Riverfront Loft,rent,condo,published,2400,USD,2400,Pet fee may apply,2,2,1140,sqft,"201 River Walk, Austin, TX",Austin,Downtown,Texas,United States,https://www.google.com/maps/search/?api=1&query=Austin+River+Walk,Available now,2026-07-01,"parking|gym|balcony","Bright condo with river views and walkable dining.",https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80,"https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=1200&q=80|https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?auto=format&fit=crop&w=1200&q=80",https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf,https://www.youtube.com/watch?v=ysz5S6PUM-U,Maya Chen,+15125550119,+15125550119,https://line.me/R/ti/p/@openhouse,https://ig.me/m/openhousedesk`;

export function propertyInputFromCsvRow(row: Record<string, string>): PropertyInput {
  return {
    slug: row.slug,
    title: row.title,
    transactionMode: row.transactionMode,
    propertyType: row.propertyType,
    status: row.status,
    price: row.price,
    currency: row.currency,
    deposit: row.deposit,
    feesText: row.feesText,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    areaSize: row.areaSize,
    areaUnit: row.areaUnit,
    addressDisplay: row.addressDisplay,
    city: row.city,
    district: row.district,
    provinceOrState: row.provinceOrState,
    country: row.country,
    googleMapsUrl: row.googleMapsUrl,
    availabilityText: row.availabilityText,
    availableFrom: row.availableFrom,
    amenities: row.amenities,
    description: row.description,
    primaryImageUrl: row.primaryImageUrl,
    floorPlanUrl: row.floorPlanUrl,
    youtubeUrl: row.youtubeUrl,
    contactName: row.contactName,
    contactPhone: row.contactPhone,
    contactWhatsappPhone: row.contactWhatsappPhone,
    contactLineUrl: row.contactLineUrl,
    contactInstagramUrl: row.contactInstagramUrl
  };
}

export function validateCsvRow(row: Record<string, string>, rowNumber: number): string[] {
  const errors: string[] = [];
  const input = propertyInputFromCsvRow(row);
  const rawStatus = cleanText(row.status);
  const status = choiceOrDefault(rawStatus, listingStatuses, "draft");

  if (rawStatus && !listingStatuses.includes(rawStatus as ListingStatus)) {
    errors.push(`Row ${rowNumber}: status must be one of ${listingStatuses.join(", ")}.`);
  }

  if (!transactionModes.includes(String(row.transactionMode) as never)) {
    errors.push(`Row ${rowNumber}: transactionMode must be rent or sale.`);
  }

  if (!propertyTypes.includes(String(row.propertyType) as never)) {
    errors.push(`Row ${rowNumber}: propertyType is not supported.`);
  }

  if (cleanText(row.price) && parseAmount(row.price) === null) {
    errors.push(`Row ${rowNumber}: price must be a number.`);
  }

  if (cleanText(row.deposit) && parseAmount(row.deposit) === null) {
    errors.push(`Row ${rowNumber}: deposit must be a number.`);
  }

  if (!isHttpUrl(row.googleMapsUrl)) {
    errors.push(`Row ${rowNumber}: googleMapsUrl must be a URL.`);
  }

  if (!isHttpUrl(row.primaryImageUrl)) {
    errors.push(`Row ${rowNumber}: primaryImageUrl must be a URL.`);
  }

  if (!isHttpUrl(row.floorPlanUrl)) {
    errors.push(`Row ${rowNumber}: floorPlanUrl must be a URL.`);
  }

  if (!isYouTubeUrl(row.youtubeUrl)) {
    errors.push(`Row ${rowNumber}: youtubeUrl must be a YouTube URL.`);
  }

  if (!isHttpUrl(row.contactLineUrl)) {
    errors.push(`Row ${rowNumber}: contactLineUrl must be a URL.`);
  }

  if (!isHttpUrl(row.contactInstagramUrl)) {
    errors.push(`Row ${rowNumber}: contactInstagramUrl must be a URL.`);
  }

  for (const url of splitMultiValue(row.photoUrls)) {
    if (!isHttpUrl(url)) {
      errors.push(`Row ${rowNumber}: photoUrls contains an invalid URL.`);
    }
  }

  for (const issue of propertyQualityIssues(input, status)) {
    errors.push(`Row ${rowNumber}: ${issue}`);
  }

  return errors;
}

export function parseCsvText(text: string): ParsedCsv {
  const source = cleanLongText(text, 500000);
  const rows: string[][] = [];
  const errors: string[] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        cell += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if (char === "\n" && !inQuotes) {
      row.push(cell.trim());
      cell = "";
      if (row.some(Boolean)) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    cell += char;
  }

  if (inQuotes) {
    errors.push("CSV has an unclosed quoted value.");
  }

  row.push(cell.trim());
  if (row.some(Boolean)) {
    rows.push(row);
  }

  const headers = rows[0]?.map((header) => cleanText(header, 80)) ?? [];
  if (!headers.length) {
    return { headers: [], rows: [], errors: ["CSV needs a header row."] };
  }

  const records = rows.slice(1).map((values, rowIndex) => {
    const record: CsvRow = {};
    for (const [headerIndex, header] of headers.entries()) {
      record[header] = values[headerIndex] ?? "";
    }
    if (values.length > headers.length) {
      errors.push(`Row ${rowIndex + 2} has more values than headers.`);
    }
    return record;
  });

  return { headers, rows: records, errors };
}
