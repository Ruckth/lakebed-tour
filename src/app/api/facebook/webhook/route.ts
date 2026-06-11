import { createHash } from "node:crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "convex/_generated/api";
import {
  resolveLineQuickAnswer,
  type LinePropertySummary,
} from "@/lib/line/quick-answers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AI_REPLY_TIMEOUT_MS = 25_000;
const GUARDRAIL_REPLY_TIMEOUT_MS = 3_000;
const QUESTION_BANK_SEMANTIC_TIMEOUT_MS = 8_000;
const DEFAULT_SITE_URL = "https://tour.helpgueststay.com";
const DEFAULT_GRAPH_API_VERSION = "v25.0";

type FacebookMessagingEvent = {
  sender?: {
    id?: string;
  };
  recipient?: {
    id?: string;
  };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
  };
  postback?: {
    title?: string;
    payload?: string;
  };
};

type FacebookWebhookEntry = {
  id?: string;
  time?: number;
  messaging?: FacebookMessagingEvent[];
};

type FacebookWebhookBody = {
  object?: string;
  entry?: FacebookWebhookEntry[];
};

type FacebookEventType = "message" | "postback" | "unsupported";

type ClaimedFacebookEvent = {
  eventId: string;
  sessionId?: string;
  duplicate: boolean;
  status: string;
};

type GeneratedReply = {
  response?: string;
  model?: string;
};

type QuestionBankMatch = {
  source: "exact" | "semantic";
  suggestionId: string;
  question: string;
  answer?: string;
  answerMode: "static" | "dynamic";
  dynamicIntent?: "availability" | "pricing" | "property_details" | "booking_help" | "contact";
  topic: string;
};

type ApprovedKnowledgeMatch = {
  source: "approved_exact";
  answerId: string;
  questionId: string;
  title: string;
  answer: string;
  questionText: string;
  normalizedQuestion: string;
  propertyId?: string;
};

type FacebookEventReplyMode =
  | "exact"
  | "approved_exact"
  | "question_bank_exact"
  | "question_bank_semantic"
  | "ai"
  | "unknown_fallback"
  | "postback"
  | "failed";

type ResolvedFacebookReply = {
  responseText: string;
  replyMode: FacebookEventReplyMode;
  questionBankMatch: QuestionBankMatch | null;
};

class FacebookReplyError extends Error {
  status: number;

  constructor(status: number, body: string) {
    super(`Facebook reply failed (${status}): ${body}`);
    this.name = "FacebookReplyError";
    this.status = status;
  }
}

let convexClient: ConvexHttpClient | null = null;
let convexClientUrl: string | null = null;

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  });
}

function getTextParam(request: Request, key: string) {
  return new URL(request.url).searchParams.get(key)?.trim() ?? "";
}

function getConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.PUBLIC_CONVEX_URL;
  if (!convexUrl || convexUrl === "placeholder") {
    throw new Error("NEXT_PUBLIC_CONVEX_URL or PUBLIC_CONVEX_URL is required");
  }

  if (!convexClient || convexClientUrl !== convexUrl) {
    convexClient = new ConvexHttpClient(convexUrl);
    convexClientUrl = convexUrl;
  }

  return convexClient;
}

function getSiteUrl(request: Request) {
  const configuredUrl =
    process.env.SITE_URL?.trim().replace(/\/+$/, "") ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") ||
    new URL(request.url).origin ||
    DEFAULT_SITE_URL;

  try {
    return new URL(configuredUrl).origin;
  } catch {
    return configuredUrl || DEFAULT_SITE_URL;
  }
}

function getGraphApiVersion() {
  return process.env.FACEBOOK_GRAPH_API_VERSION?.trim() || DEFAULT_GRAPH_API_VERSION;
}

function classifyFacebookEvent(event: FacebookMessagingEvent): FacebookEventType {
  if (event.message?.is_echo) return "unsupported";
  if (event.message?.text?.trim()) return "message";
  if (event.postback?.payload?.trim()) return "postback";
  return "unsupported";
}

