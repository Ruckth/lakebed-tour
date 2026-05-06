import type { MutationCtx } from '../_generated/server';
import type { PropertyMap } from './properties';

const SHARED_BENEFITS = [
	{ benefit: 'Free airport pickup', directOnly: true },
	{ benefit: 'Welcome basket', directOnly: true },
	{ benefit: 'Late checkout (2pm)', directOnly: true },
	{ benefit: 'No service fees', directOnly: true },
	{ benefit: 'Free cancellation (48h)', directOnly: false },
	{ benefit: 'Direct WhatsApp support', directOnly: true }
];

const PRICING_DATA = [
	{
		propertyKey: 'pool-villa' as const,
		directRate: 8500,
		otaPricing: [
			{
				platform: 'booking.com',
				displayName: 'Booking.com',
				nightlyRate: 10200,
				serviceFeePercent: 14,
				cleaningFee: 800,
				logo: 'B'
			},
			{
				platform: 'airbnb',
				displayName: 'Airbnb',
				nightlyRate: 9800,
				serviceFeePercent: 14,
				cleaningFee: 600,
				logo: 'A'
			},
			{
				platform: 'agoda',
				displayName: 'Agoda',
				nightlyRate: 9950,
				serviceFeePercent: 12,
				cleaningFee: 700,
				logo: 'AG'
			}
		]
	},
	{
		propertyKey: 'garden-suite' as const,
		directRate: 4500,
		otaPricing: [
			{
				platform: 'booking.com',
				displayName: 'Booking.com',
				nightlyRate: 5400,
				serviceFeePercent: 14,
				cleaningFee: 500,
				logo: 'B'
			},
			{
				platform: 'airbnb',
				displayName: 'Airbnb',
				nightlyRate: 5200,
				serviceFeePercent: 14,
				cleaningFee: 400,
				logo: 'A'
			},
			{
				platform: 'agoda',
				displayName: 'Agoda',
				nightlyRate: 5300,
				serviceFeePercent: 12,
				cleaningFee: 450,
				logo: 'AG'
			}
		]
	},
	{
		propertyKey: 'penthouse' as const,
		directRate: 12000,
		otaPricing: [
			{
				platform: 'booking.com',
				displayName: 'Booking.com',
				nightlyRate: 14400,
				serviceFeePercent: 14,
				cleaningFee: 1200,
				logo: 'B'
			},
			{
				platform: 'airbnb',
				displayName: 'Airbnb',
				nightlyRate: 13800,
				serviceFeePercent: 14,
				cleaningFee: 900,
				logo: 'A'
			},
			{
				platform: 'agoda',
				displayName: 'Agoda',
				nightlyRate: 14100,
				serviceFeePercent: 12,
				cleaningFee: 1000,
				logo: 'AG'
			}
		]
	}
];

export async function seedPricing(ctx: MutationCtx, properties: PropertyMap): Promise<void> {
	for (const { propertyKey, directRate, otaPricing } of PRICING_DATA) {
		await ctx.db.insert('pricing', {
			propertyId: properties[propertyKey],
			directRate,
			otaPricing,
			directBenefits: SHARED_BENEFITS
		});
	}
}
