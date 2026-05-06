import type { MutationCtx } from '../_generated/server';
import type { PropertyMap } from './properties';

const SOCIAL_PROOF_DATA = [
	{
		propertyKey: 'pool-villa' as const,
		overallRating: 4.92,
		totalReviews: 127,
		isSuperhost: true,
		breakdown: {
			cleanliness: 4.9,
			accuracy: 4.95,
			communication: 5.0,
			location: 4.8,
			checkIn: 4.95,
			value: 4.85
		}
	},
	{
		propertyKey: 'garden-suite' as const,
		overallRating: 4.87,
		totalReviews: 89,
		isSuperhost: false,
		breakdown: {
			cleanliness: 4.85,
			accuracy: 4.9,
			communication: 4.8,
			location: 4.95,
			checkIn: 4.85,
			value: 4.9
		}
	},
	{
		propertyKey: 'penthouse' as const,
		overallRating: 4.95,
		totalReviews: 64,
		isSuperhost: false,
		breakdown: {
			cleanliness: 4.95,
			accuracy: 4.9,
			communication: 5.0,
			location: 5.0,
			checkIn: 4.95,
			value: 4.85
		}
	}
];

export async function seedSocialProof(ctx: MutationCtx, properties: PropertyMap): Promise<void> {
	for (const { propertyKey, ...rest } of SOCIAL_PROOF_DATA) {
		await ctx.db.insert('socialProof', {
			propertyId: properties[propertyKey],
			...rest
		});
	}
}
