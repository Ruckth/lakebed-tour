import type { Doc } from '../_generated/dataModel';

export type PriceQuote = {
	pricePerNight: number;
	nights: number;
	subtotal: number;
	discountPercent: number;
	discountAmount: number;
	directTotal: number;
	currency: string;
};

export type OtaQuote = {
	platform: string;
	displayName: string;
	nightlyRate: number;
	serviceFee: number;
	cleaningFee: number;
	total: number;
};

export function calculateDirectQuote(property: Doc<'properties'>, nights: number): PriceQuote {
	const subtotal = property.pricePerNight * nights;
	const discountPercent = property.directDiscountPercent;
	const discountAmount = Math.round(subtotal * (discountPercent / 100));
	const directTotal = subtotal - discountAmount;

	return {
		pricePerNight: property.pricePerNight,
		nights,
		subtotal,
		discountPercent,
		discountAmount,
		directTotal,
		currency: property.currency
	};
}

export function calculateOtaComparison(pricing: Doc<'pricing'> | null, nights: number): OtaQuote[] {
	if (!pricing) return [];

	return pricing.otaPricing.map((ota) => {
		const stayBeforeFees = ota.nightlyRate * nights;
		const serviceFee = Math.round(stayBeforeFees * (ota.serviceFeePercent / 100));
		return {
			platform: ota.platform,
			displayName: ota.displayName,
			nightlyRate: ota.nightlyRate,
			serviceFee,
			cleaningFee: ota.cleaningFee,
			total: stayBeforeFees + serviceFee + ota.cleaningFee
		};
	});
}

export function maxSavings(directTotal: number, otaTotals: number[]): number {
	if (otaTotals.length === 0) return 0;
	return Math.max(...otaTotals) - directTotal;
}
