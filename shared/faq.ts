import type { FaqRecord, PropertyRecord } from "./domain";
import { cleanText, formatMoney, splitMultiValue } from "./property";

export const initialFaqAnswer = "Ask a suggested question or type your own. Answers are limited to listing details and approved FAQ content.";

export const suggestedFaqQuestions = [
  "Is this property still available?",
  "How can I schedule a viewing?",
  "What is the rent?",
  "Is there a floor plan?",
  "Can I see the location?",
  "How do I contact the agency?"
];

export function matchFaq(question: string, faqs: FaqRecord[]): FaqRecord | null {
  const cleanQuestion = cleanText(question, 500).toLowerCase();
  if (!cleanQuestion) {
    return null;
  }

  return (
    [...faqs]
      .filter((faq) => faq.active)
      .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0))
      .find((faq) => {
        const faqQuestion = cleanText(faq.question).toLowerCase();
        if (faqQuestion === cleanQuestion || faqQuestion.includes(cleanQuestion) || cleanQuestion.includes(faqQuestion)) {
          return true;
        }

        return splitMultiValue(faq.keywords).some((keyword) => {
          const cleanKeyword = keyword.toLowerCase();
          return cleanKeyword && cleanQuestion.includes(cleanKeyword);
        });
      }) ?? null
  );
}

export function answerPropertyQuestion(value: string, property: PropertyRecord, faqs: FaqRecord[]): string {
  const cleanQuestion = cleanText(value, 300);
  const normalized = cleanQuestion.toLowerCase();
  if (!cleanQuestion) {
    return "";
  }

  if (normalized.includes("rent") || normalized.includes("price") || normalized.includes("cost")) {
    return `${property.title} is listed at ${formatMoney(property.price, property.currency)}${property.transactionMode === "rent" ? " per month" : ""}. Please confirm pricing with the agency.`;
  }

  if (normalized.includes("available") || normalized.includes("availability")) {
    return `${property.title}: ${property.availabilityText || "availability should be confirmed with the agency"}.`;
  }

  if (normalized.includes("floor")) {
    return property.floorPlanUrl
      ? "A public floor plan link is available in the listing details."
      : "No public floor plan is currently listed. Send an inquiry and the agency can confirm whether one is available.";
  }

  if (normalized.includes("video") || normalized.includes("youtube")) {
    return property.youtubeUrl ? "A video section is available on this property page." : "No video is currently listed for this property.";
  }

  if (normalized.includes("map") || normalized.includes("location") || normalized.includes("address")) {
    return property.googleMapsUrl ? "Use the Google Maps link in the listing details for the public location reference." : "No map link is currently listed. The agency can confirm location details.";
  }

  const faq = matchFaq(cleanQuestion, faqs);
  return faq ? faq.answer : "I do not have an approved answer for that. Send an inquiry and the agency can confirm the details directly.";
}
