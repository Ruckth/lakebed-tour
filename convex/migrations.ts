import { internalMutation } from './_generated/server';

// One-shot backfill: copies legacy chatSessions.messages arrays into the
// dedicated chatMessages table, then clears the legacy field on each session.
// Run via `npx convex run migrations:backfillChatMessages` once after deploy.
// Once verified, the `messages` field can be removed from the chatSessions schema.
export const backfillChatMessages = internalMutation({
	args: {},
	handler: async (ctx) => {
		const sessions = await ctx.db.query('chatSessions').take(5000);

		let migratedSessions = 0;
		let migratedMessages = 0;

		for (const session of sessions) {
			const legacy = session.messages;
			if (!legacy || legacy.length === 0) continue;

			for (const msg of legacy) {
				await ctx.db.insert('chatMessages', {
					sessionId: session._id,
					role: msg.role,
					content: msg.content,
					timestamp: msg.timestamp
				});
				migratedMessages++;
			}

			await ctx.db.patch(session._id, { messages: undefined });
			migratedSessions++;
		}

		return { migratedSessions, migratedMessages };
	}
});
