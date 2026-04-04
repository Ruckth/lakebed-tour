export interface TourConclusion {
	propertyId: string;
	headline: string;
	summary: string;
	highlights: string[];
	closingLine: string;
}

export const tourConclusions: TourConclusion[] = [
	{
		propertyId: 'pool-villa',
		headline: 'Your Stay Awaits',
		summary: 'Two sun-drenched rooms, a private infinity pool, and the kind of quiet that lets you hear your own thoughts again. This is not a hotel. This is your home on the island.',
		highlights: [
			'Private infinity pool steps from your bed',
			'Open-plan living with floor-to-ceiling glass',
			'Tropical garden surrounding the villa',
			'Personal concierge for island excursions'
		],
		closingLine: 'Make this more than a daydream'
	},
	{
		propertyId: 'garden-suite',
		headline: 'Your Retreat Awaits',
		summary: 'Wrapped in tropical gardens, the Garden Suite is where the pace of life slows to the rhythm of rustling palms. Every detail invites you to stay a little longer.',
		highlights: [
			'Private terrace overlooking the gardens',
			'Rainfall shower surrounded by nature',
			'Steps from secluded island beaches',
			'Daily breakfast with fresh island flavors'
		],
		closingLine: 'Make this more than a daydream'
	},
	{
		propertyId: 'penthouse',
		headline: 'Your View Awaits',
		summary: 'The highest point on the property, the Penthouse commands views that stretch to the horizon. Designer interiors, a rooftop terrace, and an atmosphere of effortless sophistication.',
		highlights: [
			'Panoramic Gulf of Thailand views',
			'Private rooftop terrace',
			'Designer interiors with premium furnishings',
			'Full kitchen for intimate dining'
		],
		closingLine: 'Make this more than a daydream'
	}
];

export function getConclusionForProperty(propertyId: string): TourConclusion | undefined {
	return tourConclusions.find((c) => c.propertyId === propertyId);
}
