<script lang="ts">
	let {
		images,
		propertyName,
		onopen360
	}: {
		images: string[];
		propertyName: string;
		onopen360: () => void;
	} = $props();

	let currentIndex = $state(0);
	let touchStartX = $state(0);
	let touchDeltaX = $state(0);
	let isDragging = $state(false);

	// Total slides = property images + 360 tour card
	const totalSlides = $derived(images.length + 1);
	const tourSlideIndex = $derived(images.length);

	function goTo(index: number) {
		currentIndex = Math.max(0, Math.min(index, totalSlides - 1));
	}

	function next() {
		goTo(currentIndex + 1);
	}

	function prev() {
		goTo(currentIndex - 1);
	}

	function handleTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
		isDragging = true;
		touchDeltaX = 0;
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isDragging) return;
		touchDeltaX = e.touches[0].clientX - touchStartX;
	}

	function handleTouchEnd() {
		if (!isDragging) return;
		isDragging = false;
		if (touchDeltaX > 60) prev();
		else if (touchDeltaX < -60) next();
		touchDeltaX = 0;
	}
</script>

<div class="relative overflow-hidden rounded-2xl bg-muted">
	<!-- Slides container -->
	<div
		class="flex transition-transform duration-500 ease-out"
		style="transform: translateX(calc(-{currentIndex * 100}% + {isDragging ? touchDeltaX : 0}px));"
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		ontouchend={handleTouchEnd}
		role="region"
		aria-label="Image gallery"
	>
		<!-- Property images -->
		{#each images as src, i}
			<div class="aspect-[16/9] w-full flex-shrink-0">
				<img
					{src}
					alt="{propertyName} - Photo {i + 1}"
					class="h-full w-full object-cover"
				/>
			</div>
		{/each}

		<!-- 360 Tour card (last slide) -->
		<div class="aspect-[16/9] w-full flex-shrink-0">
			<button
				onclick={onopen360}
				class="group relative flex h-full w-full cursor-pointer items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-black"
			>
				<!-- Background pattern -->
				<div class="absolute inset-0 opacity-10">
					<div
						class="h-full w-full"
						style="background-image: radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px); background-size: 40px 40px;"
					></div>
				</div>

				<!-- Content -->
				<div class="relative z-10 flex flex-col items-center gap-4">
					<!-- 360 icon -->
					<div class="flex h-16 w-16 items-center justify-center rounded-full border-2 border-sky-400/50 bg-sky-500/20 transition-all duration-300 group-hover:scale-110 group-hover:border-sky-400 group-hover:bg-sky-500/30">
						<svg class="h-8 w-8 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
						</svg>
					</div>

					<p class="text-base font-semibold text-white md:text-lg">Click to explore in 360&deg;</p>
				</div>

				<!-- Corner accents -->
				<div class="absolute left-6 top-6 h-8 w-8 border-l-2 border-t-2 border-sky-500/30"></div>
				<div class="absolute right-6 top-6 h-8 w-8 border-r-2 border-t-2 border-sky-500/30"></div>
				<div class="absolute bottom-6 left-6 h-8 w-8 border-b-2 border-l-2 border-sky-500/30"></div>
				<div class="absolute bottom-6 right-6 h-8 w-8 border-b-2 border-r-2 border-sky-500/30"></div>
			</button>
		</div>
	</div>

	<!-- Navigation arrows -->
	{#if currentIndex > 0}
		<button
			onclick={prev}
			aria-label="Previous image"
			class="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 shadow-lg transition hover:bg-background"
		>
			<svg class="h-5 w-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
		</button>
	{/if}
	{#if currentIndex < totalSlides - 1}
		<button
			onclick={next}
			aria-label="Next image"
			class="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 shadow-lg transition hover:bg-background"
		>
			<svg class="h-5 w-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		</button>
	{/if}

	<!-- Dots -->
	<div class="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
		{#each Array(totalSlides) as _, i}
			<button
				onclick={() => goTo(i)}
				class="h-2 rounded-full transition-all {currentIndex === i
					? i === tourSlideIndex
						? 'w-6 bg-sky-400'
						: 'w-6 bg-white'
					: 'w-2 bg-white/50 hover:bg-white/70'}"
				aria-label={i === tourSlideIndex ? '360 Tour' : `Photo ${i + 1}`}
			></button>
		{/each}
	</div>

	<!-- Slide counter -->
	<div class="absolute right-2 top-2 z-10 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm md:right-4 md:top-4 md:px-3 md:py-1 md:text-xs">
		{#if currentIndex === tourSlideIndex}
			360&deg; Tour
		{:else}
			{currentIndex + 1} / {images.length}
		{/if}
	</div>
</div>
