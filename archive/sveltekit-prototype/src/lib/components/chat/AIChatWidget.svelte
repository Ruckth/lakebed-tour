<script lang="ts">
  import { useConvexClient, useQuery } from "convex-svelte";
  import { api } from "convex/_generated/api";
  import { getPropertyById, type Property } from "$lib/data/properties";
  import { MessageCircle, X, Send, Sparkles, ArrowRight } from "@lucide/svelte";
  import MessagingButtons from "./MessagingButtons.svelte";

  type SuggestionStage = 0 | 1 | 2;
  type Suggestion = {
    text: string;
    answer: string;
  };

  function getGenericSuggestions(): Record<SuggestionStage, Suggestion[]> {
    return {
      0: [
        {
          text: "What villa types do you have?",
          answer:
            'We offer **3 villa types**: Pool Villa (2BR, private infinity pool), Garden Suite (1BR, ocean view), and Penthouse (2BR, panoramic stay). Scroll up to "Our Villas" to compare the feel, size, and nightly rate.',
        },
        {
          text: "Which villa is best for a couple?",
          answer: `The **Garden Suite** is our couples' favorite for a quieter, more intimate stay. If you want more space and your own pool, the **Pool Villa** is the step-up choice.`,
        },
      ],
      1: [
        {
          text: "What's the nightly rate?",
          answer:
            "Rates currently start from **฿4,500/night** for Garden Suite, **฿8,500/night** for Pool Villa, and **฿12,000/night** for the Penthouse before direct-booking savings. Open any villa card for details and the next best step.",
        },
        {
          text: "Which villa is available next week?",
          answer:
            "Availability changes quickly, so the best next step is to use the booking flow or open a villa page and check the calendar. If you need a fast recommendation, message the host on **WhatsApp** below and we can point you to the best fit.",
        },
      ],
      2: [
        {
          text: "What's included in direct booking?",
          answer:
            "Direct booking saves about **15%** versus OTAs and keeps things simple with no extra service or cleaning fees. Eligible stays can include airport transfer, and free cancellation is available up to **48 hours** before check-in.",
        },
        {
          text: "How do I reserve now?",
          answer:
            "Tap **Book** to choose your villa, dates, and guest count. If you want help confirming the best option first, use **WhatsApp** or **LINE** below and the host can guide you through it quickly.",
        },
      ],
    };
  }

  function getPropertySuggestions(
    propertyName: string,
    property?: Property,
  ): Record<SuggestionStage, Suggestion[]> {
    const resolvedName = propertyName || "this villa";
    const guestCopy = property
      ? `This villa accommodates **${property.maxGuests} guests** with **${property.bedrooms} bedroom${property.bedrooms > 1 ? "s" : ""}**, **${property.bathrooms} bathroom${property.bathrooms > 1 ? "s" : ""}**, and **${property.area} m²** of space.`
      : "This villa has its own guest-capacity, bedroom, bathroom, and space details listed on the page.";
    const amenitiesCopy = property?.amenities.length
      ? `This villa includes **${property.amenities.join(", ")}**.`
      : "This villa includes a curated set of amenities shown on the page.";

    return {
      0: [
        {
          text: `Is the ${resolvedName} available next week?`,
          answer: `Please use the **booking calendar** on this page to check live availability for the ${resolvedName}. For same-day requests, tap **WhatsApp** or **LINE** below for instant confirmation.`,
        },
        {
          text: `What's the nightly rate for the ${resolvedName} for 3 nights?`,
          answer: `Our **direct rate** saves you ~15% vs Agoda/Booking. You'll see the exact nightly price, total, and any current offers in the pricing card. Longer stays unlock automatic discounts.`,
        },
      ],
      1: [
        {
          text: "How many guests can stay here?",
          answer: `${guestCopy} You can also review the full gallery and room details on this page before booking.`,
        },
        {
          text: "What amenities are included?",
          answer: `${amenitiesCopy} Scroll a little further for the full amenities list, guest reviews, and direct booking benefits.`,
        },
      ],
      2: [
        {
          text: "How do I book this villa?",
          answer: `Use the booking form on this page to choose your dates and guest count for **${resolvedName}**. If you want us to double-check availability first, message the host on **WhatsApp** or **LINE** below.`,
        },
        {
          text: "Can I talk to the host on WhatsApp?",
          answer:
            "Yes. Use the **WhatsApp** button below for the fastest reply from the host. For same-day stays or special requests, that is the best channel.",
        },
      ],
    };
  }

  function getNextSuggestionStage(
    messageText: string,
    currentStage: SuggestionStage,
  ): SuggestionStage {
    const normalized = messageText.toLowerCase();

    if (
      /(book|reserve|reservation|host|whatsapp|line|contact)/.test(normalized)
    ) {
      return 2;
    }

    if (
      /(price|pricing|rate|nightly|cost|available|availability|calendar|date|dates|guest|guests|amenit|bed|bath|room|details)/.test(
        normalized,
      )
    ) {
      return 2;
    }

    if (
      /(villa|type|couple|family|which|best|compare|recommend)/.test(normalized)
    ) {
      return 1;
    }

    return currentStage < 2 ? ((currentStage + 1) as SuggestionStage) : 2;
  }

  let {
    propertySlug = "",
    propertyName = "",
    whatsappNumber = "+66123456789",
    lineId = "",
  }: {
    propertySlug?: string;
    propertyName?: string;
    whatsappNumber?: string;
    lineId?: string;
  } = $props();

  const client = useConvexClient();

  let isOpen = $state(false);
  let sessionId = $state<string | null>(null);
  let inputText = $state("");
  let isTyping = $state(false);
  let messagesContainer = $state<HTMLDivElement | null>(null);
  let suggestionStage = $state<SuggestionStage>(0);

  // Reactive query for session messages (now from dedicated chatMessages table)
  const messagesQuery = useQuery(api.chat.getMessages, () =>
    sessionId ? { sessionId: sessionId as any } : "skip",
  );

  const messages = $derived(messagesQuery.data ?? []);
  const currentProperty = $derived(
    propertySlug ? getPropertyById(propertySlug) : undefined,
  );
  const suggestionSets = $derived(
    propertySlug
      ? getPropertySuggestions(propertyName || "this villa", currentProperty)
      : getGenericSuggestions(),
  );
  const activeSuggestions = $derived(suggestionSets[suggestionStage]);
  const lastMessage = $derived(messages[messages.length - 1] ?? null);
  const showSuggestions = $derived(
    !isTyping && (messages.length === 0 || lastMessage?.role === "assistant"),
  );

  // Auto-scroll to bottom when messages change
  $effect(() => {
    if (messages.length > 0 && messagesContainer) {
      requestAnimationFrame(() => {
        messagesContainer?.scrollTo({
          top: messagesContainer.scrollHeight,
          behavior: "smooth",
        });
      });
    }
  });

  async function ensureSession() {
    if (sessionId) return sessionId;

    try {
      const id = await client.mutation(api.chat.createSession, {
        propertySlug: propertySlug || undefined,
        propertyId: undefined,
        channel: "web",
      });
      sessionId = id;
      suggestionStage = 0;
      return id;
    } catch (e) {
      console.error("Failed to create chat session:", e);
      return null;
    }
  }

  async function openChat() {
    isOpen = true;
    await ensureSession();
  }

  function closeChat() {
    isOpen = false;
  }

  async function sendPreset(qr: { text: string; answer: string }) {
    if (isTyping) return;
    const activeSessionId = await ensureSession();
    if (!activeSessionId) return;
    await client.mutation(api.chat.addMessage, {
      sessionId: activeSessionId as any,
      role: "user",
      content: qr.text,
    });
    await client.mutation(api.chat.addMessage, {
      sessionId: activeSessionId as any,
      role: "assistant",
      content: qr.answer,
    });
    suggestionStage = getNextSuggestionStage(qr.text, suggestionStage);
  }

  async function sendMessage(text?: string) {
    const messageText = text ?? inputText.trim();
    if (!messageText || isTyping) return;
    const activeSessionId = await ensureSession();
    if (!activeSessionId) return;

    inputText = "";
    isTyping = true;
    suggestionStage = getNextSuggestionStage(messageText, suggestionStage);

    try {
      await client.action(api.chatAi.respond, {
        sessionId: activeSessionId as any,
        userMessage: messageText,
        propertySlug: propertySlug || undefined,
      });
    } catch (e) {
      console.error("Chat error:", e);
      // Add error message locally
      await client.mutation(api.chat.addMessage, {
        sessionId: activeSessionId as any,
        role: "assistant",
        content:
          "Sorry, I'm having trouble connecting. Please try again or message us on WhatsApp for immediate help.",
      });
    } finally {
      isTyping = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function formatMessage(content: string): string {
    const escaped = content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

    return escaped
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
  }
</script>

<!-- Floating chat button -->
{#if !isOpen}
  <button
    onclick={openChat}
    class="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-all hover:scale-105 hover:shadow-2xl active:scale-95 md:bottom-8 md:right-8"
    aria-label="Open AI chat"
    style="padding-bottom: env(safe-area-inset-bottom, 0px);"
  >
    <MessageCircle class="h-6 w-6" />
    <span class="absolute -right-0.5 -top-0.5 flex h-3 w-3">
      <span
        class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"
      ></span>
      <span class="relative inline-flex h-3 w-3 rounded-full bg-green-500"
      ></span>
    </span>
  </button>
{/if}

<!-- Chat window -->
{#if isOpen}
  <div
    class="fixed bottom-0 right-0 z-50 flex h-full w-full flex-col bg-card shadow-2xl md:bottom-8 md:right-8 md:h-[600px] md:w-[400px] md:rounded-2xl md:border md:border-border"
  >
    <!-- Header -->
    <div
      class="flex items-center justify-between border-b border-border bg-primary/5 px-4 py-3 md:rounded-t-2xl"
    >
      <div class="flex items-center gap-3">
        <div
          class="flex h-9 w-9 items-center justify-center rounded-full bg-primary"
        >
          <Sparkles class="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <h3 class="text-sm font-semibold text-foreground">Villa Concierge</h3>
          <p class="text-xs text-muted-foreground">
            {#if isTyping}
              Thinking...
            {:else}
              Ask about pricing & availability
            {/if}
          </p>
        </div>
      </div>
      <button
        onclick={closeChat}
        class="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        aria-label="Close chat"
      >
        <X class="h-4 w-4" />
      </button>
    </div>

    <!-- Messages -->
    <div
      bind:this={messagesContainer}
      class="flex-1 overflow-y-auto px-4 py-4 space-y-3"
    >
      {#if messages.length === 0 && !isTyping}
        <!-- Welcome message -->
        <div class="flex gap-2.5">
          <div
            class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary"
          >
            <Sparkles class="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <div
            class="max-w-[80%] rounded-2xl rounded-tl-md bg-muted px-3.5 py-2.5 text-sm text-foreground"
          >
            {#if propertyName}
              Welcome! I'm your villa concierge. Ask me anything about the <strong
                >{propertyName}</strong
              > — availability, pricing, amenities, or local recommendations.
            {:else}
              Welcome to Seaview Residence. I can help you find the perfect
              villa for your stay. Ask about our villas, pricing, or
              availability.
            {/if}
          </div>
        </div>
      {/if}

      {#each messages as msg (msg._id)}
        {#if msg.role === "user"}
          <div class="flex justify-end">
            <div
              class="max-w-[80%] rounded-2xl rounded-tr-md bg-primary px-3.5 py-2.5 text-sm text-primary-foreground"
            >
              {msg.content}
            </div>
          </div>
        {:else}
          <div class="flex gap-2.5">
            <div
              class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary"
            >
              <Sparkles class="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <div
              class="max-w-[80%] rounded-2xl rounded-tl-md bg-muted px-3.5 py-2.5 text-sm text-foreground"
            >
              {@html formatMessage(msg.content)}
            </div>
          </div>
        {/if}
      {/each}

      {#if showSuggestions}
        <div class="flex flex-wrap gap-2 pl-9">
          {#each activeSuggestions as suggestion (suggestion.text)}
            <button
              onclick={() => sendPreset(suggestion)}
              class="inline-flex max-w-[80%] items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-left text-xs font-medium text-foreground transition hover:bg-muted"
            >
              <span>{suggestion.text}</span>
              <ArrowRight class="h-3 w-3 flex-shrink-0 text-muted-foreground" />
            </button>
          {/each}
        </div>
      {/if}

      {#if isTyping}
        <div class="flex gap-2.5">
          <div
            class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary"
          >
            <Sparkles class="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <div class="rounded-2xl rounded-tl-md bg-muted px-4 py-3">
            <div class="flex gap-1">
              <span
                class="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce"
                style="animation-delay: 0ms"
              ></span>
              <span
                class="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce"
                style="animation-delay: 150ms"
              ></span>
              <span
                class="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce"
                style="animation-delay: 300ms"
              ></span>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Messaging buttons bar -->
    <div class="border-t border-border bg-muted/30 px-4 py-2">
      <div class="flex items-center justify-between">
        <span class="text-[10px] text-muted-foreground"
          >Prefer to chat with the host?</span
        >
        <MessagingButtons {whatsappNumber} {lineId} {propertyName} />
      </div>
    </div>

    <!-- Input -->
    <div
      class="border-t border-border px-4 py-3"
      style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom));"
    >
      <div class="flex items-center gap-2">
        <input
          type="text"
          bind:value={inputText}
          onkeydown={handleKeydown}
          placeholder="Ask about pricing, availability..."
          disabled={isTyping}
          class="flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        />
        <button
          onclick={() => sendMessage()}
          disabled={!inputText.trim() || isTyping}
          class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          <Send class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
{/if}
