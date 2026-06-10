import { v } from 'convex/values';
import {
	action,
	internalMutation,
	internalQuery,
	mutation,
	query,
	type MutationCtx,
	type QueryCtx
} from './_generated/server';
import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { callAI, type ChatMessage } from './lib/chatLlm';
import { requireAdmin } from './lib/adminAuth';
import { normalizeSuggestedQuestion } from './lib/chatSuggestions';

const answerStatusValidator = v.union(
	v.literal('draft'),
	v.literal('approved'),
	v.literal('archived')
);

const unknownQuestionStatusValidator = v.union(
	v.literal('all'),
	v.literal('new'),
	v.literal('resolved'),
	v.literal('ignored')
);

type AnswerStatus = 'draft' | 'approved' | 'archived';

type AnswerGenerationContext = {
	answer: Doc<'chatAnswers'>;
	primaryQuestion: Doc<'chatQuestions'> | null;
	questions: Doc<'chatQuestions'>[];
	topics: Doc<'chatTopics'>[];
};

function sanitizeRequiredText(value: string, field: string, maxLength: number) {
	const trimmed = value.trim();
	if (!trimmed) throw new Error(`${field} is required`);
	if (trimmed.length > maxLength) throw new Error(`${field} must be ${maxLength} characters or fewer`);
	return trimmed;
}

function sanitizeOptionalText(value: string | undefined, maxLength: number) {
	const trimmed = value?.trim();
	if (!trimmed) return undefined;
	if (trimmed.length > maxLength) return trimmed.slice(0, maxLength);
	return trimmed;
}

function normalizeQuestion(value: string) {
	return normalizeSuggestedQuestion(value);
}

function normalizeTopicName(value: string) {
	return normalizeSuggestedQuestion(value);
}

function uniqueQuestionTexts(values: Array<string | undefined>) {
	const seen = new Set<string>();
	const result: string[] = [];
	for (const value of values) {
		const text = value?.trim();
		if (!text) continue;
		const normalized = normalizeQuestion(text);
		if (!normalized || seen.has(normalized)) continue;
		seen.add(normalized);
		result.push(sanitizeRequiredText(text, 'Question', 240));
	}
	return result;
}

function uniqueTopicNames(values: Array<string | undefined>) {
	const seen = new Set<string>();
	const result: string[] = [];
	for (const value of values) {
		const name = value?.trim();
		if (!name) continue;
		const normalized = normalizeTopicName(name);
		if (!normalized || seen.has(normalized)) continue;
		seen.add(normalized);
		result.push(sanitizeRequiredText(name, 'Topic', 80));
	}
	return result;
}

async function resolvePropertyId(
	ctx: QueryCtx | MutationCtx,
	args: { propertyId?: Id<'properties'>; propertySlug?: string }
) {
	if (args.propertyId) return args.propertyId;
	const propertySlug = args.propertySlug?.trim();
	if (!propertySlug) return undefined;
	const property = await ctx.db
		.query('properties')
		.withIndex('by_slug', (q) => q.eq('slug', propertySlug))
		.unique();
	return property?._id;
}

async function resolveSessionProperty(
	ctx: QueryCtx | MutationCtx,
	session: Doc<'chatSessions'> | null,
	propertySlug?: string
) {
	if (session?.propertyId) {
		return {
			propertyId: session.propertyId,
			propertySlug: session.propertySlug
		};
	}
	const slug = session?.propertySlug ?? propertySlug?.trim();
	if (!slug) return { propertyId: undefined, propertySlug: session?.propertySlug ?? propertySlug };
	const property = await ctx.db
		.query('properties')
		.withIndex('by_slug', (q) => q.eq('slug', slug))
		.unique();
	return {
		propertyId: property?._id,
		propertySlug: slug
	};
}

async function getOrCreateTopic(
	ctx: MutationCtx,
	propertyId: Id<'properties'> | undefined,
	name: string,
	description = ''
) {
	const normalizedName = normalizeTopicName(name);
	if (!normalizedName) throw new Error('Topic is required');
	const existing = await ctx.db
		.query('chatTopics')
		.withIndex('by_propertyId_and_normalizedName', (q) =>
			q.eq('propertyId', propertyId).eq('normalizedName', normalizedName)
		)
		.unique();
	if (existing) return existing._id;

	const now = Date.now();
	return await ctx.db.insert('chatTopics', {
		propertyId,
		name,
		normalizedName,
		description,
		createdAt: now,
		updatedAt: now
	});
}

