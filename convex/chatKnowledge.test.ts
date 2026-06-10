// @vitest-environment edge-runtime

import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

declare global {
  interface ImportMeta {
    glob(pattern: string): Record<string, () => Promise<unknown>>;
  }
}

const modules = import.meta.glob("./**/*.ts");
const adminEmail = "admin@example.com";

function adminTest(t: ReturnType<typeof convexTest>) {
  return t.withIdentity({ email: adminEmail, tokenIdentifier: "admin-token" });
}

async function createProperty(t: ReturnType<typeof convexTest>, slug = "pool-villa") {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("properties", {
      slug,
      name: slug === "pool-villa" ? "Pool Villa" : "Garden Villa",
      tagline: "Private stay",
      description: "A private villa for testing.",
      pricePerNight: 8500,
      currency: "THB",
      maxGuests: 4,
      bedrooms: 2,
      bathrooms: 2,
      area: 180,
      images: [],
      amenities: ["Private Pool", "WiFi"],
      tourRoomIds: [],
      directDiscountPercent: 15,
      status: "active",
    });
  });
}

async function createWebSession(
  t: ReturnType<typeof convexTest>,
  args: { propertyId?: string; propertySlug?: string } = {},
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("chatSessions", {
      propertyId: args.propertyId as never,
      propertySlug: args.propertySlug,
      channel: "web",
      visitorId: `web-test-${Date.now()}-${Math.random()}`,
      currentPath: args.propertySlug ? `/rooms/${args.propertySlug}` : "/",
      lastSeenAt: 1_700_000_000_000,
      createdAt: 1_700_000_000_000,
    });
  });
}

