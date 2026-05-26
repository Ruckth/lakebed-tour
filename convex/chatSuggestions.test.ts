// @vitest-environment edge-runtime

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { normalizeSuggestedQuestion } from "./lib/chatSuggestions";
import schema from "./schema";

declare global {
  interface ImportMeta {
    glob(pattern: string): Record<string, () => Promise<unknown>>;
  }
}

const modules = import.meta.glob("./**/*.ts");

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
});