async function syncAnswerTopics(
	ctx: MutationCtx,
	answerId: Id<'chatAnswers'>,
	propertyId: Id<'properties'> | undefined,
	topicNames?: string[]
) {
	if (!topicNames) return;

	const existing = await ctx.db
		.query('chatAnswerTopics')
		.withIndex('by_answerId', (q) => q.eq('answerId', answerId))
		.take(100);
	for (const row of existing) {
		await ctx.db.delete(row._id);
	}

	for (const topicName of uniqueTopicNames(topicNames)) {
		const topicId = await getOrCreateTopic(ctx, propertyId, topicName);
		await ctx.db.insert('chatAnswerTopics', {
			propertyId,
			answerId,
			topicId,
			createdAt: Date.now()
		});
	}
}

async function getAnswerTopics(ctx: QueryCtx, answerId: Id<'chatAnswers'>) {
	const joins = await ctx.db
		.query('chatAnswerTopics')
		.withIndex('by_answerId', (q) => q.eq('answerId', answerId))
		.take(50);
	const topics = await Promise.all(joins.map((join) => ctx.db.get(join.topicId)));
	return topics.filter((topic): topic is Doc<'chatTopics'> => Boolean(topic));
}

async function insertApprovedQuestion(
	ctx: MutationCtx,
	args: {
		answerId: Id<'chatAnswers'>;
		propertyId?: Id<'properties'>;
		questionText: string;
		isPrimary: boolean;
		isAiTrigger: boolean;
		adminEmail: string;
	}
) {
	const questionText = sanitizeRequiredText(args.questionText, 'Question', 240);
	const now = Date.now();
	return await ctx.db.insert('chatQuestions', {
		propertyId: args.propertyId,
		answerId: args.answerId,
		questionText,
		normalizedQuestion: normalizeQuestion(questionText),
		isPrimary: args.isPrimary,
		isAiTrigger: args.isAiTrigger,
		createdBy: 'admin',
		status: 'approved',
		createdAt: now,
		updatedAt: now,
		approvedAt: now,
		createdByAdminEmail: args.adminEmail,
		updatedByAdminEmail: args.adminEmail
	});
}

async function getExactCandidates(
	ctx: QueryCtx,
	normalizedQuestion: string,
	propertyId?: Id<'properties'>
) {
	const globalQuestions = await ctx.db
		.query('chatQuestions')
		.withIndex('by_status_and_normalizedQuestion_and_propertyId', (q) =>
			q.eq('status', 'approved').eq('normalizedQuestion', normalizedQuestion).eq('propertyId', undefined)
		)
		.take(20);
	const propertyQuestions = propertyId
		? await ctx.db
				.query('chatQuestions')
				.withIndex('by_status_and_normalizedQuestion_and_propertyId', (q) =>
					q.eq('status', 'approved').eq('normalizedQuestion', normalizedQuestion).eq('propertyId', propertyId)
				)
				.take(20)
		: [];

	return [
		...propertyQuestions.map((question) => ({ question, scopeRank: 1 })),
		...globalQuestions.map((question) => ({ question, scopeRank: 0 }))
	].sort((left, right) => {
		if (right.scopeRank !== left.scopeRank) return right.scopeRank - left.scopeRank;
		if (Number(right.question.isAiTrigger) !== Number(left.question.isAiTrigger)) {
			return Number(right.question.isAiTrigger) - Number(left.question.isAiTrigger);
		}
		if (Number(right.question.isPrimary) !== Number(left.question.isPrimary)) {
			return Number(right.question.isPrimary) - Number(left.question.isPrimary);
		}
		return right.question.updatedAt - left.question.updatedAt;
	});
}

export const resolveExact = query({
	args: {
		sessionId: v.id('chatSessions'),
		messageText: v.string()
	},
	handler: async (ctx, args) => {
		const normalizedQuestion = normalizeQuestion(args.messageText);
		if (!normalizedQuestion) return null;

		const session = await ctx.db.get(args.sessionId);
		if (!session) return null;
		const { propertyId } = await resolveSessionProperty(ctx, session);
		const candidates = await getExactCandidates(ctx, normalizedQuestion, propertyId);

		for (const candidate of candidates) {
			const answer = await ctx.db.get(candidate.question.answerId);
			if (!answer || answer.status !== 'approved') continue;
			if (answer.propertyId && propertyId && answer.propertyId !== propertyId) continue;
			if (answer.propertyId && !propertyId) continue;

			return {
				source: 'approved_exact' as const,
				answerId: answer._id,
				questionId: candidate.question._id,
				title: answer.title,
				answer: answer.answer,
				questionText: candidate.question.questionText,
				normalizedQuestion,
				propertyId: answer.propertyId
			};
		}

		return null;
	}
});

