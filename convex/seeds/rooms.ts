import type { MutationCtx } from '../_generated/server';
import type { PropertyMap } from './properties';

const ROOMS = [
	{
		propertyKey: 'pool-villa' as const,
		slug: 'pv-living',
		name: 'Living Area',
		imagePath: '/pool-villa-living.jpg',
		hotspots: [
			{
				id: 'pv-living-to-pool',
				position: [300, -30, -200],
				targetRoomSlug: 'pv-pool',
				label: 'Pool Area'
			}
		]
	},
	{
		propertyKey: 'pool-villa' as const,
		slug: 'pv-pool',
		name: 'Pool Area',
		imagePath: '/pool-villa-pool.jpg',
		hotspots: [
			{
				id: 'pv-pool-to-living',
				position: [-300, 0, 200],
				targetRoomSlug: 'pv-living',
				label: 'Living Area'
			}
		]
	},
	{
		propertyKey: 'garden-suite' as const,
		slug: 'gs-lounge',
		name: 'Lounge',
		imagePath: '/garden-suite-interior.jpg',
		hotspots: [
			{
				id: 'gs-lounge-to-dining',
				position: [250, -30, 300],
				targetRoomSlug: 'gs-dining',
				label: 'Dining Area'
			}
		]
	},
	{
		propertyKey: 'garden-suite' as const,
		slug: 'gs-dining',
		name: 'Dining Area',
		imagePath: '/garden-dining360.jpg',
		hotspots: [
			{
				id: 'gs-dining-to-lounge',
				position: [-250, 0, -300],
				targetRoomSlug: 'gs-lounge',
				label: 'Lounge'
			}
		]
	},
	{
		propertyKey: 'penthouse' as const,
		slug: 'ph-bedroom',
		name: 'Master Bedroom',
		imagePath: '/penthouse-bedroom.jpg',
		hotspots: []
	}
];

export async function seedRooms(ctx: MutationCtx, properties: PropertyMap): Promise<void> {
	for (const { propertyKey, ...rest } of ROOMS) {
		await ctx.db.insert('rooms', {
			propertyId: properties[propertyKey],
			...rest
		});
	}
}
