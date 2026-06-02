import {
  extractChatBookingContext,
  inferChatPropertySlug,
  type ChatBookingContext,
} from "@/lib/chat/booking-intent";
import type { ChatSuggestionId } from "@/lib/chat/suggestions";

export type ChatActionCard =
  | { type: "booking"; context: ChatBookingContext }
  | { type: "tour"; propertySlug?: string }
  | { type: "none" };

type ChatActionInput = {
  latestUserMessage?: string;
  latestAssistantMessage?: string;
  activePropertySlug?: string;
  clickedSuggestionId?: ChatSuggestionId | null;
};

const TOUR_INTENT_PATTERNS = [
  /\b360(?:°)?\b/i,
  /\b(?:virtual|villa|room)\s+(?:tour|view)\b/i,
  /\b(?:tour|explore)\b.{0,24}\b(?:villa|room|360)\b/i,
  /\b(?:see|view|open|explore)\b.{0,36}\b(?:villa|room|detail|tour)\b/i,
  /(?:ดู|ชม).{0,24}(?:วิลล่า|360|ทัวร์)/iu,
  /(?:วิลล่า).{0,24}(?:360|ทัวร์|ดู|ชม)/iu,
];

export function hasChatTourIntent(text: string) {
  return TOUR_INTENT_PATTERNS.some((pattern) => pattern.test(text));
}

export function getChatActionCard({
  latestUserMessage = "",
  latestAssistantMessage = "",
  activePropertySlug,
  clickedSuggestionId,
}: ChatActionInput): ChatActionCard {
  const combined = `${latestUserMessage}\n${latestAssistantMessage}`;

  if (clickedSuggestionId === "tour" || hasChatTourIntent(combined)) {
    return {
      type: "tour",
      propertySlug: inferChatPropertySlug(combined, activePropertySlug),
    };
  }

  const context = extractChatBookingContext({
    latestUserMessage,
    latestAssistantMessage,
    activePropertySlug,
  });

  return context.hasBookingIntent ? { type: "booking", context } : { type: "none" };
}