export const recordUnknownQuestion = mutation({
	args: {
		sessionId: v.optional(v.id('chatSessions')),
		userQuestion: v.string(),
		detectedTopic: v.optional(v.string()),
		pageUrl: v.optional(v.string()),
		propertySlug: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const userQuestion = sanitizeRequiredText(args.userQuestion, 'Question', 1000);
		const normalizedQuestion = normalizeQuestion(userQuestion);
		if (!normalizedQuestion) throw new Error('Question is required');

		const session = args.sessionId ? await ctx.db.get(args.sessionId) : null;
		const { propertyId, propertySlug } = await resolveSessionProperty(ctx, session, args.propertySlug);
		const now = Date.now();

		if (args.sessionId) {
			const existingRows = await ctx.db
				.query('chatUnknownQuestions')
				.withIndex('by_sessionId_and_normalizedQuestion', (q) =>
					q.eq('sessionId', args.sessionId).eq('normalizedQuestion', normalizedQuestion)
				)
				.take(10);
			const existing = existingRows.find((row) => row.status === 'new');
			if (existing) {
				await ctx.db.patch(existing._id, {
					detectedTopic: sanitizeOptionalText(args.detectedTopic, 80) ?? existing.detectedTopic,
					updatedAt: now
				});
				return existing._id;
			}
		}

		return await ctx.db.insert('chatUnknownQuestions', {
			propertyId,
			propertySlug,
			sessionId: args.sessionId,
			userQuestion,
			normalizedQuestion,
			detectedTopic: sanitizeOptionalText(args.detectedTopic, 80),
			userId: session?.visitorId,
			pageUrl: sanitizeOptionalText(args.pageUrl, 500) ?? session?.currentPath,
			status: 'new',
			adminNotified: false,
			createdAt: now,
			updatedAt: now
		});
	}
});

export const adminListAnswers = query({
	args: {
		status: v.optional(answerStatusValidator),
		limit: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		await requireAdmin(ctx);

		const limit = Math.min(Math.max(args.limit ?? 50, 1), 100);
		const answers = args.status
			? await ctx.db
					.query('chatAnswers')
					.withIndex('by_status_and_updatedAt', (q) => q.eq('status', args.status as AnswerStatus))
					.order('desc')
					.take(limit)
			: await ctx.db.query('chatAnswers').withIndex('by_createdAt').order('desc').take(limit);

		return await Promise.all(
			answers.map(async (answer) => {
				const [questions, topics, property] = await Promise.all([
					ctx.db
						.query('chatQuestions')
						.withIndex('by_answerId', (q) => q.eq('answerId', answer._id))
						.order('desc')
						.take(100),
					getAnswerTopics(ctx, answer._id),
					answer.propertyId ? ctx.db.get(answer.propertyId) : Promise.resolve(null)
				]);
				return {
					...answer,
					propertyName: property?.name,
					propertySlug: property?.slug,
					questions,
					topics
				};
			})
		);
	}
});

export const adminCreateAnswer = mutation({
	args: {
		propertyId: v.optional(v.id('properties')),
		propertySlug: v.optional(v.string()),
		title: v.string(),
		answer: v.string(),
		status: v.optional(answerStatusValidator),
		primaryQuestion: v.optional(v.string()),
		questions: v.optional(v.array(v.string())),
		topicNames: v.optional(v.array(v.string()))
	},
	handler: async (ctx, args) => {
		const admin = await requireAdmin(ctx);
		const propertyId = await resolvePropertyId(ctx, args);
		const title = sanitizeRequiredText(args.title, 'Title', 160);
		const answer = sanitizeRequiredText(args.answer, 'Answer', 2000);
		const status = args.status ?? 'approved';
		const now = Date.now();

		const answerId = await ctx.db.insert('chatAnswers', {
			propertyId,
			title,
			answer,
			status,
			createdAt: now,
			updatedAt: now,
			createdByAdminEmail: admin.email,
			updatedByAdminEmail: admin.email
		});

		const questionTexts = uniqueQuestionTexts([args.primaryQuestion, ...(args.questions ?? [])]);
		for (let index = 0; index < questionTexts.length; index++) {
			await insertApprovedQuestion(ctx, {
				answerId,
				propertyId,
				questionText: questionTexts[index],
				isPrimary: index === 0,
				isAiTrigger: index === 0,
				adminEmail: admin.email
			});
		}
		await syncAnswerTopics(ctx, answerId, propertyId, args.topicNames);

		return answerId;
	}
});

