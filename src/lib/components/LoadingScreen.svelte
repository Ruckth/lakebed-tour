<script lang="ts">
	import { tourState } from '$lib/stores/tour.svelte';

	let { progress = 0 }: { progress?: number } = $props();
	let visible = $derived(!tourState.allTexturesLoaded);
</script>

{#if visible}
	<div class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900">
		<h2 class="mb-6 text-2xl font-light tracking-wide text-white">Loading Virtual Tour</h2>
		<div class="h-1 w-64 overflow-hidden rounded-full bg-slate-700">
			<div
				class="h-full rounded-full bg-white transition-all duration-300"
				style="width: {progress}%"
			></div>
		</div>
		<p class="mt-3 text-sm text-slate-400">{progress}%</p>
	</div>
{/if}
