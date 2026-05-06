<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { useConvexClient } from 'convex-svelte';
	import { api } from 'convex/_generated/api';
	import { CreditCard, Lock, ShieldCheck, ArrowLeft } from '@lucide/svelte';

	const client = useConvexClient();

	type LoadStatus = 'loading' | 'ready' | 'error';

	let status = $state<LoadStatus>('loading');
	let booking = $state<any>(null);
	let property = $state<any>(null);
	let errorMessage = $state('');
	let cardNumber = $state('');
	let cardName = $state('');
	let expiry = $state('');
	let cvc = $state('');
	let submitting = $state(false);
	let submitAttempted = $state(false);

	const bookingId = $derived(page.url.searchParams.get('booking_id') ?? '');
	const cardDigits = $derived(cardNumber.replace(/\D/g, ''));
	const expiryValid = $derived(/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry));
	const cvcValid = $derived(/^\d{3,4}$/.test(cvc));
	const formValid = $derived(
		cardDigits.length >= 12 && cardName.trim().length >= 2 && expiryValid && cvcValid
	);

	onMount(async () => {
		if (!bookingId) {
			status = 'error';
			errorMessage = 'Missing booking id.';
			return;
		}

		try {
			const bookingData = await client.query(api.bookings.getById, { id: bookingId as any });
			if (!bookingData) {
				throw new Error('Booking not found.');
			}
			booking = bookingData;
			property = await client.query(api.properties.getById, { id: bookingData.propertyId });

			if (bookingData.paymentStatus === 'paid') {
				await goto(`/booking/success?booking_id=${encodeURIComponent(bookingId)}`);
				return;
			}

			status = 'ready';
		} catch (error) {
			status = 'error';
			errorMessage = error instanceof Error ? error.message : 'Unable to load this booking.';
		}
	});

	function formatCardInput(value: string) {
		return value
			.replace(/\D/g, '')
			.slice(0, 19)
			.replace(/(\d{4})(?=\d)/g, '$1 ');
	}

	function formatExpiryInput(value: string) {
		const digits = value.replace(/\D/g, '').slice(0, 4);
		return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
	}

	async function completePayment() {
		submitAttempted = true;
		if (!formValid || !bookingId || submitting) return;

		submitting = true;
		errorMessage = '';
		try {
			await client.mutation(api.bookings.confirmDemoPayment, { bookingId: bookingId as any });
			await goto(`/booking/success?booking_id=${encodeURIComponent(bookingId)}`);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to complete demo payment.';
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Demo Payment — Seaview Residence</title>
</svelte:head>

<div class="min-h-screen bg-background pt-20 pb-12 md:pt-24">
	<div class="mx-auto grid max-w-5xl gap-6 px-4 md:grid-cols-[1fr_340px] md:px-6">
		<div>
			<a
				href="/booking"
				class="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
			>
				<ArrowLeft class="h-4 w-4" />
				Back to booking
			</a>

			<div class="rounded-2xl border border-border bg-card p-5 shadow-lg md:p-6">
				<div class="mb-6 flex items-center gap-3">
					<div class="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
						<CreditCard class="h-5 w-5" />
					</div>
					<div>
						<p class="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Demo payment</p>
						<h1 class="font-serif text-2xl font-semibold text-card-foreground">Complete your booking</h1>
					</div>
				</div>

				{#if status === 'loading'}
					<div class="rounded-xl bg-muted p-6 text-center text-sm text-muted-foreground">
						Loading payment details...
					</div>
				{:else if status === 'error'}
					<div class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
						{errorMessage}
					</div>
				{:else}
					<div class="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
						This is a product demo. Use any realistic test details, such as card number
						<span class="font-semibold">4242 4242 4242 4242</span>. No payment is processed.
					</div>

					<div class="space-y-4">
						<div>
							<label for="card-number" class="block text-xs font-semibold uppercase text-muted-foreground">Card number</label>
							<input
								id="card-number"
								inputmode="numeric"
								autocomplete="cc-number"
								value={cardNumber}
								oninput={(event) => (cardNumber = formatCardInput(event.currentTarget.value))}
								placeholder="4242 4242 4242 4242"
								class="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
							/>
							{#if submitAttempted && cardDigits.length < 12}
								<p class="mt-1 text-xs text-red-600 dark:text-red-400">Enter a realistic demo card number.</p>
							{/if}
						</div>

						<div>
							<label for="card-name" class="block text-xs font-semibold uppercase text-muted-foreground">Name on card</label>
							<input
								id="card-name"
								bind:value={cardName}
								autocomplete="cc-name"
								placeholder={booking?.guestName ?? 'Jane Guest'}
								class="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
							/>
							{#if submitAttempted && cardName.trim().length < 2}
								<p class="mt-1 text-xs text-red-600 dark:text-red-400">Enter a cardholder name.</p>
							{/if}
						</div>

						<div class="grid grid-cols-2 gap-3">
							<div>
								<label for="expiry" class="block text-xs font-semibold uppercase text-muted-foreground">Expiry</label>
								<input
									id="expiry"
									inputmode="numeric"
									autocomplete="cc-exp"
									value={expiry}
									oninput={(event) => (expiry = formatExpiryInput(event.currentTarget.value))}
									placeholder="12/30"
									class="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
								/>
								{#if submitAttempted && !expiryValid}
									<p class="mt-1 text-xs text-red-600 dark:text-red-400">Use MM/YY.</p>
								{/if}
							</div>
							<div>
								<label for="cvc" class="block text-xs font-semibold uppercase text-muted-foreground">CVC</label>
								<input
									id="cvc"
									inputmode="numeric"
									autocomplete="cc-csc"
									bind:value={cvc}
									placeholder="123"
									maxlength="4"
									class="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
								/>
								{#if submitAttempted && !cvcValid}
									<p class="mt-1 text-xs text-red-600 dark:text-red-400">Use 3 or 4 digits.</p>
								{/if}
							</div>
						</div>

						{#if errorMessage}
							<div class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
								{errorMessage}
							</div>
						{/if}

						<button
							onclick={completePayment}
							disabled={submitting}
							class="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{submitting ? 'Completing demo payment...' : 'Complete demo payment'}
						</button>
					</div>
				{/if}
			</div>
		</div>

		<aside class="rounded-2xl border border-border bg-card p-5 shadow-lg md:self-start">
			{#if booking}
				<div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-green-600 dark:text-green-400">
					<ShieldCheck class="h-4 w-4" />
					Secure demo checkout
				</div>
				<h2 class="mt-4 font-serif text-2xl font-semibold text-card-foreground">
					{property?.name ?? 'Villa booking'}
				</h2>
				<div class="mt-4 space-y-3 text-sm">
					<div class="flex justify-between gap-4">
						<span class="text-muted-foreground">Dates</span>
						<span class="text-right font-medium text-foreground">{booking.checkIn} → {booking.checkOut}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-muted-foreground">Nights</span>
						<span class="font-medium text-foreground">{booking.nights}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-muted-foreground">Guests</span>
						<span class="font-medium text-foreground">{booking.guests}</span>
					</div>
					<div class="border-t border-border pt-3">
						<div class="flex justify-between text-sm">
							<span class="text-muted-foreground">Subtotal</span>
							<span class="text-foreground">฿{booking.subtotal.toLocaleString()}</span>
						</div>
						<div class="mt-2 flex justify-between text-sm text-green-600 dark:text-green-400">
							<span>Direct discount</span>
							<span>-฿{booking.discountAmount.toLocaleString()}</span>
						</div>
						<div class="mt-3 flex justify-between border-t border-border pt-3 text-base font-bold">
							<span>Total</span>
							<span>฿{booking.total.toLocaleString()}</span>
						</div>
					</div>
				</div>
				<p class="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
					<Lock class="h-3.5 w-3.5" />
					No real card data leaves this demo page.
				</p>
			{:else}
				<div class="h-48 animate-pulse rounded-xl bg-muted"></div>
			{/if}
		</aside>
	</div>
</div>