export const adminUpdateAnswer = mutation({
	args: {
		answerId: v.id('chatAnswers'),
		propertyId: v.optional(v.id('properties')),
		propertySlug: v.optional(v.string()),
		title: v.string(),
		answer: v.string(),
		status: answerStatusValidator,
		topicNames: v.optional(v.array(v.string()))
	},
	handler: async (ctx, args) => {
		const admin = await requireAdmin(ctx);
		const existing = await ctx.db.get(args.answerId);
		if (!existing) throw new Error('Answer not found');

		const propertyId = await resolvePropertyId(ctx, args);
		const now = Date.now();
		await ctx.db.patch(args.answerId, {
			propertyId,
			title: sanitizeRequiredText(args.title, 'Title', 160),
			answer: sanitizeRequiredText(args.answer, 'Answer', 2000),
			status: args.status,
			archivedAt: args.status === 'archived' ? existing.archivedAt ?? now : undefined,
			archivedByAdminEmail: args.status === 'archived' ? admin.email : undefined,
			updatedAt: now,
			updatedByAdminEmail: admin.email
		});

		await syncAnswerTopics(ctx, args.answerId, propertyId, args.topicNames);
		return { updated: true };
	}
});

export const adminListUnknownQuestions = query({
	args: {
		status: v.optional(unknownQuestionStatusValidator),
		limit: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		await requireAdmin(ctx);

		const limit = Math.min(Math.max(args.limit ?? 50, 1), 100);
		const status = args.status ?? 'new';
		const rows = status === 'all'
			? await ctx.db.query('chatUnknownQuestions').withIndex('by_createdAt').order('desc').take(limit)
			: await ctx.db
					.query('chatUnknownQuestions')
					.withIndex('by_status_and_createdAt', (q) => q.eq('status', status))
					.order('desc')
					.take(limit);

		return await Promise.all(
			rows.map(async (row) => {
				const [property, answer] = await Promise.all([
					row.propertyId ? ctx.db.get(row.propertyId) : Promise.resolve(null),
					row.resolvedAnswerId ? ctx.db.get(row.resolvedAnswerId) : Promise.resolve(null)
				]);
				return {
					...row,
					propertyName: property?.name,
					propertySlug: row.propertySlug ?? property?.slug,
					resolvedAnswerTitle: answer?.title
				};
			})
		);
	}
});

export const getAnswerGenerationContext = internalQuery({
	args: { answerId: v.id('chatAnswers') },
	handler: async (ctx, args): Promise<AnswerGenerationContext | null> => {
		const answer = await ctx.db.get(args.answerId);
		if (!answer) return null;
		const questions = await ctx.db
			.query('chatQuestions')
			.withIndex('by_answerId', (q) => q.eq('answerId', args.answerId))
			.take(100);
		const primaryQuestion =
			questions.find((question) => question.isPrimary && question.status === 'approved') ??
			questions.find((question) => question.status === 'approved') ??
			null;
		const topics = await getAnswerTopics(ctx, args.answerId);
		return { answer, primaryQuestion, questions, topics };
	}
});

