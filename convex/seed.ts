import { mutation } from './_generated/server';
import { seedProperties } from './seeds/properties';
import { seedRooms } from './seeds/rooms';
import { seedPricing } from './seeds/pricing';
import { seedSocialProof } from './seeds/socialProof';
import { seedReviews } from './seeds/reviews';
import { seedTourSnippets } from './seeds/tourSnippets';
import { seedRecentBookings } from './seeds/recentBookings';

export const seedAll = mutation({
	args: {},
	handler: async (ctx) => {
		const existing = await ctx.db.query('properties').first();
		if (existing) {
			return { status: 'already_seeded' };
		}

		const properties = await seedProperties(ctx);
		await seedRooms(ctx, properties);
		await seedPricing(ctx, properties);
		await seedSocialProof(ctx, properties);
		await seedReviews(ctx, properties);
		await seedTourSnippets(ctx, properties);
		await seedRecentBookings(ctx, properties);

		return {
			status: 'seeded',
			properties: {
				poolVilla: properties['pool-villa'],
				gardenSuite: properties['garden-suite'],
				penthouse: properties.penthouse
			}
		};
	}
});
