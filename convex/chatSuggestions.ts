import { v } from 'convex/values';
import { internal } from './_generated/api';
import { internalAction, internalMutation, internalQuery, mutation, query } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import { callAI, type ChatMessage } from './lib/chatLlm';
import { requireAdmin } from './lib/adminAuth';
import {
	clampSuggestionScore,
	normalizeSuggestedQuestion,
	selectRankedSuggestedQuestions
} from './lib/chatSuggestions';

const DEFAULT_LIMIT = 2;
const GENERATION_CANDIDATE_LIMIT = 5;
const SCORE_ORDERED_CANDIDATE_SCAN_LIMIT = 100;
const HISTORY_LIMIT = 12;
// V1 keeps the repeat check bounded to the latest session turns.
const ASKED_MESSAGE_LOOKBACK_LIMIT = 200;

type SuggestionTopic =
	| 'villa_fit'
	| 'direct_booking'
	| 'tour'
	| 'availability'
	| 'booking'
	| 'amenities'
	| 'contact';

type GenerationContext = {
	session: Doc<'chatSessions'>;
	assistantMessage: Doc<'chatMessages'>;
	userMessage: Doc<'chatMessages'> | null;
	recentMessages: Doc<'chatMessages'>[];
	property: Doc<'properties'> | null;
};

type GeneratedQuestion = {
	question: string;
	topic: string;
	score: number;
};

function localeOrDefault(locale?: string) {
	return locale?.trim() || 'en';
}

function detectTopic(text: string): SuggestionTopic {
	const lower = text.toLocaleLowerCase();
	if (/(available|availability|date|dates|check.?in|check.?out)/i.test(lower)) return 'availability';
	if (/(book|booking|reserve|reservation|payment|pay)/i.test(lower)) return 'booking';
	if (/(direct|discount|price|saving|ota|fee|airport pickup)/i.test(lower)) return 'direct_booking';
	if (/(360|tour|virtual|hotspot|view|see)/i.test(lower)) return 'tour';
	if (/(whatsapp|line|contact|host|message)/i.test(lower)) return 'contact';
	if (/(pool|bedroom|bathroom|amenit|breakfast|kitchen|wifi)/i.test(lower)) return 'amenities';
	return 'villa_fit';
}

function fallbackQuestionsForEnglish(topic: SuggestionTopic, propertyName?: string): GeneratedQuestion[] {
	const villaLabel = propertyName ?? 'this villa';
	const banks: Record<SuggestionTopic, GeneratedQuestion[]> = {
		villa_fit: [
			{ question: 'What is included when booking direct?', topic: 'direct_booking', score: 91 },
			{ question: 'Can I see the villa in 360?', topic: 'tour', score: 84 },
			{ question: 'Which villa is best for my dates?', topic: 'availability', score: 78 },
			{ question: 'How many guests can stay comfortably?', topic: 'amenities', score: 70 }
		],
		direct_booking: [
			{ question: 'Can I check availability for my dates?', topic: 'availability', score: 92 },
			{ question: `Can I tour ${villaLabel} before booking?`, topic: 'tour', score: 84 },
			{ question: 'Which villa gives the best value?', topic: 'villa_fit', score: 79 },
			{ question: 'How do I contact the host directly?', topic: 'contact', score: 68 }
		],
		tour: [
			{ question: 'Which villa is best for a couple?', topic: 'villa_fit', score: 89 },
			{ question: 'What is included when booking direct?', topic: 'direct_booking', score: 82 },
			{ question: 'Can I check availability for my dates?', topic: 'availability', score: 80 },
			{ question: 'What amenities are included?', topic: 'amenities', score: 72 }
		],
		availability: [
			{ question: 'Which villa should I choose for this stay?', topic: 'villa_fit', score: 91 },
			{ question: 'What is the direct booking total?', topic: 'direct_booking', score: 86 },
			{ question: 'Can I message the host on WhatsApp?', topic: 'contact', score: 73 },
			{ question: 'Can I see the villa in 360?', topic: 'tour', score: 70 }
		],
		booking: [
			{ question: 'What is included when booking direct?', topic: 'direct_booking', score: 88 },
			{ question: 'Can I check availability for my dates?', topic: 'availability', score: 84 },
			{ question: 'Can I message the host on WhatsApp?', topic: 'contact', score: 76 },
			{ question: 'Which villa fits my group best?', topic: 'villa_fit', score: 72 }
		],
		amenities: [
			{ question: 'Which villa has the best amenities for us?', topic: 'villa_fit', score: 90 },
			{ question: 'Can I see these spaces in 360?', topic: 'tour', score: 83 },
			{ question: 'What is included when booking direct?', topic: 'direct_booking', score: 76 },
			{ question: 'Can I check availability for my dates?', topic: 'availability', score: 72 }
		],
		contact: [
			{ question: 'Can I check availability for my dates?', topic: 'availability', score: 88 },
			{ question: 'What is included when booking direct?', topic: 'direct_booking', score: 82 },
			{ question: 'Which villa should I ask the host about?', topic: 'villa_fit', score: 76 },
			{ question: 'Can I see the villa in 360?', topic: 'tour', score: 68 }
		]
	};

	return banks[topic];
}