function getFacebookUserId(event: FacebookMessagingEvent) {
  return event.sender?.id?.trim() || undefined;
}

function getPageId(event: FacebookMessagingEvent) {
  return event.recipient?.id?.trim() || undefined;
}

function getMessageText(event: FacebookMessagingEvent) {
  return event.message?.text?.trim() || undefined;
}

function getPostbackData(event: FacebookMessagingEvent) {
  return event.postback?.payload?.trim() || undefined;
}

function getEventKey(event: FacebookMessagingEvent) {
  if (event.message?.mid) return `message:${event.message.mid}`;

  const stablePayload = JSON.stringify({
    sender: event.sender,
    recipient: event.recipient,
    timestamp: event.timestamp,
    message: event.message,
    postback: event.postback,
  });
  return `derived:${createHash("sha256").update(stablePayload).digest("hex")}`;
}

function getUserContent(eventType: FacebookEventType, event: FacebookMessagingEvent) {
  if (eventType === "message") return getMessageText(event);
  if (eventType === "postback") return `[Facebook postback] ${getPostbackData(event) ?? "unknown"}`;
  return undefined;
}

function timeout<T>(promise: Promise<T>, ms: number, fallback: () => T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback());
      },
    );
  });
}

function timeoutFallbackReply() {
  return {
    response:
      "I'm checking that for you, but the concierge is taking longer than usual. Please send your villa, dates, and guest count here and the host can help confirm.",
    model: "timeout",
  };
}

function detectFacebookLocale(messageText?: string) {
  if (!messageText) return undefined;
  return /[\u0E00-\u0E7F]/u.test(messageText) ? "th" : "en";
}

function questionBankReplyMode(match: Pick<QuestionBankMatch, "source">): FacebookEventReplyMode {
  return match.source === "exact" ? "question_bank_exact" : "question_bank_semantic";
}

function unknownFallbackReply(messageText?: string) {
  if (/[\u0E00-\u0E7F]/u.test(messageText ?? "")) {
    return "ผมยังไม่มั่นใจคำตอบนี้ครับ เดี๋ยวผมถามทีมงานให้แล้วจะติดต่อกลับไปโดยเร็ว";
  }

  return "I'm not fully sure about that yet. I'll ask the team and get back to you shortly.";
}

async function sendFacebookTextMessage({
  accessToken,
  recipientId,
  text,
}: {
  accessToken: string;
  recipientId: string;
  text: string;
}) {
  const version = getGraphApiVersion();
  const url = new URL(`https://graph.facebook.com/${version}/me/messages`);
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      messaging_type: "RESPONSE",
      recipient: { id: recipientId },
      message: { text },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new FacebookReplyError(response.status, errorText);
  }

  return response.status;
}

