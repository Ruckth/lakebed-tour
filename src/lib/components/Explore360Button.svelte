<script lang="ts">
	import { Globe2 } from '@lucide/svelte';
	import { cn } from '$lib/utils';
	import { getTourHref } from '$lib/data/properties';

	type Variant = 'primary' | 'outline' | 'glass' | 'badge';
	type Size = 'sm' | 'md' | 'lg' | 'nav';

	let {
		propertyId,
		href,
		label = 'Explore 360',
		variant = 'primary',
		size = 'md',
		class: className,
		onactivate,
		onclick: externalClick
	}: {
		propertyId?: string;
		href?: string;
		label?: string;
		variant?: Variant;
		size?: Size;
		class?: string;
		onactivate?: () => void;
		onclick?: (event: MouseEvent) => void;
	} = $props();

	const resolvedHref = $derived(href ?? getTourHref(propertyId));

	const classes = $derived(
		cn(
			'group inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent font-semibold transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px',
			size === 'sm' && 'px-3 py-2 text-xs',
			size === 'md' && 'px-4 py-2.5 text-sm',
			size === 'lg' && 'px-6 py-3.5 text-sm md:text-base',
			size === 'nav' && 'h-9 px-4 text-sm',
			variant === 'primary' && 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
			variant === 'outline' && 'border-border bg-background text-foreground hover:bg-muted',
			variant === 'glass' && 'bg-white/15 text-white backdrop-blur-sm hover:bg-white/25',
			variant === 'badge' &&
				'rounded-sm bg-navy/90 px-3 py-1.5 text-[10px] text-white backdrop-blur-sm hover:bg-gold hover:text-navy dark:bg-gold/90 dark:text-navy dark:hover:bg-gold md:px-4 md:text-xs',
			className
		)
	);

	function handleClick(event: MouseEvent) {
		externalClick?.(event);
		onactivate?.();
	}
</script>

{#if onactivate}
	<button onclick={handleClick} class={classes} type="button" aria-label={label}>
		<Globe2 class="h-4 w-4" />
		<span>{label}</span>
	</button>
{:else}
	<a href={resolvedHref} class={classes} aria-label={label} onclick={handleClick}>
		<Globe2 class="h-4 w-4" />
		<span>{label}</span>
	</a>
{/if}