function extractJsonArray(value: string) {
	const trimmed = value.trim();
	if (trimmed.startsWith('[')) return trimmed;
	const match = trimmed.match(/\[[\s\S]*\]/);
	return match?.[0] ?? null;
}

function parseGeneratedQuestions(content: string | null): GeneratedQuestion[] {
	if (!content) return [];
	const json = extractJsonArray(content);
	if (!json) return [];

	try {
		const parsed = JSON.parse(json) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed.flatMap((item): GeneratedQuestion[] => {
			if (!item || typeof item !== 'object') return [];
			const row = item as Record<string, unknown>;
			const question = typeof row.question === 'string' ? row.question.trim() : '';
			const topic = typeof row.topic === 'string' ? row.topic.trim() : 'villa_fit';
			const score = typeof row.score === 'number' ? row.score : Number(row.score);
			if (!question || question.length > 160) return [];
			return [{ question, topic: topic || 'villa_fit', score: clampSuggestionScore(score) }];
		});
	} catch {
		return [];
	}
}

function sanitizeCandidates(candidates: GeneratedQuestion[]) {
	const seen = new Set<string>();
	const sanitized: GeneratedQuestion[] = [];

	for (const candidate of candidates) {
		const question = candidate.question.trim();
		const normalized = normalizeSuggestedQuestion(question);
		if (!question || !normalized || seen.has(normalized)) continue;
		seen.add(normalized);
		sanitized.push({
			question,
			topic: candidate.topic.trim() || 'villa_fit',
			score: clampSuggestionScore(candidate.score)
		});
		if (sanitized.length >= GENERATION_CANDIDATE_LIMIT) break;
	}

	return sanitized;
}

async function generateQuestionsWithAi(context: GenerationContext, locale: string) {
	const apiKey = process.env.AI_API_KEY;
	if (!apiKey) return [];

	const propertyLine = context.property
		? `${context.property.name}: ${context.property.tagline}. ฿${context.property.pricePerNight}/night, ${context.property.maxGuests} guests max.`
		: 'The guest is browsing all villas.';
	const transcript = context.recentMessages
		.map((message) => `${message.role}: ${message.content}`)
		.join('\n');
	const messages: ChatMessage[] = [
		{
			role: 'system',
			content:
				'You generate next suggested questions for a luxury villa concierge chat. Return JSON only.'
		},
		{
			role: 'user',
			content: `Locale: ${locale}
Property context: ${propertyLine}

Recent transcript:
${transcript}

Latest assistant reply:
${context.assistantMessage.content}

Create 3 to 5 concise visitor follow-up questions for the next chat chips.
Rules:
- Same language as locale/message when possible.
- Each question must be useful after the assistant reply.
- Do not repeat a question the visitor already asked.
- Do not invent resort facts.
- Return a JSON array of objects with question, topic, and score.
- topic must be one of villa_fit, direct_booking, tour, availability, booking, amenities, contact.
- score is 0-100, higher means more useful next.`
		}
	];

	const apiBase = process.env.AI_API_BASE_URL || 'https://api.x.ai/v1';
	const model = process.env.AI_SIMPLE_MODEL || 'grok-4.3';
	const response = await callAI(apiBase, apiKey, model, messages, []);
	return parseGeneratedQuestions(response.content);
}

export const getGenerationContext = internalQuery({
	args: {
		sessionId: v.id('chatSessions'),
		assistantMessageId: v.id('chatMessages'),
		userMessageId: v.optional(v.id('chatMessages'))
	},
	handler: async (ctx, args): Promise<GenerationContext | null> => {
		const [session, assistantMessage, userMessage] = await Promise.all([
			ctx.db.get(args.sessionId),
			ctx.db.get(args.assistantMessageId),
			args.userMessageId ? ctx.db.get(args.userMessageId) : Promise.resolve(null)
		]);
		if (!session || !assistantMessage || assistantMessage.role !== 'assistant') return null;

		const recentMessages = await ctx.db
			.query('chatMessages')
			.withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
			.order('desc')
			.take(HISTORY_LIMIT);
		const property = session.propertyId ? await ctx.db.get(session.propertyId) : null;

		return {
			session,
			assistantMessage,
			userMessage: userMessage?.role === 'user' ? userMessage : null,
			recentMessages: recentMessages.reverse(),
			property
		};
	}
});

export const storeGenerated = internalMutation({
	args: {
		sessionId: v.id('chatSessions'),
		assistantMessageId: v.id('chatMessages'),
		userMessageId: v.optional(v.id('chatMessages')),
		locale: v.string(),
		propertySlug: v.optional(v.string()),
		candidates: v.array(
			v.object({
				question: v.string(),
				topic: v.string(),
				score: v.number()
			})
		)
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query('chatSuggestedQuestions')
			.withIndex('by_session_and_assistant', (q) =>
				q.eq('sessionId', args.sessionId).eq('assistantMessageId', args.assistantMessageId)
			)
			.take(1);
		if (existing.length > 0) return { inserted: 0 };

		const now = Date.now();
		let inserted = 0;
		for (const candidate of sanitizeCandidates(args.candidates)) {
			await ctx.db.insert('chatSuggestedQuestions', {
				sessionId: args.sessionId,
				assistantMessageId: args.assistantMessageId,
				userMessageId: args.userMessageId,
				question: candidate.question,
				normalizedQuestion: normalizeSuggestedQuestion(candidate.question),
				locale: args.locale,
				propertySlug: args.propertySlug,
				topic: candidate.topic,
				score: candidate.score,
				status: 'active',
				createdAt: now
			});
			inserted++;
		}

		return { inserted };
	}
});

