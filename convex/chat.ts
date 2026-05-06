import { internalQuery, mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const createSession = mutation({
	args: {
		propertyId: v.optional(v.id('properties')),
		propertySlug: v.optional(v.string()),
		channel: v.union(v.literal('web'), v.literal('whatsapp'), v.literal('line'))
	},
	handler: async (ctx, args) => {
		let propertyId = args.propertyId;
		if (!propertyId && args.propertySlug) {
			const property = await ctx.db
				.query('properties')
				.withIndex('by_slug', (q) => q.eq('slug', args.propertySlug!))
				.unique();
			propertyId = property?._id;
		}

		return await ctx.db.insert('chatSessions', {
			propertyId,
			propertySlug: args.propertySlug,
			channel: args.channel,
			createdAt: Date.now()
		});
	}
});

export const addMessage = mutation({
	args: {
		sessionId: v.id('chatSessions'),
		role: v.union(v.literal('user'), v.literal('assistant')),
		content: v.string()
	},
	handler: async (ctx, args) => {
		const session = await ctx.db.get(args.sessionId);
		if (!session) throw new Error('Session not found');

		await ctx.db.insert('chatMessages', {
			sessionId: args.sessionId,
			role: args.role,
			content: args.content,
			timestamp: Date.now()
		});
	}
});

export const getSession = query({
	args: { sessionId: v.id('chatSessions') },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.sessionId);
	}
});

export const getMessages = query({
	args: {
		sessionId: v.id('chatSessions'),
		limit: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query('chatMessages')
			.withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
			.order('asc')
			.take(args.limit ?? 100);
	}
});

export const getRecentMessages = internalQuery({
	args: {
		sessionId: v.id('chatSessions'),
		limit: v.number()
	},
	handler: async (ctx, args) => {
		const recent = await ctx.db
			.query('chatMessages')
			.withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
			.order('desc')
			.take(args.limit);

		return recent.reverse();
	}
});
