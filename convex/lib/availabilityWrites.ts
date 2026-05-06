import type { MutationCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
import { stayDates } from './dates';

export async function blockBookingDates(
	ctx: MutationCtx,
	booking: Doc<'bookings'>,
	bookingId: Id<'bookings'>
): Promise<void> {
	for (const date of stayDates(booking.checkIn, booking.checkOut)) {
		const existing = await ctx.db
			.query('availability')
			.withIndex('by_property_date', (q) =>
				q.eq('propertyId', booking.propertyId).eq('date', date)
			)
			.first();

		if (existing) {
			await ctx.db.patch(existing._id, {
				status: 'booked',
				source: 'direct',
				bookingId
			});
		} else {
			await ctx.db.insert('availability', {
				propertyId: booking.propertyId,
				date,
				status: 'booked',
				source: 'direct',
				bookingId
			});
		}
	}
}
