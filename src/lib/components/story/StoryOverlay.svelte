<script lang="ts">
	import { narrativeState } from '$lib/stores/narrative.svelte';
	import VignetteCard from './VignetteCard.svelte';

	let currentStory = $derived(narrativeState.currentStory);
	let currentVignette = $derived(
		currentStory && narrativeState.currentVignetteIndex >= 0
			? currentStory.vignettes[narrativeState.currentVignetteIndex]
			: undefined
	);
</script>

<div class="pointer-events-none absolute inset-0 z-10 overflow-hidden">
	{#if narrativeState.showHeadline && currentStory}
		<div class="story-fade-in absolute inset-x-0 top-[15%] flex flex-col items-center px-6 text-center md:top-[18%]">
			<h2 class="font-serif text-2xl font-semibold leading-tight text-white md:text-4xl lg:text-5xl" style="text-shadow: 0 2px 12px rgba(0,0,0,0.7);">
				{currentStory.headline}
			</h2>
			{#if narrativeState.showSubtext}
				<p class="story-fade-in mt-3 max-w-md text-base text-white/80 md:mt-4 md:max-w-lg md:text-lg" style="text-shadow: 0 2px 8px rgba(0,0,0,0.6);">
					{currentStory.subtext}
				</p>
			{/if}
		</div>
	{/if}

	{#if narrativeState.showImagineText && currentStory}
		<div class="story-fade-in absolute inset-x-0 bottom-[18%] flex justify-center px-6 md:bottom-[22%]">
			<p class="font-serif text-lg italic text-white/90 md:text-xl lg:text-2xl" style="text-shadow: 0 2px 12px rgba(0,0,0,0.7);">
				{currentStory.imagineText}
			</p>
		</div>
	{/if}

	{#if currentVignette}
		<div class="pointer-events-auto absolute bottom-20 left-4 md:bottom-24 md:left-6">
			<VignetteCard text={currentVignette.text} imageUrl={currentVignette.imageUrl} />
		</div>
	{/if}

	{#if narrativeState.showAllVisitedPrompt}
		<div class="story-fade-in absolute inset-x-0 bottom-[18%] flex justify-center px-6 md:bottom-[22%]">
			<button
				class="pointer-events-auto rounded-2xl border border-white/20 bg-white/10 px-6 py-3 font-serif text-base text-white backdrop-blur-md transition-all duration-300 hover:bg-white/20 md:px-8 md:py-4 md:text-lg"
				style="text-shadow: 0 1px 6px rgba(0,0,0,0.5);"
				onclick={() => narrativeState.completeTour()}
			>
				You've seen it all. Ready to make it real?
			</button>
		</div>
	{/if}
</div>

<style>
	@keyframes story-fade-in {
		from { opacity: 0; transform: translateY(12px); }
		to { opacity: 1; transform: translateY(0); }
	}
	:global(.story-fade-in) { animation: story-fade-in 1.5s ease-out forwards; }
</style>
