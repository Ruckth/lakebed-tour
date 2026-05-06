import { mutation, query } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { nightsBetween, todayIso } from './lib/dates';
import {
	assertPositiveInt,
	assertValidEmail,
	assertValidIsoDate
} from './lib/validation';
import { calculateDirectQuote } from './lib/pricing';
import { demoCode } from './lib/codes';
import { blockBookingDates } from './lib/availabilityWrites';

const propertySnapshotValidator = v.object({
	name: v.string(),
	tagline: v.string(),
	description: v.string(),
	pricePerNight: v.number(),
	currency: v.string(),
	maxGuests: v.number(),
	bedrooms: v.number(),
	bathrooms: v.number(),
	area: v.number(),
	images: v.array(v.string()),
	amenities: v.array(v.string()),
	tourRoomIds: v.array(v.string()),
	directDiscountPercent: v.number()
});

type PropertySnapshot = {
	name: string;
	tagline: string;
	description: string;
	pricePerNight: number;
	currency: string;
	maxGuests: number;
	bedrooms: number;
	bathrooms: number;
	area: number;
	images: string[];
	amenities: string[];
	tourRoomIds: string[];
	directDiscountPercent: number;
};

async function loadOrCreateProperty(
	ctx: MutationCtx,
	slug: string,
	snapshot: PropertySnapshot | undefined
): Promise<Doc<'properties'>> {
	let property = await ctx.db
		.query('properties')
		.withIndex('by_slug', (q) => q.eq('slug', slug))
		.first();

	if (!property && snapshot) {
		const propertyId = await ctx.db.insert('properties', {
			slug,
			status: 'active',
			...snapshot
		});
		property = await ctx.db.get(propertyId);
	}

	if (!property) {
		throw new Error('Property not found');
	}

	return property;
}

async function assertNoOverlap(
	ctx: MutationCtx,
	propertyId: Id<'properties'>,
	checkIn: string,
	checkOut: string
): Promise<void> {
	const candidates = await ctx.db
		.query('bookings')
		.withIndex('by_property_checkIn', (q) =>
			q.eq('propertyId', propertyId).lt('checkIn', checkOut)
		)
		.take(500);

	const overlapping = candidates.filter(
		(b) => b.status !== 'cancelled' && b.checkOut > checkIn
	);

	if (overlapping.length > 0) {
		throw new Error('These dates are no longer available. Please choose different dates.');
	}
}

async function assertNotBlocked(
	ctx: MutationCtx,
	propertyId: Id<'properties'>,
	checkIn: string,
	checkOut: string
): Promise<void> {
	const inRange = await ctx.db
		.query('availability')
		.withIndex('by_property_date', (q) =>
			q.eq('propertyId', propertyId).gte('date', checkIn).lt('date', checkOut)
		)
		.take(366);

	const blocked = inRange.filter((a) => a.status !== 'available');

	if (blocked.length > 0) {
		throw new Error('Some of these dates are blocked. Please choose different dates.');
	}
}

export const create = mutation({
	args: {
		propertySlug: v.string(),
		guestName: v.string(),
		guestEmail: v.string(),
		guestPhone: v.string(),
		checkIn: v.string(),
		checkOut: v.string(),
		guests: v.number(),
		propertySnapshot: v.optional(propertySnapshotValidator)
	},
	handler: async (ctx, args) => {
		assertValidIsoDate(args.checkIn, 'Check-in date');
		assertValidIsoDate(args.checkOut, 'Check-out date');
		assertPositiveInt(args.guests, 'Guest count');
		assertValidEmail(args.guestEmail);

		const property = await loadOrCreateProperty(
			ctx,
			args.propertySlug,
			args.propertySnapshot
		);

		if (args.guests > property.maxGuests) {
			throw new Error(`Guest count exceeds max capacity (${property.maxGuests})`);
		}

		if (args.checkIn < todayIso()) {
			throw new Error('Check-in date cannot be in the past');
		}
		if (args.checkOut <= args.checkIn) {
			throw new Error('Check-out must be after check-in');
		}

		const nights = nightsBetween(args.checkIn, args.checkOut);
		if (!Number.isFinite(nights) || nights <= 0) {
			throw new Error('Check-out must be after check-in');
		}

		const quote = calculateDirectQuote(property, nights);

		await assertNoOverlap(ctx, property._id, args.checkIn, args.checkOut);
		await assertNotBlocked(ctx, property._id, args.checkIn, args.checkOut);

		return await ctx.db.insert('bookings', {
			propertyId: property._id,
			tenantId: property.tenantId,
			guestName: args.guestName,
			guestEmail: args.guestEmail,
			guestPhone: args.guestPhone,
			checkIn: args.checkIn,
			checkOut: args.checkOut,
			guests: args.guests,
			nights,
			subtotal: quote.subtotal,
			discountAmount: quote.discountAmount,
			total: quote.directTotal,
			currency: quote.currency,
			paymentStatus: 'pending',
			status: 'pending',
			createdAt: Date.now()
		});
	}
});

export const updatePaymentStatus = mutation({
	args: {
		bookingId: v.id('bookings'),
		paymentStatus: v.union(
			v.literal('pending'),
			v.literal('paid'),
			v.literal('failed'),
			v.literal('refunded')
		)
	},
	handler: async (ctx, args) => {
		const booking = await ctx.db.get(args.bookingId);
		if (!booking) {
			throw new Error('Booking not found');
		}

		const update: Record<string, unknown> = {
			paymentStatus: args.paymentStatus
		};
		if (args.paymentStatus === 'paid') {
			update.status = 'confirmed';
			update.paidAt = Date.now();
		}
		await ctx.db.patch(args.bookingId, update);

		if (args.paymentStatus === 'paid') {
			await blockBookingDates(ctx, booking, args.bookingId);
		}
	}
});

export const confirmDemoPayment = mutation({
	args: { bookingId: v.id('bookings') },
	handler: async (ctx, args) => {
		const booking = await ctx.db.get(args.bookingId);
		if (!booking) {
			throw new Error('Booking not found');
		}

		const bookingIdText = args.bookingId as string;
		await ctx.db.patch(args.bookingId, {
			paymentStatus: 'paid',
			status: 'confirmed',
			paidAt: booking.paidAt ?? Date.now(),
			paymentMethod: booking.paymentMethod ?? 'demo_card',
			confirmationCode: booking.confirmationCode ?? demoCode('CONF', bookingIdText),
			invoiceNumber: booking.invoiceNumber ?? demoCode('INV', bookingIdText),
			receiptNumber: booking.receiptNumber ?? demoCode('REC', bookingIdText)
		});

		await blockBookingDates(ctx, booking, args.bookingId);
		return await ctx.db.get(args.bookingId);
	}
});

export const getById = query({
	args: { id: v.id('bookings') },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	}
});

export const listByProperty = query({
	args: { propertyId: v.id('properties') },
	handler: async (ctx, args) => {
		return await ctx.db
			.query('bookings')
			.withIndex('by_property', (q) => q.eq('propertyId', args.propertyId))
			.collect();
	}
});
