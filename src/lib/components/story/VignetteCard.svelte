<script lang="ts">
	let { text, imageUrl }: { text: string; imageUrl: string } = $props();
</script>

<div class="vignette-enter w-[260px] overflow-hidden rounded-2xl border border-white/20 shadow-2xl backdrop-blur-sm md:w-[280px]">
	<div class="relative aspect-[4/3]">
		<img src={imageUrl} alt="" class="h-full w-full object-cover" />
		<div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
		<p class="absolute inset-x-0 bottom-0 px-4 pb-4 font-serif text-sm leading-snug text-white md:text-base" style="text-shadow: 0 1px 8px rgba(0,0,0,0.6);">
			{text}
		</p>
	</div>
</div>

<style>
	@keyframes vignette-enter {
		from { opacity: 0; transform: scale(0.95); }
		to { opacity: 1; transform: scale(1); }
	}
	:global(.vignette-enter) { animation: vignette-enter 0.8s ease-out forwards; }
</style>