export const storeSuggestedQuestions = internalMutation({
	args: {
		answerId: v.id('chatAnswers'),
		questions: v.array(v.string()),
		adminEmail: v.string()
	},
	handler: async (ctx, args) => {
		const answer = await ctx.db.get(args.answerId);
		if (!answer) throw new Error('Answer not found');

		const existing = await ctx.db
			.query('chatQuestions')
			.withIndex('by_answerId', (q) => q.eq('answerId', args.answerId))
			.take(200);
		const existingNormalized = new Set(existing.map((question) => question.normalizedQuestion));
		const now = Date.now();
		const insertedQuestionIds: Id<'chatQuestions'>[] = [];

		for (const questionText of uniqueQuestionTexts(args.questions).slice(0, 8)) {
			const normalizedQuestion = normalizeQuestion(questionText);
			if (!normalizedQuestion || existingNormalized.has(normalizedQuestion)) continue;
			existingNormalized.add(normalizedQuestion);
			const questionId = await ctx.db.insert('chatQuestions', {
				propertyId: answer.propertyId,
				answerId: args.answerId,
				questionText,
				normalizedQuestion,
				isPrimary: false,
				isAiTrigger: false,
				createdBy: 'ai',
				status: 'suggested',
				createdAt: now,
				updatedAt: now,
				updatedByAdminEmail: args.adminEmail
			});
			insertedQuestionIds.push(questionId);
		}

		return { insertedQuestionIds };
	}
});

export const createAnswerFromUnknown = internalMutation({
	args: {
		unknownQuestionId: v.id('chatUnknownQuestions'),
		title: v.string(),
		answer: v.string(),
		status: v.optional(answerStatusValidator),
		topicNames: v.optional(v.array(v.string())),
		adminEmail: v.string()
	},
	handler: async (ctx, args) => {
		const unknown = await ctx.db.get(args.unknownQuestionId);
		if (!unknown) throw new Error('Unknown question not found');
		const now = Date.now();
		const answerId = await ctx.db.insert('chatAnswers', {
			propertyId: unknown.propertyId,
			title: sanitizeRequiredText(args.title, 'Title', 160),
			answer: sanitizeRequiredText(args.answer, 'Answer', 2000),
			status: args.status ?? 'approved',
			createdAt: now,
			updatedAt: now,
			createdByAdminEmail: args.adminEmail,
			updatedByAdminEmail: args.adminEmail
		});
		const questionId = await insertApprovedQuestion(ctx, {
			answerId,
			propertyId: unknown.propertyId,
			questionText: unknown.userQuestion,
			isPrimary: true,
			isAiTrigger: true,
			adminEmail: args.adminEmail
		});
		await syncAnswerTopics(ctx, answerId, unknown.propertyId, args.topicNames);
		await ctx.db.patch(args.unknownQuestionId, {
			status: 'resolved',
			resolvedAnswerId: answerId,
			resolvedQuestionId: questionId,
			resolvedAt: now,
			updatedAt: now
		});
		return { answerId, questionId };
	}
});

export const resolveUnknownWithAnswer = internalMutation({
	args: {
		unknownQuestionId: v.id('chatUnknownQuestions'),
		answerId: v.id('chatAnswers'),
		adminEmail: v.string()
	},
	handler: async (ctx, args) => {
		const [unknown, answer] = await Promise.all([
			ctx.db.get(args.unknownQuestionId),
			ctx.db.get(args.answerId)
		]);
		if (!unknown) throw new Error('Unknown question not found');
		if (!answer) throw new Error('Answer not found');
		if (answer.status === 'archived') throw new Error('Cannot link to an archived answer');

		const now = Date.now();
		const questionId = await insertApprovedQuestion(ctx, {
			answerId: args.answerId,
			propertyId: answer.propertyId,
			questionText: unknown.userQuestion,
			isPrimary: false,
			isAiTrigger: false,
			adminEmail: args.adminEmail
		});
		await ctx.db.patch(args.unknownQuestionId, {
			status: 'resolved',
			resolvedAnswerId: args.answerId,
			resolvedQuestionId: questionId,
			resolvedAt: now,
			updatedAt: now
		});
		return { answerId: args.answerId, questionId };
	}
});

function extractJsonArray(value: string | null) {
	const trimmed = value?.trim();
	if (!trimmed) return null;
	if (trimmed.startsWith('[')) return trimmed;
	const match = trimmed.match(/\[[\s\S]*\]/);
	return match?.[0] ?? null;
}

function parseQuestionArray(value: string | null) {
	const json = extractJsonArray(value);
	if (!json) return [];
	try {
		const parsed = JSON.parse(json) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed.flatMap((item) => {
			if (typeof item === 'string') return [item];
			if (item && typeof item === 'object') {
				const row = item as Record<string, unknown>;
				return typeof row.question === 'string' ? [row.question] : [];
			}
			return [];
		});
	} catch {
		return [];
	}
}