async function resolveFacebookReply({
  client,
  eventType,
  messageText,
  postbackData,
  sessionId,
  siteUrl,
}: {
  client: ConvexHttpClient;
  eventType: Exclude<FacebookEventType, "unsupported">;
  messageText?: string;
  postbackData?: string;
  sessionId: string;
  siteUrl: string;
}): Promise<ResolvedFacebookReply> {
  const locale = detectFacebookLocale(messageText);
  const guardrailReply =
    eventType === "message" && messageText
      ? await timeout(
          client.action(api.chatAi.getGuardrailReply, {
            userMessage: messageText,
            siteUrl,
          } as never) as Promise<string | null>,
          GUARDRAIL_REPLY_TIMEOUT_MS,
          () => null,
        )
      : null;

  if (guardrailReply) {
    return {
      responseText: guardrailReply,
      replyMode: "ai",
      questionBankMatch: null,
    };
  }

  if (eventType === "message" && messageText) {
    const approvedKnowledgeMatch = (await client.query(api.chatKnowledge.resolveExact, {
      sessionId,
      messageText,
    } as never)) as ApprovedKnowledgeMatch | null;

    if (approvedKnowledgeMatch) {
      return {
        responseText: approvedKnowledgeMatch.answer.trim(),
        replyMode: "approved_exact",
        questionBankMatch: null,
      };
    }
  }

  const properties = (await client.query(api.properties.list, {})) as LinePropertySummary[];
  const quickAnswer = resolveLineQuickAnswer({
    eventType,
    messageText,
    postbackData,
    properties,
    siteUrl,
  });

  if (quickAnswer) {
    return {
      responseText: quickAnswer.text,
      replyMode: quickAnswer.mode === "postback" ? "postback" : "exact",
      questionBankMatch: null,
    };
  }

  let questionBankMatch: QuestionBankMatch | null = null;
  if (eventType === "message" && messageText) {
    const exactMatch = (await client.query(api.chatSuggestions.resolveCuratedExact, {
      sessionId,
      messageText,
      ...(locale ? { locale } : {}),
    } as never)) as QuestionBankMatch | null;

    questionBankMatch =
      exactMatch ??
      ((await timeout(
        client.action(api.chatSuggestions.resolveCuratedSemantic, {
          sessionId,
          messageText,
          ...(locale ? { locale } : {}),
        } as never) as Promise<QuestionBankMatch | null>,
        QUESTION_BANK_SEMANTIC_TIMEOUT_MS,
        () => null,
      )) as QuestionBankMatch | null);
  }

  if (questionBankMatch?.answerMode === "static" && questionBankMatch.answer?.trim()) {
    return {
      responseText: questionBankMatch.answer.trim(),
      replyMode: questionBankReplyMode(questionBankMatch),
      questionBankMatch,
    };
  }

  if (questionBankMatch) {
    const generated = await timeout(
      client.action(api.chatAi.generateReply, {
        sessionId,
        userMessage: messageText ?? postbackData ?? "Facebook message",
        channel: "facebook",
        siteUrl,
        questionBankHint: {
          question: questionBankMatch.question,
          topic: questionBankMatch.topic,
          ...(questionBankMatch.dynamicIntent
            ? { dynamicIntent: questionBankMatch.dynamicIntent }
            : {}),
          source: questionBankMatch.source,
        },
      } as never) as Promise<GeneratedReply>,
      AI_REPLY_TIMEOUT_MS,
      timeoutFallbackReply,
    );

    return {
      responseText: generated.response ?? timeoutFallbackReply().response,
      replyMode:
        generated.model === "timeout" ? "failed" : questionBankReplyMode(questionBankMatch),
      questionBankMatch,
    };
  }

  if (eventType === "message" && messageText) {
    await client.mutation(api.chatKnowledge.recordUnknownQuestion, {
      sessionId,
      userQuestion: messageText,
    } as never);
  }

  return {
    responseText: unknownFallbackReply(messageText),
    replyMode: "unknown_fallback",
    questionBankMatch: null,
  };
}

