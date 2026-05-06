import type { MutationCtx } from '../_generated/server';
import type { PropertyMap } from './properties';

const RECENT_BOOKINGS = [
	{ propertyKey: 'pool-villa' as const, name: 'Mark', city: 'Sydney', dates: 'Apr 12-17', timeAgo: '2 hours ago' },
	{ propertyKey: 'garden-suite' as const, name: 'Sakura', city: 'Tokyo', dates: 'Apr 18-22', timeAgo: '4 hours ago' },
	{ propertyKey: 'penthouse' as const, name: 'Lars', city: 'Oslo', dates: 'Apr 20-26', timeAgo: '5 hours ago' },
	{ propertyKey: 'pool-villa' as const, name: 'Priya', city: 'Mumbai', dates: 'Apr 25-30', timeAgo: '7 hours ago' },
	{ propertyKey: 'garden-suite' as const, name: 'Elena', city: 'Barcelona', dates: 'May 1-5', timeAgo: '9 hours ago' },
	{ propertyKey: 'penthouse' as const, name: 'Tom', city: 'New York', dates: 'May 3-8', timeAgo: '11 hours ago' },
	{ propertyKey: 'pool-villa' as const, name: 'Anh', city: 'Ho Chi Minh City', dates: 'May 10-15', timeAgo: '13 hours ago' },
	{ propertyKey: 'garden-suite' as const, name: 'Clara', city: 'Zurich', dates: 'May 8-12', timeAgo: '16 hours ago' }
];

export async function seedRecentBookings(ctx: MutationCtx, properties: PropertyMap): Promise<void> {
	for (const { propertyKey, ...rest } of RECENT_BOOKINGS) {
		await ctx.db.insert('recentBookingDisplay', {
			propertyId: properties[propertyKey],
			...rest
		});
	}
}
