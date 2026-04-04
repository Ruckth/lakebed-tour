import { getStoryForRoom, type RoomStory } from '$lib/data/stories';

class NarrativeState {
	showHeadline = $state<boolean>(false);
	showSubtext = $state<boolean>(false);
	showImagineText = $state<boolean>(false);
	currentVignetteIndex = $state<number>(-1);
	visitedRoomIds = $state<Set<string>>(new Set());
	allRoomIds = $state<string[]>([]);
	tourCompleted = $state<boolean>(false);
	showConclusion = $state<boolean>(false);
	showAllVisitedPrompt = $state<boolean>(false);
	leadCaptureShown = $state<boolean>(false);
	leadEmail = $state<string>('');
	leadSubmitted = $state<boolean>(false);
	currentStory = $state<RoomStory | undefined>(undefined);
	private timers: ReturnType<typeof setTimeout>[] = [];

	allRoomsVisited = $derived(
		this.allRoomIds.length > 0 && this.allRoomIds.every((id) => this.visitedRoomIds.has(id))
	);
	visitedCount = $derived(this.visitedRoomIds.size);
	totalRooms = $derived(this.allRoomIds.length);

	init(roomIds: string[]) {
		this.allRoomIds = roomIds;
		this.visitedRoomIds = new Set();
		this.tourCompleted = false;
		this.showConclusion = false;
		this.showAllVisitedPrompt = false;
		this.leadCaptureShown = false;
		this.leadEmail = '';
		this.leadSubmitted = false;
		this.clearTimers();
		this.resetOverlayState();
	}

	enterRoom(roomId: string) {
		this.clearTimers();
		this.resetOverlayState();
		const story = getStoryForRoom(roomId);
		this.currentStory = story;
		if (!story) return;

		const next = new Set(this.visitedRoomIds);
		next.add(roomId);
		this.visitedRoomIds = next;

		this.timers.push(setTimeout(() => { this.showHeadline = true; }, 500));
		this.timers.push(setTimeout(() => { this.showHeadline = false; }, 4500));
		this.timers.push(setTimeout(() => { this.showSubtext = true; }, 1200));
		this.timers.push(setTimeout(() => { this.showSubtext = false; }, 4500));
		this.timers.push(setTimeout(() => { this.showImagineText = true; }, 6500));
		this.timers.push(setTimeout(() => { this.showImagineText = false; }, 10500));

		story.vignettes.forEach((vignette, index) => {
			this.timers.push(setTimeout(() => { this.currentVignetteIndex = index; }, vignette.delaySeconds * 1000));
			this.timers.push(setTimeout(() => {
				if (this.currentVignetteIndex === index) this.currentVignetteIndex = -1;
			}, (vignette.delaySeconds + vignette.durationSeconds) * 1000));
		});

		if (this.allRoomIds.every((id) => next.has(id))) {
			this.timers.push(setTimeout(() => { this.showAllVisitedPrompt = true; }, 8000));
		}
	}

	markRoomVisited(roomId: string) {
		const next = new Set(this.visitedRoomIds);
		next.add(roomId);
		this.visitedRoomIds = next;
	}

	completeTour() {
		this.clearTimers();
		this.resetOverlayState();
		this.tourCompleted = true;
		this.showConclusion = true;
		this.showAllVisitedPrompt = false;
	}

	showLeadCapture() { this.leadCaptureShown = true; }
	hideLeadCapture() { this.leadCaptureShown = false; }

	submitEmail() {
		if (this.leadEmail.trim()) this.leadSubmitted = true;
	}

	closeConclusion() { this.showConclusion = false; }

	private resetOverlayState() {
		this.showHeadline = false;
		this.showSubtext = false;
		this.showImagineText = false;
		this.currentVignetteIndex = -1;
	}

	private clearTimers() {
		this.timers.forEach((t) => clearTimeout(t));
		this.timers = [];
	}

	destroy() { this.clearTimers(); }
}

export const narrativeState = new NarrativeState();