function fallbackSimilarQuestions(context: AnswerGenerationContext, sourceQuestion?: string) {
	const title = context.answer.title;
	const question = sourceQuestion ?? context.primaryQuestion?.questionText;
	return uniqueQuestionTexts([
		question,
		`Can you tell me about ${title}?`,
		`What should I know about ${title}?`,
		`Do you have details about ${title}?`,
		`Can you explain ${title}?`
	]);
}

async function generateSimilarQuestionTexts(
	context: AnswerGenerationContext,
	sourceQuestion?: string,
	limit = 5
) {
	const apiKey = process.env.AI_API_KEY;
	if (!apiKey) return fallbackSimilarQuestions(context, sourceQuestion).slice(0, limit);

	const topics = context.topics.map((topic) => topic.name).join(', ') || 'general';
	const existingQuestions = context.questions.map((question) => question.questionText).join('\n');
	const messages: ChatMessage[] = [
		{
			role: 'system',
			content:
				'You generate admin-reviewable alternate guest questions for an approved property chatbot answer. Return JSON only.'
		},
		{
			role: 'user',
			content: `Answer title: ${context.answer.title}
Approved answer:
${context.answer.answer}

Primary/source question:
${sourceQuestion ?? context.primaryQuestion?.questionText ?? context.answer.title}

Topics: ${topics}

Existing questions:
${existingQuestions || 'none'}

Create ${Math.min(Math.max(limit, 1), 8)} concise alternate ways a hotel/villa guest might ask for this same answer.
Rules:
- Return a JSON array of strings.
- Keep each question under 160 characters.
- Do not invent facts or add new policy details.
- Do not include answers.`
		}
	];

	const apiBase = process.env.AI_API_BASE_URL || 'https://api.x.ai/v1';
	const model = process.env.AI_SIMPLE_MODEL || 'grok-4.3';
	const response = await callAI(apiBase, apiKey, model, messages, []);
	const parsed = parseQuestionArray(response.content);
	return (parsed.length > 0 ? parsed : fallbackSimilarQuestions(context, sourceQuestion)).slice(0, limit);
}

export const adminGenerateSimilarQuestions = action({
	args: {
		answerId: v.id('chatAnswers'),
		sourceQuestion: v.optional(v.string()),
		limit: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const admin = await requireAdmin(ctx);
		const context: AnswerGenerationContext | null = await ctx.runQuery(
			internal.chatKnowledge.getAnswerGenerationContext,
			{ answerId: args.answerId }
		);
		if (!context) throw new Error('Answer not found');

		const questions = await generateSimilarQuestionTexts(
			context,
			args.sourceQuestion,
			Math.min(Math.max(args.limit ?? 5, 1), 8)
		);
		const result: { insertedQuestionIds: Id<'chatQuestions'>[] } = await ctx.runMutation(
			internal.chatKnowledge.storeSuggestedQuestions,
			{
				answerId: args.answerId,
				questions,
				adminEmail: admin.email
			}
		);
		return result;
	}
});

export const adminCreateAnswerFromUnknown = action({
	args: {
		unknownQuestionId: v.id('chatUnknownQuestions'),
		title: v.string(),
		answer: v.string(),
		status: v.optional(answerStatusValidator),
		topicNames: v.optional(v.array(v.string())),
		generateSimilar: v.optional(v.boolean())
	},
	handler: async (ctx, args) => {
		const admin = await requireAdmin(ctx);
		const created: { answerId: Id<'chatAnswers'>; questionId: Id<'chatQuestions'> } =
			await ctx.runMutation(internal.chatKnowledge.createAnswerFromUnknown, {
				unknownQuestionId: args.unknownQuestionId,
				title: args.title,
				answer: args.answer,
				status: args.status,
				topicNames: args.topicNames,
				adminEmail: admin.email
			});

		let insertedQuestionIds: Id<'chatQuestions'>[] = [];
		if (args.generateSimilar !== false) {
			const context: AnswerGenerationContext | null = await ctx.runQuery(
				internal.chatKnowledge.getAnswerGenerationContext,
				{ answerId: created.answerId }
			);
			if (context) {
				const questions = await generateSimilarQuestionTexts(context, context.primaryQuestion?.questionText);
				const stored: { insertedQuestionIds: Id<'chatQuestions'>[] } = await ctx.runMutation(
					internal.chatKnowledge.storeSuggestedQuestions,
					{
						answerId: created.answerId,
						questions,
						adminEmail: admin.email
					}
				);
				insertedQuestionIds = stored.insertedQuestionIds;
			}
		}

		return { ...created, suggestedQuestionIds: insertedQuestionIds };
	}
});

