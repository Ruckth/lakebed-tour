<script lang="ts">
	import { narrativeState } from '$lib/stores/narrative.svelte';
	import TourProgressIndicator from './TourProgressIndicator.svelte';
</script>

<div class="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center px-4 md:top-6">
	<div class="rounded-full border border-white/10 bg-black/35 px-4 py-2 backdrop-blur-md">
		<TourProgressIndicator />
	</div>
</div>

{#if narrativeState.currentStory}
	<div class="pointer-events-none absolute left-4 top-20 z-10 max-w-xs rounded-xl border border-white/10 bg-black/35 p-4 text-white backdrop-blur-md md:left-6 md:top-24">
		<p class="font-serif text-xl font-semibold md:text-2xl">{narrativeState.currentStory.headline}</p>
		<p class="mt-1 text-xs leading-relaxed text-white/70 md:text-sm">{narrativeState.currentStory.subtext}</p>
	</div>
{/if}

{#if narrativeState.showAllVisitedPrompt}
	<div class="absolute inset-x-0 bottom-24 z-20 flex justify-center px-4 md:bottom-28">
		<button
			onclick={() => narrativeState.completeTour()}
			class="pointer-events-auto rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-navy shadow-lg shadow-black/30 transition hover:bg-gold-light"
		>
			Finish tour
		</button>
	</div>
{/if}
