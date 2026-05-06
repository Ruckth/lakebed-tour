import { rooms, type Room } from '$lib/data/rooms';

class TourState {
	currentRoomId = $state<string>('living');
	previousRoomId = $state<string | null>(null);
	isTransitioning = $state<boolean>(false);
	transitionProgress = $state<number>(1);
	allTexturesLoaded = $state<boolean>(false);
	activeRoomIds = $state<string[]>(rooms.map((r) => r.id));

	currentRoom = $derived<Room>(rooms.find((r) => r.id === this.currentRoomId) ?? rooms[0]);

	previousRoom = $derived<Room | null>(
		this.previousRoomId ? (rooms.find((r) => r.id === this.previousRoomId) ?? null) : null
	);

	// Only show hotspots that link to rooms in the active set
	currentHotspots = $derived(
		this.currentRoom.hotspots.filter((h) => this.activeRoomIds.includes(h.targetRoomId))
	);

	activeRooms = $derived(
		this.activeRoomIds
			.map((roomId) => rooms.find((room) => room.id === roomId))
			.filter((room): room is Room => Boolean(room))
	);

	init(roomIds: string[]) {
		this.activeRoomIds = roomIds;
		this.currentRoomId = roomIds[0] ?? 'living';
		this.previousRoomId = null;
		this.isTransitioning = false;
		this.transitionProgress = 1;
		this.allTexturesLoaded = false;
	}

	navigateTo(roomId: string) {
		if (this.isTransitioning || roomId === this.currentRoomId) return;
		this.previousRoomId = this.currentRoomId;
		this.currentRoomId = roomId;
		this.isTransitioning = true;
		this.transitionProgress = 0;
	}

	completeTransition() {
		this.isTransitioning = false;
		this.previousRoomId = null;
		this.transitionProgress = 1;
	}
}

export const tourState = new TourState();