export const adminResolveUnknownWithAnswer = action({
	args: {
		unknownQuestionId: v.id('chatUnknownQuestions'),
		answerId: v.id('chatAnswers'),
		generateSimilar: v.optional(v.boolean())
	},
	handler: async (ctx, args) => {
		const admin = await requireAdmin(ctx);
		const resolved: { answerId: Id<'chatAnswers'>; questionId: Id<'chatQuestions'> } =
			await ctx.runMutation(internal.chatKnowledge.resolveUnknownWithAnswer, {
				unknownQuestionId: args.unknownQuestionId,
				answerId: args.answerId,
				adminEmail: admin.email
			});

		let insertedQuestionIds: Id<'chatQuestions'>[] = [];
		if (args.generateSimilar !== false) {
			const context: AnswerGenerationContext | null = await ctx.runQuery(
				internal.chatKnowledge.getAnswerGenerationContext,
				{ answerId: resolved.answerId }
			);
			if (context) {
				const questions = await generateSimilarQuestionTexts(context, context.primaryQuestion?.questionText);
				const stored: { insertedQuestionIds: Id<'chatQuestions'>[] } = await ctx.runMutation(
					internal.chatKnowledge.storeSuggestedQuestions,
					{
						answerId: resolved.answerId,
						questions,
						adminEmail: admin.email
					}
				);
				insertedQuestionIds = stored.insertedQuestionIds;
			}
		}

		return { ...resolved, suggestedQuestionIds: insertedQuestionIds };
	}
});

export const adminIgnoreUnknown = mutation({
	args: { unknownQuestionId: v.id('chatUnknownQuestions') },
	handler: async (ctx, args) => {
		await requireAdmin(ctx);
		const unknown = await ctx.db.get(args.unknownQuestionId);
		if (!unknown) throw new Error('Unknown question not found');
		const now = Date.now();
		await ctx.db.patch(args.unknownQuestionId, {
			status: 'ignored',
			ignoredAt: now,
			updatedAt: now
		});
		return { ignored: true };
	}
});

export const adminApproveQuestion = mutation({
	args: {
		questionId: v.id('chatQuestions'),
		isPrimary: v.optional(v.boolean()),
		isAiTrigger: v.optional(v.boolean())
	},
	handler: async (ctx, args) => {
		const admin = await requireAdmin(ctx);
		const question = await ctx.db.get(args.questionId);
		if (!question) throw new Error('Question not found');
		const answer = await ctx.db.get(question.answerId);
		if (!answer) throw new Error('Answer not found');

		const now = Date.now();
		const isPrimary = args.isPrimary ?? question.isPrimary;
		const isAiTrigger = args.isAiTrigger ?? question.isAiTrigger;

		if (isPrimary || isAiTrigger) {
			const siblings = await ctx.db
				.query('chatQuestions')
				.withIndex('by_answerId', (q) => q.eq('answerId', question.answerId))
				.take(100);
			for (const sibling of siblings) {
				if (sibling._id === args.questionId) continue;
				const patch: Partial<Doc<'chatQuestions'>> = {};
				if (isPrimary && sibling.isPrimary) patch.isPrimary = false;
				if (isAiTrigger && sibling.isAiTrigger) patch.isAiTrigger = false;
				if (Object.keys(patch).length > 0) await ctx.db.patch(sibling._id, patch);
			}
		}

		await ctx.db.patch(args.questionId, {
			status: 'approved',
			isPrimary,
			isAiTrigger,
			approvedAt: now,
			rejectedAt: undefined,
			updatedAt: now,
			updatedByAdminEmail: admin.email
		});
		return { approved: true };
	}
});

export const adminRejectQuestion = mutation({
	args: { questionId: v.id('chatQuestions') },
	handler: async (ctx, args) => {
		const admin = await requireAdmin(ctx);
		const question = await ctx.db.get(args.questionId);
		if (!question) throw new Error('Question not found');
		await ctx.db.patch(args.questionId, {
			status: 'rejected',
			isPrimary: false,
			isAiTrigger: false,
			rejectedAt: Date.now(),
			updatedAt: Date.now(),
			updatedByAdminEmail: admin.email
		});
		return { rejected: true };
	}
});
