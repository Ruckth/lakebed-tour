import { describe, expect, it } from "vitest";
import { locales, type Locale } from "@/i18n/routing";
import {
  detectQuickAnswerLocale,
  localizedTimeoutFallbackReply,
  localizedUnknownFallbackReply,
  resolveLineQuickAnswer,
  type LinePropertySummary,
} from "@/lib/line/quick-answers";

const properties: LinePropertySummary[] = [
  {
    slug: "pool-villa",
    name: "Pool Villa",
    tagline: "Private pool retreat",
    pricePerNight: 12000,
    currency: "THB",
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 2,
    area: 140,
    amenities: ["Private pool", "Kitchen"],
    directDiscountPercent: 15,
  },
];

describe("LINE quick answers", () => {
  it("resolves hardcoded exact quick answers before question-bank fallback would run", () => {
    const answer = resolveLineQuickAnswer({
      eventType: "message",
      messageText: "See prices",
      properties,
      siteUrl: "https://tour.helpgueststay.com",
    });

    expect(answer).toMatchObject({
      mode: "exact",
      intent: "pricing",
    });
    expect(answer?.text).toContain("Current direct booking prices");
  });

  it("answers Thai exact quick answers in Thai", () => {
    const answer = resolveLineQuickAnswer({
      eventType: "message",
      messageText: "ราคาเท่าไหร่",
      properties,
      siteUrl: "https://tour.helpgueststay.com",
    });

    expect(answer).toMatchObject({
      mode: "exact",
      intent: "pricing",
    });
    expect(answer?.text).toContain("ราคาจองตรงตอนนี้");
    expect(answer?.text).toContain("฿12,000/คืน");
    expect(answer?.text).toContain("จองตรง ฿10,200");
  });

  it("answers pricing exact quick answers in every supported locale", () => {
    const pricingScenarios = [
      { locale: "en", question: "See prices", fragment: "Current direct booking prices" },
      { locale: "th", question: "ราคาเท่าไหร่", fragment: "ราคาจองตรงตอนนี้" },
      { locale: "zh-CN", question: "价格是多少", fragment: "当前直接预订价格" },
      { locale: "ja", question: "料金はいくらですか", fragment: "現在の直接予約料金" },
      { locale: "ko", question: "가격이 얼마인가요", fragment: "현재 직접 예약 가격" },
      { locale: "fr", question: "Quel est le prix", fragment: "Prix actuels en reservation directe" },
      { locale: "de", question: "Wie viel kostet es", fragment: "Aktuelle Direktbuchungspreise" },
      { locale: "es", question: "Cuanto cuesta", fragment: "Precios actuales de reserva directa" },
      { locale: "ru", question: "Сколько стоит", fragment: "Текущие цены" },
      { locale: "it", question: "Quanto costa", fragment: "Prezzi attuali" },
      { locale: "hi", question: "कीमत कितनी है", fragment: "मौजूदा सीधी बुकिंग कीमतें" },
    ] satisfies Array<{ locale: Locale; question: string; fragment: string }>;

    expect(pricingScenarios.map((scenario) => scenario.locale).sort()).toEqual([...locales].sort());

    for (const scenario of pricingScenarios) {
      const answer = resolveLineQuickAnswer({
        eventType: "message",
        messageText: scenario.question,
        properties,
        siteUrl: "https://tour.helpgueststay.com",
      });

      expect(answer, scenario.locale).toMatchObject({
        mode: "exact",
        intent: "pricing",
      });
      expect(answer?.text, scenario.locale).toContain(scenario.fragment);
      expect(answer?.text, scenario.locale).toContain("฿12,000");
      expect(answer?.text, scenario.locale).toContain("฿10,200");
      expect(detectQuickAnswerLocale(scenario.question), scenario.locale).toBe(scenario.locale);
    }
  });

  it("keeps localized postback payloads and replies", () => {
    const answer = resolveLineQuickAnswer({
      eventType: "postback",
      postbackData: "intent=pricing&locale=ja",
      properties,
      siteUrl: "https://tour.helpgueststay.com",
    });

    expect(answer).toMatchObject({
      mode: "postback",
      intent: "pricing",
    });
    expect(answer?.text).toContain("現在の直接予約料金");
    expect(answer?.quickReplyItems[0]?.action.data).toContain("locale=ja");
    expect(answer?.quickReplyItems[0]?.action.label).toBe("日程を確認");
  });

  it("localizes timeout and unknown fallbacks", () => {
    expect(localizedUnknownFallbackReply("fr")).toContain("pas encore totalement certain");
    expect(localizedTimeoutFallbackReply("ja")).toContain("確認中");
    expect(localizedUnknownFallbackReply("not-supported")).toContain("I'm not fully sure");
  });
});
