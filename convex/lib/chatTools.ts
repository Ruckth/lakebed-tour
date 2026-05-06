import type { ActionCtx } from '../_generated/server';
import type { Doc } from '../_generated/dataModel';
import { api } from '../_generated/api';
import { nightsBetween } from './dates';
import { calculateDirectQuote, calculateOtaComparison, maxSavings } from './pricing';
import type { ToolDef } from './chatLlm';

export const TOOLS: ToolDef[] = [
	{
		type: 'function',
		function: {
			name: 'check_availability',
			description:
				'Check if a property is available for specific dates. Returns available or blocked dates.',
			parameters: {
				type: 'object',
				properties: {
					propertySlug: {
						type: 'string',
						description: 'The property slug (pool-villa, garden-suite, or penthouse)'
					},
					checkIn: {
						type: 'string',
						description: 'Check-in date in YYYY-MM-DD format'
					},
					checkOut: {
						type: 'string',
						description: 'Check-out date in YYYY-MM-DD format'
					}
				},
				required: ['propertySlug', 'checkIn', 'checkOut']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'calculate_price',
			description:
				'Calculate the total price for a stay including direct booking discount. Also shows OTA comparison prices.',
			parameters: {
				type: 'object',
				properties: {
					propertySlug: {
						type: 'string',
						description: 'The property slug (pool-villa, garden-suite, or penthouse)'
					},
					nights: {
						type: 'number',
						description: 'Number of nights'
					},
					guests: {
						type: 'number',
						description: 'Number of guests'
					}
				},
				required: ['propertySlug', 'nights']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'get_property_details',
			description:
				'Get full details about a property including amenities, capacity, description, and images.',
			parameters: {
				type: 'object',
				properties: {
					propertySlug: {
						type: 'string',
						description: 'The property slug (pool-villa, garden-suite, or penthouse)'
					}
				},
				required: ['propertySlug']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'list_properties',
			description: 'List all available properties with basic info and pricing.',
			parameters: {
				type: 'object',
				properties: {}
			}
		}
	}
];

type ToolArgs = Record<string, unknown>;

function findProperty(properties: Doc<'properties'>[], slug: unknown): Doc<'properties'> | null {
	if (typeof slug !== 'string') return null;
	return properties.find((p) => p.slug === slug) ?? null;
}

export async function executeTool(
	ctx: ActionCtx,
	fnName: string,
	fnArgs: ToolArgs,
	properties: Doc<'properties'>[]
): Promise<string> {
	switch (fnName) {
		case 'check_availability': {
			const property = findProperty(properties, fnArgs.propertySlug);
			if (!property) return JSON.stringify({ error: 'Property not found' });

			const checkIn = String(fnArgs.checkIn);
			const checkOut = String(fnArgs.checkOut);

			const available = await ctx.runQuery(api.availability.isAvailable, {
				propertyId: property._id,
				checkIn,
				checkOut
			});

			const nights = nightsBetween(checkIn, checkOut);
			const quote = calculateDirectQuote(property, nights);
			const pricing = await ctx.runQuery(api.properties.getPricing, {
				propertyId: property._id
			});
			const ota = calculateOtaComparison(pricing, nights);

			return JSON.stringify({
				property: property.name,
				checkIn,
				checkOut,
				nights,
				available,
				pricePerNight: property.pricePerNight,
				directPrice: Math.round(quote.directTotal / Math.max(nights, 1)),
				totalDirect: quote.directTotal,
				totalOTA: ota.length > 0 ? Math.max(...ota.map((o) => o.total)) : null,
				currency: property.currency
			});
		}

		case 'calculate_price': {
			const property = findProperty(properties, fnArgs.propertySlug);
			if (!property) return JSON.stringify({ error: 'Property not found' });

			const nights = typeof fnArgs.nights === 'number' && fnArgs.nights > 0 ? fnArgs.nights : 1;
			const quote = calculateDirectQuote(property, nights);
			const pricing = await ctx.runQuery(api.properties.getPricing, {
				propertyId: property._id
			});
			const otaComparison = calculateOtaComparison(pricing, nights);

			return JSON.stringify({
				property: property.name,
				nights,
				guests: fnArgs.guests ?? 'any',
				maxGuests: property.maxGuests,
				pricePerNight: property.pricePerNight,
				listedTotal: quote.subtotal,
				discountPercent: quote.discountPercent,
				discountAmount: quote.discountAmount,
				directTotal: quote.directTotal,
				otaComparison,
				maxSavings: maxSavings(quote.directTotal, otaComparison.map((o) => o.total)),
				currency: property.currency
			});
		}

		case 'get_property_details': {
			const property = findProperty(properties, fnArgs.propertySlug);
			if (!property) return JSON.stringify({ error: 'Property not found' });

			const oneNightQuote = calculateDirectQuote(property, 1);

			return JSON.stringify({
				name: property.name,
				slug: property.slug,
				tagline: property.tagline,
				description: property.description,
				pricePerNight: property.pricePerNight,
				directPrice: oneNightQuote.directTotal,
				currency: property.currency,
				maxGuests: property.maxGuests,
				bedrooms: property.bedrooms,
				bathrooms: property.bathrooms,
				area: property.area,
				amenities: property.amenities,
				has360Tour: true
			});
		}

		case 'list_properties': {
			const list = properties.map((p) => {
				const oneNightQuote = calculateDirectQuote(p, 1);
				return {
					name: p.name,
					slug: p.slug,
					tagline: p.tagline,
					pricePerNight: p.pricePerNight,
					directPrice: oneNightQuote.directTotal,
					maxGuests: p.maxGuests,
					bedrooms: p.bedrooms
				};
			});
			return JSON.stringify({ properties: list, currency: properties[0]?.currency ?? 'THB' });
		}

		default:
			return JSON.stringify({ error: `Unknown function: ${fnName}` });
	}
}