describe("chatKnowledge approved exact matching", () => {
  it("normalizes exact questions and prefers property-specific answers", async () => {
    vi.stubEnv("ADMIN_EMAILS", adminEmail);
    try {
      const t = convexTest(schema, modules);
      const admin = adminTest(t);
      const propertyId = await createProperty(t, "pool-villa");

      await admin.mutation(api.chatKnowledge.adminCreateAnswer, {
        title: "Global smoking policy",
        answer: "Smoking is allowed only in the designated outdoor area.",
        primaryQuestion: "Can I smoke on the balcony?",
        topicNames: ["house_rules"],
      });
      await admin.mutation(api.chatKnowledge.adminCreateAnswer, {
        propertySlug: "pool-villa",
        title: "Pool villa smoking policy",
        answer: "At Pool Villa, smoking is only allowed beside the garden gate.",
        primaryQuestion: "Can I smoke on the balcony?",
        topicNames: ["house_rules"],
      });

      const propertySessionId = await createWebSession(t, {
        propertyId,
        propertySlug: "pool-villa",
      });
      const globalSessionId = await createWebSession(t);

      const propertyMatch = await t.query(api.chatKnowledge.resolveExact, {
        sessionId: propertySessionId,
        messageText: " CAN I smoke on the balcony?! ",
      });
      const globalMatch = await t.query(api.chatKnowledge.resolveExact, {
        sessionId: globalSessionId,
        messageText: "can i smoke on the balcony",
      });

      expect(propertyMatch).toMatchObject({
        source: "approved_exact",
        answer: "At Pool Villa, smoking is only allowed beside the garden gate.",
      });
      expect(globalMatch).toMatchObject({
        source: "approved_exact",
        answer: "Smoking is allowed only in the designated outdoor area.",
      });
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("excludes draft and archived answers from exact replies", async () => {
    vi.stubEnv("ADMIN_EMAILS", adminEmail);
    try {
      const t = convexTest(schema, modules);
      const admin = adminTest(t);
      const draftAnswerId = await admin.mutation(api.chatKnowledge.adminCreateAnswer, {
        title: "Draft pets policy",
        answer: "Pets are approved in this draft.",
        status: "draft",
        primaryQuestion: "Can I bring my dog?",
      });
      await admin.mutation(api.chatKnowledge.adminUpdateAnswer, {
        answerId: draftAnswerId,
        title: "Archived pets policy",
        answer: "Pets are approved in this archived answer.",
        status: "archived",
        topicNames: [],
      });
      const sessionId = await createWebSession(t);

      const match = await t.query(api.chatKnowledge.resolveExact, {
        sessionId,
        messageText: "Can I bring my dog?",
      });

      expect(match).toBeNull();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("chatKnowledge unknown-question loop", () => {
  it("records unknown questions and returns the safe fallback from chatAi.respond", async () => {
    vi.stubEnv("ADMIN_EMAILS", adminEmail);
    try {
      const t = convexTest(schema, modules);
      const admin = adminTest(t);
      const sessionId = await createWebSession(t);

      const result = await t.action(api.chatAi.respond, {
        sessionId,
        userMessage: "Can I bring two cats?",
      });
      const unknownRows = await admin.query(api.chatKnowledge.adminListUnknownQuestions, {
        status: "new",
      });

      expect(result).toMatchObject({
        model: "unknown_fallback",
        response: "I'm not fully sure about that yet. I'll ask the team and get back to you shortly.",
      });
      expect(unknownRows).toHaveLength(1);
      expect(unknownRows[0]).toMatchObject({
        userQuestion: "Can I bring two cats?",
        status: "new",
      });
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("creates suggested variants from an unknown question without auto-approving them", async () => {
    vi.stubEnv("ADMIN_EMAILS", adminEmail);
    try {
      const t = convexTest(schema, modules);
      const admin = adminTest(t);
      const sessionId = await createWebSession(t);
      const unknownQuestionId = await t.mutation(api.chatKnowledge.recordUnknownQuestion, {
        sessionId,
        userQuestion: "Can I check in at 1 AM?",
        detectedTopic: "check_in",
      });

      const created = await admin.action(api.chatKnowledge.adminCreateAnswerFromUnknown, {
        unknownQuestionId,
        title: "Late check-in",
        answer: "Late check-in may be possible by prior arrangement with the team.",
        topicNames: ["check_in"],
      });
      const answers = await admin.query(api.chatKnowledge.adminListAnswers, {
        status: "approved",
      });
      const answer = answers.find((row) => row._id === created.answerId);

      expect(answer).toBeTruthy();
      expect(answer?.questions.some((question) => question.status === "approved")).toBe(true);
      const suggested = answer?.questions.filter((question) => question.status === "suggested") ?? [];
      expect(suggested.length).toBeGreaterThan(0);
      expect(suggested.every((question) => question.createdBy === "ai")).toBe(true);
      expect(suggested.every((question) => !question.isAiTrigger)).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("links an unknown question to an existing answer for the next exact match", async () => {
    vi.stubEnv("ADMIN_EMAILS", adminEmail);
    try {
      const t = convexTest(schema, modules);
      const admin = adminTest(t);
      const answerId = await admin.mutation(api.chatKnowledge.adminCreateAnswer, {
        title: "Pets policy",
        answer: "Pets are not allowed at this property.",
        primaryQuestion: "Are pets allowed?",
        topicNames: ["pets"],
      });
      const sessionId = await createWebSession(t);
      const unknownQuestionId = await t.mutation(api.chatKnowledge.recordUnknownQuestion, {
        sessionId,
        userQuestion: "Can I bring my dog?",
      });

      await admin.action(api.chatKnowledge.adminResolveUnknownWithAnswer, {
        unknownQuestionId,
        answerId,
        generateSimilar: false,
      });
      const match = await t.query(api.chatKnowledge.resolveExact, {
        sessionId,
        messageText: "Can I bring my dog?",
      });

      expect(match).toMatchObject({
        answer: "Pets are not allowed at this property.",
      });
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("chatKnowledge admin authorization and guardrails", () => {
  it("requires admin identity for knowledge mutations", async () => {
    vi.stubEnv("ADMIN_EMAILS", adminEmail);
    try {
      const t = convexTest(schema, modules);

      await expect(
        t.mutation(api.chatKnowledge.adminCreateAnswer, {
          title: "Parking",
          answer: "Parking is available.",
          primaryQuestion: "Do you have parking?",
        }),
      ).rejects.toThrow("Not authenticated");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("keeps the reality guardrail ahead of approved knowledge answers", async () => {
    vi.stubEnv("ADMIN_EMAILS", adminEmail);
    try {
      const t = convexTest(schema, modules);
      const admin = adminTest(t);
      await admin.mutation(api.chatKnowledge.adminCreateAnswer, {
        title: "Reality answer",
        answer: "Yes, this is a verified real-world resort.",
        primaryQuestion: "Is Auralis Cove a real luxury villa resort?",
      });
      const sessionId = await createWebSession(t);

      const result = await t.action(api.chatAi.respond, {
        sessionId,
        userMessage: "Is Auralis Cove a real luxury villa resort?",
      });

      expect(result.response).toContain("demo/preview experience");
      expect(result.response).not.toContain("verified real-world resort");
      expect(result.model).toBe("guardrail");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
