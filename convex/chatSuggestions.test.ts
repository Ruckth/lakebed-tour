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

async function finishScheduledWork(t: ReturnType<typeof convexTest>) {
  await t.finishAllScheduledFunctions(() => vi.runAllTimers());
}

describe("chatSuggestions.nextForSession", () => {
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
