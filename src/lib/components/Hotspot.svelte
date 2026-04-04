<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import { HTML } from '@threlte/extras';
	import { DoubleSide } from 'three';

	let {
		position,
		label,
		onclick
	}: {
		position: [number, number, number];
		label: string;
		onclick: () => void;
	} = $props();

	let hovered = $state(false);
	let scale = $state(1);

	useTask(() => {
		const pulse = Math.sin(Date.now() * 0.003) * 0.2 + 1;
		scale = hovered ? 1.5 : pulse;
	});
</script>

<T.Group {position}>
	<!-- Large clickable area -->
	<T.Mesh
		{onclick}
		onpointerenter={() => (hovered = true)}
		onpointerleave={() => (hovered = false)}
		scale.x={scale}
		scale.y={scale}
		scale.z={scale}
	>
		<T.SphereGeometry args={[12, 32, 32]} />
		<T.MeshBasicMaterial color="#ffffff" transparent opacity={0} side={DoubleSide} />
	</T.Mesh>

	<!-- Outer ring -->
	<T.Mesh scale.x={scale} scale.y={scale} scale.z={scale}>
		<T.TorusGeometry args={[10, 1.8, 16, 48]} />
		<T.MeshBasicMaterial
			color={hovered ? '#60a5fa' : '#ffffff'}
			transparent
			opacity={hovered ? 0.95 : 0.7}
			side={DoubleSide}
		/>
	</T.Mesh>

	<!-- Center dot -->
	<T.Mesh scale.x={scale * 0.6} scale.y={scale * 0.6} scale.z={scale * 0.6}>
		<T.SphereGeometry args={[4, 16, 16]} />
		<T.MeshBasicMaterial
			color={hovered ? '#93c5fd' : '#e2e8f0'}
			transparent
			opacity={0.9}
		/>
	</T.Mesh>

	<!-- HTML label -->
	<HTML
		position.y={22}
		center
		pointerEvents="none"
		transform
	>
		<div
			class="whitespace-nowrap rounded-lg px-4 py-2 text-center text-sm font-semibold shadow-lg transition-all {hovered
				? 'scale-110 bg-white text-black'
				: 'bg-black/70 text-white backdrop-blur-sm'}"
			style="pointer-events: none;"
		>
			{label} &rarr;
		</div>
	</HTML>
</T.Group>
