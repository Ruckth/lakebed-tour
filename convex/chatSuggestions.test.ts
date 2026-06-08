// @vitest-environment edge-runtime

import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vitest";
import { api, internal } from "./_generated/api";
import { normalizeSuggestedQuestion } from "./lib/chatSuggestions";
import schema from "./schema";

declare global {
  interface ImportMeta {
    glob(pattern: string): Record<string, () => Promise<unknown>>;
  }
}

const modules = import.meta.glob("./**/*.ts");
const adminEmail = "admin@example.com";

async function finishScheduledWork(t: ReturnType<typeof convexTest>) {
  await t.finishAllScheduledFunctions(() => vi.runAllTimers());
}

function adminTest(t: ReturnType<typeof convexTest>) {
  return t.withIdentity({ email: adminEmail, tokenIdentifier: "admin-token" });
}

describe("chatSuggestions.nextForSession", () => {
  it("lets admins create, update, archive, restore, and delete curated questions", async () => {
    vi.stubEnv("ADMIN_EMAILS", adminEmail);
    try {
      const t = convexTest(schema, modules);
      const admin = adminTest(t);

      await expect(
        t.mutation(api.chatSuggestions.adminCreateCurated, {
          question: "Can I check availability?",
          topic: "availability",
          score: 150,
        }),
      ).rejects.toThrow("Not authenticated");

      const questionId = await admin.mutation(api.chatSuggestions.adminCreateCurated, {
        question: "Can I check availability?",
        translations: { th: "ตรวจสอบห้องว่างได้ไหม?" },
        topic: "availability",
        score: 150,
      });
      await expect(
        admin.mutation(api.chatSuggestions.adminCreateCurated, {
          question: "Is this place real?",
          answerMode: "static",
          topic: "villa_fit",
        }),
      ).rejects.toThrow("Answer is required");
      let rows = await admin.query(api.chatSuggestions.adminListCurated, { status: "active" });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        question: "Can I check availability?",
        score: 100,
        status: "active",
        createdByAdminEmail: adminEmail,
      });

      await admin.mutation(api.chatSuggestions.adminUpdateCurated, {
        questionId,
        question: "Can I check availability for my dates?",
        translations: { th: "ตรวจสอบห้องว่างสำหรับวันที่ของฉันได้ไหม?" },
        topic: "not-real",
        score: -12,
        propertySlug: "pool-villa",
      });
      rows = await admin.query(api.chatSuggestions.adminListCurated, { status: "active" });
      expect(rows[0]).toMatchObject({
        question: "Can I check availability for my dates?",
        topic: "villa_fit",
        score: 0,
        propertySlug: "pool-villa",
      });

      await admin.mutation(api.chatSuggestions.adminArchiveCurated, { questionId });
      rows = await admin.query(api.chatSuggestions.adminListCurated, { status: "archived" });
      expect(rows[0]?.status).toBe("archived");

      await admin.mutation(api.chatSuggestions.adminRestoreCurated, { questionId });
      rows = await admin.query(api.chatSuggestions.adminListCurated, { status: "active" });
      expect(rows[0]?.status).toBe("active");

      await expect(
        admin.mutation(api.chatSuggestions.adminDeleteArchivedCurated, { questionId }),
      ).rejects.toThrow("Archive the question");

      await admin.mutation(api.chatSuggestions.adminArchiveCurated, { questionId });
      await admin.mutation(api.chatSuggestions.adminDeleteArchivedCurated, { questionId });
      rows = await admin.query(api.chatSuggestions.adminListCurated, { status: "all" });
      expect(rows).toEqual([]);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("returns localized static answers and dynamic intent metadata for curated questions", async () => {
    vi.stubEnv("ADMIN_EMAILS", adminEmail);
    try {
      const t = convexTest(schema, modules);
      const admin = adminTest(t);
      await admin.mutation(api.chatSuggestions.adminCreateCurated, {
        question: "Is this place real?",
        translations: { th: "ที่พักนี้มีอยู่จริงไหม?" },
        answer: "Yes. This is a real villa managed by our concierge team.",
        answerTranslations: {
          th: "ใช่ ที่พักนี้มีอยู่จริงและดูแลโดยทีมคอนเซียร์จของเรา",
        },
        answerMode: "static",
        topic: "villa_fit",
        score: 99,
      });
      await admin.mutation(api.chatSuggestions.adminCreateCurated, {
        question: "What is the direct booking price?",
        answerMode: "dynamic",
        dynamicIntent: "pricing",
        topic: "direct_booking",
        score: 98,
      });

      const now = 1_700_000_000_000;
      const sessionId = await t.run(async (ctx) => {
        return await ctx.db.insert("chatSessions", {
          channel: "web",
          visitorId: "visitor-static-answer",
          lastSeenAt: now,
          createdAt: now,
        });
      });

      const selected = await t.query(api.chatSuggestions.nextForSession, {
        sessionId,
        locale: "th",
        limit: 5,
      });

      expect(selected[0]).toMatchObject({
        question: "ที่พักนี้มีอยู่จริงไหม?",
        answer: "ใช่ ที่พักนี้มีอยู่จริงและดูแลโดยทีมคอนเซียร์จของเรา",
        answerMode: "static",
        source: "curated",
      });
      expect(selected[1]).toMatchObject({
        question: "What is the direct booking price?",
        answerMode: "dynamic",
        dynamicIntent: "pricing",
        source: "curated",
      });
      expect(selected[1]).not.toHaveProperty("answer");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("translates question bank drafts through the admin action", async () => {
    vi.stubEnv("ADMIN_EMAILS", adminEmail);
    vi.stubEnv("AI_API_KEY", "test-key");
    vi.stubEnv("AI_API_BASE_URL", "https://ai.example.test/v1");
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  questionTranslations: {
                    th: "ที่พักนี้มีอยู่จริงไหม?",
                    de: "Ist dieser Ort echt?",
                  },
                  answerTranslations: {
                    th: "ใช่ ที่พักนี้มีอยู่จริง",
                    de: "Ja. Diese Villa ist echt.",
                  },
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    try {
      const t = convexTest(schema, modules);
      const admin = adminTest(t);
      const translated = await admin.action(api.chatSuggestions.adminTranslateCuratedDraft, {
        question: "Is this place real?",
        answer: "Yes. This villa is real.",
        targetLocales: ["th", "de"],
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://ai.example.test/v1/chat/completions",
        expect.objectContaining({ method: "POST" }),
      );
      expect(translated).toEqual({
        questionTranslations: {
          th: "ที่พักนี้มีอยู่จริงไหม?",
          de: "Ist dieser Ort echt?",
        },
        answerTranslations: {
          th: "ใช่ ที่พักนี้มีอยู่จริง",
          de: "Ja. Diese Villa ist echt.",
        },
      });
    } finally {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }
  });

  it("merges active curated questions into public ranked suggestions", async () => {
    vi.stubEnv("ADMIN_EMAILS", adminEmail);
    try {
      const t = convexTest(schema, modules);
      const admin = adminTest(t);
      await admin.mutation(api.chatSuggestions.adminCreateCurated, {
        question: "Can I check availability for my dates?",
        translations: { th: "ตรวจสอบห้องว่างสำหรับวันที่ของฉันได้ไหม?" },
        topic: "availability",
        score: 99,
      });
      await admin.mutation(api.chatSuggestions.adminCreateCurated, {
        question: "Can I tour the Pool Villa before booking?",
        topic: "tour",
        score: 98,
        propertySlug: "pool-villa",
      });
      await admin.mutation(api.chatSuggestions.adminCreateCurated, {
        question: "Should not show for this property?",
        topic: "villa_fit",
        score: 100,
        propertySlug: "garden-villa",
      });

      const now = 1_700_000_000_000;
      const sessionId = await t.run(async (ctx) => {
        return await ctx.db.insert("chatSessions", {
          channel: "web",
          visitorId: "visitor-curated",
          propertySlug: "pool-villa",
          lastSeenAt: now,
          createdAt: now,
        });
      });

      const selected = await t.query(api.chatSuggestions.nextForSession, {
        sessionId,
        locale: "th",
        limit: 5,
      });

      expect(selected.map((question) => question.question)).toEqual([
        "ตรวจสอบห้องว่างสำหรับวันที่ของฉันได้ไหม?",
        "Can I tour the Pool Villa before booking?",
      ]);
      expect(selected.map((question) => question.source)).toEqual(["curated", "curated"]);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("tracks curated clicks per session without archiving the global question", async () => {
    vi.stubEnv("ADMIN_EMAILS", adminEmail);
    try {
      const t = convexTest(schema, modules);
      const admin = adminTest(t);
      const questionId = await admin.mutation(api.chatSuggestions.adminCreateCurated, {
        question: "Can I check availability for my dates?",
        topic: "availability",
        score: 99,
      });
      const now = 1_700_000_000_000;
      const [firstSessionId, secondSessionId] = await t.run(async (ctx) => {
        const first = await ctx.db.insert("chatSessions", {
          channel: "web",
          visitorId: "visitor-one",
          lastSeenAt: now,
          createdAt: now,
        });
        const second = await ctx.db.insert("chatSessions", {
          channel: "web",
          visitorId: "visitor-two",
          lastSeenAt: now,
          createdAt: now,
        });
        return [first, second];
      });

      await t.mutation(api.chatSuggestions.markClicked, {
        sessionId: firstSessionId,
        suggestion: { source: "curated", suggestionId: questionId },
      });

      const firstSelected = await t.query(api.chatSuggestions.nextForSession, {
        sessionId: firstSessionId,
        limit: 5,
      });
      const secondSelected = await t.query(api.chatSuggestions.nextForSession, {
        sessionId: secondSessionId,
        limit: 5,
      });
      const rows = await admin.query(api.chatSuggestions.adminListCurated, { status: "active" });

      expect(firstSelected.map((question) => question.question)).toEqual([]);
      expect(secondSelected.map((question) => question.question)).toEqual([
        "Can I check availability for my dates?",
      ]);
      expect(rows[0]?.status).toBe("active");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("excludes previously asked questions and returns the top two scores", async () => {
    const t = convexTest(schema, modules);
    const now = 1_700_000_000_000;
    const sessionId = await t.run(async (ctx) => {
      const session = await ctx.db.insert("chatSessions", {
        channel: "web",
        visitorId: "visitor-test",
        lastSeenAt: now,
        createdAt: now,
      });
      await ctx.db.insert("chatMessages", {
        sessionId: session,
        role: "user",
        content: "What's included when booking direct?",
        timestamp: now + 1,
      });
      const assistantMessage = await ctx.db.insert("chatMessages", {
        sessionId: session,
        role: "assistant",
        content: "Direct booking includes host support and better pricing.",
        timestamp: now + 2,
      });

      const lowScoreCandidates = Array.from({ length: 105 }, (_, index) => ({
        question: `Low priority question ${index + 1}?`,
        score: 10,
      }));
      const candidates = [
        ...lowScoreCandidates,
        { question: "What is included when booking direct?", score: 100 },
        { question: "Can I check availability for my dates?", score: 95 },
        { question: "Which villa fits my group best?", score: 87 },
        { question: "Can I see the villa in 360?", score: 76 },
      ];

      for (const candidate of candidates) {
        await ctx.db.insert("chatSuggestedQuestions", {
          sessionId: session,
          assistantMessageId: assistantMessage,
          question: candidate.question,
          normalizedQuestion: normalizeSuggestedQuestion(candidate.question),
          locale: "en",
          topic: "availability",
          score: candidate.score,
          status: "active",
          createdAt: now + candidate.score,
        });
      }

      return session;
    });

    const selected = await t.query(api.chatSuggestions.nextForSession, {
      sessionId,
      limit: 2,
    });

    expect(selected.map((question) => question.question)).toEqual([
      "Can I check availability for my dates?",
      "Which villa fits my group best?",
    ]);
  });

  it("returns the requested locale question when translations exist", async () => {
    const t = convexTest(schema, modules);
    const now = 1_700_000_000_000;
    const sessionId = await t.run(async (ctx) => {
      const session = await ctx.db.insert("chatSessions", {
        channel: "web",
        visitorId: "visitor-locale",
        lastSeenAt: now,
        createdAt: now,
      });
      const assistantMessage = await ctx.db.insert("chatMessages", {
        sessionId: session,
        role: "assistant",
        content: "Direct booking includes better pricing.",
        timestamp: now + 1,
      });

      await ctx.db.insert("chatSuggestedQuestions", {
        sessionId: session,
        assistantMessageId: assistantMessage,
        question: "Can I check availability for my dates?",
        normalizedQuestion: normalizeSuggestedQuestion("Can I check availability for my dates?"),
        translations: {
          en: "Wrong English should not override the canonical question",
          th: "ตรวจสอบห้องว่างสำหรับวันที่ของฉันได้ไหม?",
        },
        locale: "en",
        topic: "availability",
        score: 95,
        status: "active",
        createdAt: now + 2,
      });

      return session;
    });

    const selected = await t.query(api.chatSuggestions.nextForSession, {
      sessionId,
      locale: "th",
      limit: 1,
    });

    expect(selected.map((question) => question.question)).toEqual([
      "ตรวจสอบห้องว่างสำหรับวันที่ของฉันได้ไหม?",
    ]);

    const englishSelected = await t.query(api.chatSuggestions.nextForSession, {
      sessionId,
      locale: "en",
      limit: 1,
    });

    expect(englishSelected.map((question) => question.question)).toEqual([
      "Can I check availability for my dates?",
    ]);
  });

  it("blocks repeats across translated variants and falls back for older rows", async () => {
    const t = convexTest(schema, modules);
    const now = 1_700_000_000_000;
    const sessionId = await t.run(async (ctx) => {
      const session = await ctx.db.insert("chatSessions", {
        channel: "web",
        visitorId: "visitor-repeat",
        lastSeenAt: now,
        createdAt: now,
      });
      await ctx.db.insert("chatMessages", {
        sessionId: session,
        role: "user",
        content: "ตรวจสอบห้องว่างสำหรับวันที่ของฉันได้ไหม?",
        timestamp: now + 1,
      });
      const assistantMessage = await ctx.db.insert("chatMessages", {
        sessionId: session,
        role: "assistant",
        content: "Use the booking card to choose dates.",
        timestamp: now + 2,
      });

      await ctx.db.insert("chatSuggestedQuestions", {
        sessionId: session,
        assistantMessageId: assistantMessage,
        question: "Can I check availability for my dates?",
        normalizedQuestion: normalizeSuggestedQuestion("Can I check availability for my dates?"),
        translations: {
          en: "Can I check availability for my dates?",
          th: "ตรวจสอบห้องว่างสำหรับวันที่ของฉันได้ไหม?",
        },
        locale: "en",
        topic: "availability",
        score: 99,
        status: "active",
        createdAt: now + 3,
      });
      await ctx.db.insert("chatSuggestedQuestions", {
        sessionId: session,
        assistantMessageId: assistantMessage,
        question: "Which villa fits my group best?",
        normalizedQuestion: normalizeSuggestedQuestion("Which villa fits my group best?"),
        locale: "en",
        topic: "villa_fit",
        score: 80,
        status: "active",
        createdAt: now + 4,
      });

      return session;
    });

    const selected = await t.query(api.chatSuggestions.nextForSession, {
      sessionId,
      locale: "th",
      limit: 2,
    });

    expect(selected.map((question) => question.question)).toEqual([
      "Which villa fits my group best?",
    ]);
  });

  it("does not generate ranked suggestions from public assistant messages", async () => {
    vi.useFakeTimers();
    try {
      const t = convexTest(schema, modules);
      const sessionId = await t.mutation(api.chat.createSession, {
        channel: "web",
        visitorId: "visitor-public-assistant",
      });
      const userMessageId = await t.mutation(api.chat.addMessage, {
        sessionId,
        role: "user",
        content: "What's included when booking direct?",
      });
      expect(userMessageId).toBeTruthy();

      await t.mutation(api.chat.addMessage, {
        sessionId,
        role: "assistant",
        content: "Direct booking includes host support and better pricing.",
      });
      await finishScheduledWork(t);

      const selected = await t.query(api.chatSuggestions.nextForSession, {
        sessionId,
        limit: 5,
      });
      expect(selected).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("generates ranked suggestions from trusted internal assistant messages", async () => {
    vi.useFakeTimers();
    vi.stubEnv("AI_API_KEY", "");
    try {
      const t = convexTest(schema, modules);
      const sessionId = await t.mutation(api.chat.createSession, {
        channel: "web",
        visitorId: "visitor-internal-assistant",
      });
      const userMessageId = await t.mutation(api.chat.addMessage, {
        sessionId,
        role: "user",
        content: "What's included when booking direct?",
      });

      await t.mutation(internal.chat.addAssistantMessageWithSuggestions, {
        sessionId,
        content: "Direct booking includes host support and better pricing.",
        locale: "en",
        replyToMessageId: userMessageId,
      });
      await finishScheduledWork(t);

      const selected = await t.query(api.chatSuggestions.nextForSession, {
        sessionId,
        limit: 2,
      });
      expect(selected.map((question) => question.question)).toEqual([
        "Can I check availability for my dates?",
        "Can I message the host on WhatsApp?",
      ]);
    } finally {
      vi.unstubAllEnvs();
      vi.useRealTimers();
    }
  });
});
