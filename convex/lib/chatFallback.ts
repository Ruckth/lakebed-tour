import type { Doc } from '../_generated/dataModel';
import { calculateDirectQuote } from './pricing';

export function getFallbackResponse(
	message: string,
	property: Doc<'properties'> | null
): string {
	const lower = message.toLowerCase();

	if (lower.includes('price') || lower.includes('cost') || lower.includes('how much')) {
		if (property) {
			const direct = calculateDirectQuote(property, 1).directTotal;
			return `${property.name} is ฿${property.pricePerNight.toLocaleString()}/night, but with our **${property.directDiscountPercent}% direct booking discount**, you pay just **฿${direct.toLocaleString()}/night**! That's a significant saving compared to OTA platforms. Use the booking form above to check total pricing for your dates.`;
		}
		return `We have 3 luxury properties:\n- **Pool Villa**: ฿8,500/night (฿7,225 direct)\n- **Garden Suite**: ฿4,500/night (฿3,825 direct)\n- **Penthouse**: ฿12,000/night (฿10,200 direct)\n\nAll prices include a **15% direct booking discount**. Which property interests you?`;
	}

	if (lower.includes('available') || lower.includes('book') || lower.includes('dates')) {
		return `You can check availability and book directly using the date picker on the property page. Direct booking gives you **15% off** plus free airport pickup, welcome basket, and late checkout! If you need help with specific dates, feel free to message us on WhatsApp.`;
	}

	if (lower.includes('amenit') || lower.includes('feature') || lower.includes('what')) {
		if (property) {
			return `**${property.name}** includes: ${property.amenities.join(', ')}. It's ${property.area}m² with ${property.bedrooms} bedroom(s) and ${property.bathrooms} bathroom(s), perfect for up to ${property.maxGuests} guests. Take the **360° virtual tour** to explore every room!`;
		}
	}

	return `Welcome to Seaview Residence! I can help you with:\n- **Pricing** for our luxury villas\n- **Availability** for your travel dates\n- **Property details** and amenities\n\nWhich property are you interested in? We have the Pool Villa, Garden Suite, and Penthouse in Koh Samui, Thailand.`;
}