export const generateForAssistant = internalAction({
	args: {
		sessionId: v.id('chatSessions'),
		assistantMessageId: v.id('chatMessages'),
		userMessageId: v.optional(v.id('chatMessages')),
		locale: v.optional(v.string()),
		propertySlug: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const context: GenerationContext | null = await ctx.runQuery(
			internal.chatSuggestions.getGenerationContext,
			{
				sessionId: args.sessionId,
				assistantMessageId: args.assistantMessageId,
				userMessageId: args.userMessageId
			}
		);
		if (!context) return { inserted: 0 };

		const locale = localeOrDefault(args.locale);
		const textForTopic = `${context.userMessage?.content ?? ''} ${context.assistantMessage.content}`;
		let candidates = await generateQuestionsWithAi(context, locale).catch(() => []);
		if (candidates.length === 0 && locale.toLocaleLowerCase().startsWith('en')) {
			candidates = fallbackQuestionsForEnglish(
				detectTopic(textForTopic),
				context.property?.name
			);
		}
		const sanitized = sanitizeCandidates(candidates);
		if (sanitized.length === 0) return { inserted: 0 };

		const result: { inserted: number } = await ctx.runMutation(
			internal.chatSuggestions.storeGenerated,
			{
				sessionId: args.sessionId,
				assistantMessageId: args.assistantMessageId,
				userMessageId: args.userMessageId,
				locale,
				propertySlug: args.propertySlug ?? context.session.propertySlug,
				candidates: sanitized
			}
		);
		return result;
	}
});

export const nextForSession = query({
	args: {
		sessionId: v.id('chatSessions'),
		limit: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const limit = Math.min(Math.max(args.limit ?? DEFAULT_LIMIT, 1), 5);
		const [activeQuestions, clickedQuestions, messages] = await Promise.all([
			ctx.db
				.query('chatSuggestedQuestions')
				.withIndex('by_session_status_score', (q) =>
					q.eq('sessionId', args.sessionId).eq('status', 'active')
				)
				.order('desc')
				.take(SCORE_ORDERED_CANDIDATE_SCAN_LIMIT),
			ctx.db
				.query('chatSuggestedQuestions')
				.withIndex('by_session_and_status', (q) =>
					q.eq('sessionId', args.sessionId).eq('status', 'clicked')
				)
				.take(SCORE_ORDERED_CANDIDATE_SCAN_LIMIT),
			ctx.db
				.query('chatMessages')
				.withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
				.order('desc')
				.take(ASKED_MESSAGE_LOOKBACK_LIMIT)
		]);

		const selected = selectRankedSuggestedQuestions({
			candidates: activeQuestions.map((question) => ({
				...question,
				_id: question._id
			})),
			askedQuestions: messages
				.filter((message) => message.role === 'user')
				.map((message) => message.content),
			clickedQuestions: clickedQuestions.map((question) => question.question),
			limit
		});

		return selected;
	}
});

export const markShown = mutation({
	args: {
		sessionId: v.id('chatSessions'),
		suggestionIds: v.array(v.id('chatSuggestedQuestions'))
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		let updated = 0;
		for (const suggestionId of args.suggestionIds.slice(0, 5)) {
			const suggestion = await ctx.db.get(suggestionId);
			if (!suggestion || suggestion.sessionId !== args.sessionId || suggestion.shownAt) continue;
			await ctx.db.patch(suggestionId, { shownAt: now });
			updated++;
		}
		return { updated };
	}
});

export const markClicked = mutation({
	args: {
		sessionId: v.id('chatSessions'),
		suggestionId: v.id('chatSuggestedQuestions')
	},
	handler: async (ctx, args) => {
		const suggestion = await ctx.db.get(args.suggestionId);
		if (!suggestion || suggestion.sessionId !== args.sessionId) return { clicked: false };
		await ctx.db.patch(args.suggestionId, {
			status: 'clicked',
			clickedAt: Date.now()
		});
		return { clicked: true };
	}
});

export const adminList = query({
	args: {
		limit: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		await requireAdmin(ctx);

		const limit = Math.min(Math.max(args.limit ?? 50, 1), 100);
		const questions = await ctx.db
			.query('chatSuggestedQuestions')
			.withIndex('by_created_at')
			.order('desc')
			.take(limit);

		return await Promise.all(
			questions.map(async (question) => {
				const session = await ctx.db.get(question.sessionId);
				return {
					...question,
					propertySlug: question.propertySlug ?? session?.propertySlug,
					visitorId: session?.visitorId,
					currentPath: session?.currentPath
				};
			})
		);
	}
});