async function handleFacebookEvent({
  accessToken,
  client,
  event,
  request,
}: {
  accessToken: string;
  client: ConvexHttpClient;
  event: FacebookMessagingEvent;
  request: Request;
}) {
  const eventType = classifyFacebookEvent(event);
  const facebookUserId = getFacebookUserId(event);
  const pageId = getPageId(event);
  const messageText = getMessageText(event);
  const postbackData = getPostbackData(event);
  const eventKey = getEventKey(event);
  const userContent = getUserContent(eventType, event);

  if (!facebookUserId || eventType === "unsupported") return;

  let claimed: ClaimedFacebookEvent;
  try {
    claimed = (await client.mutation(api.facebook.claimEvent, {
      eventKey,
      facebookUserId,
      pageId,
      eventType,
      messageText,
      postbackData,
      eventTimestamp: event.timestamp,
    } as never)) as ClaimedFacebookEvent;
  } catch (error) {
    console.error("Facebook webhook failed to claim event", {
      eventKey,
      eventType,
      facebookUserId,
      error: error instanceof Error ? error.message : "Unknown Convex failure",
    });
    throw error;
  }

  if (claimed.duplicate) return;

  let facebookReplyStatus: number | undefined;

  try {
    if (claimed.sessionId) {
      await client.mutation(api.facebook.recordInboundEvent, {
        eventId: claimed.eventId,
        sessionId: claimed.sessionId,
        ...(userContent ? { userContent } : {}),
      } as never);
    }

    if (!claimed.sessionId) {
      await client.mutation(api.facebook.markEventIgnored, {
        eventId: claimed.eventId,
        reason: "Missing Facebook sender id",
      } as never);
      return;
    }

    const { responseText, replyMode, questionBankMatch } = await resolveFacebookReply({
      client,
      eventType,
      messageText,
      postbackData,
      sessionId: claimed.sessionId,
      siteUrl: getSiteUrl(request),
    });

    facebookReplyStatus = await sendFacebookTextMessage({
      accessToken,
      recipientId: facebookUserId,
      text: responseText,
    });

    if (questionBankMatch) {
      await client
        .mutation(api.chatSuggestions.markClicked, {
          sessionId: claimed.sessionId,
          suggestion: {
            source: "curated",
            suggestionId: questionBankMatch.suggestionId,
          },
        } as never)
        .catch((markClickedError) => {
          console.warn("Facebook webhook failed to mark question-bank match clicked", {
            eventKey,
            suggestionId: questionBankMatch?.suggestionId,
            error:
              markClickedError instanceof Error
                ? markClickedError.message
                : "Unknown Convex failure",
          });
        });
    }

    await client.mutation(api.facebook.completeEvent, {
      eventId: claimed.eventId,
      sessionId: claimed.sessionId,
      ...(userContent ? { userContent } : {}),
      assistantContent: responseText,
      replyMode,
      facebookReplyStatus,
    } as never);
  } catch (error) {
    const failedFacebookReplyStatus =
      error instanceof FacebookReplyError ? error.status : facebookReplyStatus;
    const errorMessage = error instanceof Error ? error.message : "Unknown Facebook webhook failure";

    console.error("Facebook webhook event failed", {
      eventKey,
      eventType,
      facebookUserId,
      facebookReplyStatus: failedFacebookReplyStatus,
      error: errorMessage,
    });

    try {
      await client.mutation(api.facebook.markEventFailed, {
        eventId: claimed.eventId,
        error: errorMessage,
        ...(typeof failedFacebookReplyStatus === "number"
          ? { facebookReplyStatus: failedFacebookReplyStatus }
          : {}),
      } as never);
    } catch (markFailedError) {
      console.error("Facebook webhook failed to record failure", {
        eventKey,
        eventType,
        facebookUserId,
        error: markFailedError instanceof Error ? markFailedError.message : "Unknown Convex failure",
      });
      throw markFailedError;
    }
  }
}

export async function GET(request: Request) {
  const mode = getTextParam(request, "hub.mode");
  const token = getTextParam(request, "hub.verify_token");
  const challenge = getTextParam(request, "hub.challenge");
  const verifyToken = process.env.FACEBOOK_VERIFY_TOKEN?.trim() || "";

  if (!verifyToken) {
    return jsonResponse(
      { ok: false, error: "FACEBOOK_VERIFY_TOKEN is required" },
      { status: 500 },
    );
  }

  if (mode === "subscribe" && token === verifyToken) {
    return new Response(challenge, {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
  }

  return jsonResponse({ ok: false, error: "Invalid verification token" }, { status: 403 });
}

export async function POST(request: Request) {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    return jsonResponse(
      { ok: false, error: "FACEBOOK_ACCESS_TOKEN is required" },
      { status: 500 },
    );
  }

  let payload: FacebookWebhookBody;
  try {
    payload = (await request.json()) as FacebookWebhookBody;
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON payload" }, { status: 400 });
  }

  if (payload.object !== "page") {
    return jsonResponse({ ok: false, error: "Unsupported Facebook webhook object" }, { status: 404 });
  }

  const events = payload.entry?.flatMap((entry) => entry.messaging ?? []) ?? [];
  if (events.length === 0) return jsonResponse({ ok: true, processed: 0 });

  const client = getConvexClient();
  let processed = 0;
  for (const event of events) {
    await handleFacebookEvent({ accessToken, client, event, request });
    processed += 1;
  }

  return jsonResponse({ ok: true, processed });
}
