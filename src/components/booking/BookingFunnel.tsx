"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, CreditCard } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BookingDatePicker } from "@/components/booking/BookingDatePicker";
import { BookingPriceSummary } from "@/components/booking/BookingPriceSummary";
import {
  DateStatus,
  GuestDetailsPanel,
  GuestCountsPanel,
  ReviewPanel,
} from "@/components/booking/BookingPanels";
import { BookingStepNav } from "@/components/booking/BookingStepNav";
import { VillaSelector } from "@/components/booking/VillaSelector";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  bookingSteps,
  getHighestAllowedStepIndex,
  isValidGuestInfo,
  type BookingMode,
  type BookingProperty,
  type BookingStep,
} from "@/lib/booking/booking";
import {
  addDaysIso,
  dateToIso,
  isDateInIsoList,
  nightsBetweenIso,
  rangeIntersectsDates,
  todayIsoLocal,
} from "@/lib/booking/dates";
import { calculateBookingQuote } from "@/lib/booking/quote";
import { properties as demoProperties } from "@/lib/data/properties";
import { resort } from "@/lib/data/resort-config";
import {
  createBooking,
  getBlockedDatesByProperty,
  isPropertyAvailable,
  listLiveProperties,
} from "@/lib/react/convex-api";
import { useOptionalConvex } from "@/lib/react/convex";

const demoInventory: BookingProperty[] = demoProperties.map((property) => ({
  ...property,
  _id: `demo-${property.id}`,
  slug: property.id,
  currency: resort.currency,
  directDiscountPercent: 15,
  source: "demo",
}));

export function BookingFunnel({
  initialCheckIn = "",
  initialCheckOut = "",
  initialNights = "",
  initialGuests = "1",
  initialAdults = "",
  initialChildren = "",
  initialProperty = "garden-suite",
}: {
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialNights?: string;
  initialGuests?: string;
  initialAdults?: string;
  initialChildren?: string;
  initialProperty?: string;
}) {
  const router = useRouter();
  const convex = useOptionalConvex();
  const todayIso = todayIsoLocal();
  const parsedInitialGuests = Number(initialGuests);
  const parsedInitialNights = Number(initialNights);
  const parsedInitialAdults = Number(initialAdults);
  const parsedInitialChildren = Number(initialChildren);
  const derivedInitialNights = nightsBetweenIso(initialCheckIn, initialCheckOut);
  const startingTotalGuests =
    Number.isFinite(parsedInitialGuests) ? Math.max(1, Math.floor(parsedInitialGuests)) : 1;
  const startingChildren =
    Number.isFinite(parsedInitialChildren) ? Math.max(0, Math.floor(parsedInitialChildren)) : 0;
  const startingAdults =
    Number.isFinite(parsedInitialAdults)
      ? Math.max(1, Math.floor(parsedInitialAdults))
      : Math.max(1, startingTotalGuests - startingChildren);

  const [step, setStep] = useState<BookingStep>("select");
  const [bookingMode, setBookingMode] = useState<BookingMode>(convex ? "live" : "demo");
  const [propertyList, setPropertyList] = useState<BookingProperty[]>(demoInventory);
  const [selectedId, setSelectedId] = useState(initialProperty);
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [nights, setNights] = useState(
    Number.isFinite(parsedInitialNights) && parsedInitialNights > 0
      ? Math.floor(parsedInitialNights)
      : Math.max(derivedInitialNights, 1),
  );
  const [adults, setAdults] = useState(startingAdults);
  const [children, setChildren] = useState(startingChildren);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [notice, setNotice] = useState(
    convex
      ? "Checking live inventory and availability..."
      : "Demo booking mode is ready. Connect Convex to check live availability.",
  );
  const [blockedByProperty, setBlockedByProperty] = useState<Record<string, string[]>>({});
  const [loadingInventory, setLoadingInventory] = useState(Boolean(convex));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [dateWarning, setDateWarning] = useState("");

  useEffect(() => {
    if (!convex) {
      setBookingMode("demo");
      setLoadingInventory(false);
      return;
    }
    const client = convex;
    let active = true;

    async function load() {
      setLoadingInventory(true);
      try {
        const [rows, blocked] = await Promise.all([
          listLiveProperties(client),
          getBlockedDatesByProperty(client, {
            startDate: todayIso,
            endDate: addDaysIso(todayIso, 365),
          }),
        ]);
        if (!active) return;

        const liveRows = rows;
        if (liveRows.length > 0) {
          const liveInventory = liveRows.map((row) => ({
            id: row.slug,
            slug: row.slug,
            _id: row._id,
            name: row.name,
            tagline: row.tagline,
            description: row.description,
            pricePerNight: row.pricePerNight,
            maxGuests: row.maxGuests,
            bedrooms: row.bedrooms,
            bathrooms: row.bathrooms,
            area: row.area,
            images: row.images,
            amenities: row.amenities,
            tourRoomIds: row.tourRoomIds,
            currency: row.currency,
            directDiscountPercent: row.directDiscountPercent,
            source: "live" as const,
          }));
          setPropertyList(liveInventory);
          setSelectedId((current) => liveInventory.some((item) => item.slug === current) ? current : liveInventory[0].slug);
          setBookingMode("live");
          setNotice("");
        } else {
          setPropertyList(demoInventory);
          setBookingMode("demo");
          setNotice("Live inventory is not seeded yet, so demo booking mode is active.");
        }
        setBlockedByProperty((blocked ?? {}) as Record<string, string[]>);
      } catch {
        if (!active) return;
        setPropertyList(demoInventory);
        setBlockedByProperty({});
        setBookingMode("demo");
        setNotice("Live availability is temporarily unavailable, so demo booking mode is active.");
      } finally {
        if (active) setLoadingInventory(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [convex, todayIso]);

  const property = propertyList.find((item) => item.slug === selectedId) ?? propertyList[0];
  const propertyId = property._id;
  const propertyBlockedDates = useMemo(
    () => (propertyId ? blockedByProperty[propertyId] ?? [] : []),
    [blockedByProperty, propertyId],
  );
  const blockedDateSet = useMemo(() => new Set(propertyBlockedDates), [propertyBlockedDates]);
  const checkOut = checkIn && nights > 0 ? addDaysIso(checkIn, nights) : "";
  const guests = adults + children;
  const quote = calculateBookingQuote({
    pricePerNight: property.pricePerNight,
    nights,
    discountPercent: property.directDiscountPercent,
    currency: property.currency,
  });
  const conflicts = rangeIntersectsDates(propertyBlockedDates, checkIn, checkOut);
  const infoValid = isValidGuestInfo(guestName, guestEmail, guestPhone);
  const invalidRange = Boolean(checkIn && nights <= 0);
  const selectedStepIndex = bookingSteps.findIndex((item) => item.key === step);
  const selectValid = Boolean(property && checkIn && checkOut && nights > 0 && !invalidRange && !conflicts && !loadingInventory);
  const guestsValid = adults >= 1 && children >= 0 && guests >= 1 && guests <= property.maxGuests;
  const highestAllowedStepIndex = getHighestAllowedStepIndex({
    selectValid,
    guestsValid,
    infoValid,
  });
  const nightHelperText =
    nights > 0
      ? `${nights} night${nights > 1 ? "s" : ""} selected.`
      : "Select an arrival date and number of nights.";

  useEffect(() => {
    if (selectedStepIndex > highestAllowedStepIndex) {
      setStep(bookingSteps[highestAllowedStepIndex].key);
    }
  }, [highestAllowedStepIndex, selectedStepIndex]);

  const availablePropertyIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of propertyList) {
      const blocked = item._id ? blockedByProperty[item._id] ?? [] : [];
      if (!checkIn || !checkOut || !rangeIntersectsDates(blocked, checkIn, checkOut)) {
        ids.add(item.slug);
      }
    }
    return ids;
  }, [blockedByProperty, checkIn, checkOut, propertyList]);

  function isCheckInDisabled(date: Date) {
    const iso = dateToIso(date);
    return iso < todayIso || isDateInIsoList(date, blockedDateSet);
  }

  function selectProperty(item: BookingProperty) {
    setError("");
    if (!availablePropertyIds.has(item.slug)) {
      setDateWarning(`${item.name} is not available for those dates. Pick another villa or change dates.`);
      return;
    }
    setSelectedId(item.slug);
    const nextTotal = Math.min(Math.max(1, guests), item.maxGuests);
    const nextChildren = Math.min(children, Math.max(0, nextTotal - 1));
    setChildren(nextChildren);
    setAdults(Math.max(1, nextTotal - nextChildren));
    setDateWarning("");
  }

  function updateCheckIn(value: string) {
    setError("");
    setCheckIn(value);
    setDateWarning("");
  }

  function updateNights(value: number) {
    setError("");
    setNights(Math.max(1, Math.min(60, Math.floor(value) || 1)));
    setDateWarning("");
  }

  function currentStepValid() {
    if (step === "select") return selectValid;
    if (step === "guests") return guestsValid;
    if (step === "info") return infoValid;
    return selectValid && guestsValid && infoValid;
  }

  function next() {
    if (!currentStepValid()) return;
    setError("");
    setStep(bookingSteps[Math.min(bookingSteps.length - 1, selectedStepIndex + 1)].key);
  }

  function previous() {
    setError("");
    setStep(bookingSteps[Math.max(0, selectedStepIndex - 1)].key);
  }

  async function submitBooking() {
    setError("");
    if (!selectValid || !guestsValid || !infoValid) {
      setError("Please complete valid dates and guest details before payment.");
      return;
    }

    setSubmitting(true);
    try {
      if (bookingMode !== "live" || !convex) {
        router.push("/booking/pay?bookingId=demo");
        return;
      }

      if (!property._id || property.source !== "live") {
        throw new Error("Live booking is not available for this villa. Please refresh and try again.");
      }

      const available = await isPropertyAvailable(convex, {
        propertyId: property._id,
        checkIn,
        checkOut,
      });
      if (!available) {
        throw new Error("These dates are no longer available. Please choose different dates.");
      }

      const result = await createBooking(convex, {
        propertySlug: property.slug,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
        guestPhone: guestPhone.trim(),
        checkIn,
        checkOut,
        guests,
      });

      router.push(
        `/booking/pay?bookingId=${encodeURIComponent(result.bookingId)}&token=${encodeURIComponent(result.accessToken)}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-24 md:px-6">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">
          Direct Booking
        </p>
        <h1 className="mt-3 font-serif text-4xl font-semibold text-foreground">
          Reserve your villa
        </h1>
        {notice ? (
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{notice}</p>
        ) : null}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <Card className="p-5 md:p-7">
          <BookingStepNav
            currentStep={step}
            highestAllowedStepIndex={highestAllowedStepIndex}
            onSelectStep={setStep}
          />

          {step === "select" ? (
            <div className="space-y-5">
              {loadingInventory ? (
                <Alert>
                  <AlertTitle>Checking availability</AlertTitle>
                  <AlertDescription>Loading villas and blocked dates...</AlertDescription>
                </Alert>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <BookingDatePicker
                  label="Select date"
                  value={checkIn}
                  onChange={updateCheckIn}
                  isDateDisabled={isCheckInDisabled}
                  placeholder="Choose arrival date"
                />
                <div className="space-y-2">
                  <Label htmlFor="booking-nights">Nights</Label>
                  <Input
                    id="booking-nights"
                    type="number"
                    min={1}
                    max={60}
                    value={nights}
                    onChange={(event) => updateNights(Number(event.target.value))}
                    className="h-12 font-medium"
                  />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {invalidRange ? "Enter at least 1 night." : nightHelperText}
                  </p>
                </div>
              </div>

              <VillaSelector
                properties={propertyList}
                selectedId={selectedId}
                availablePropertyIds={availablePropertyIds}
                onSelect={selectProperty}
              />

              <DateStatus
                dateWarning={dateWarning}
                conflicts={conflicts}
                propertyName={property.name}
                nights={nights}
                discountPercent={property.directDiscountPercent}
              />
            </div>
          ) : null}

          {step === "guests" ? (
            <GuestCountsPanel
              property={property}
              adults={adults}
              childCount={children}
              onChangeAdults={setAdults}
              onChangeChildren={setChildren}
            />
          ) : null}

          {step === "info" ? (
            <GuestDetailsPanel
              guestName={guestName}
              guestEmail={guestEmail}
              guestPhone={guestPhone}
              onGuestNameChange={setGuestName}
              onGuestEmailChange={setGuestEmail}
              onGuestPhoneChange={setGuestPhone}
            />
          ) : null}

          {step === "review" ? (
            <ReviewPanel
              property={property}
              guests={guests}
              nights={nights}
              checkIn={checkIn}
              checkOut={checkOut}
              bookingMode={bookingMode}
            />
          ) : null}

          {error ? (
            <Alert variant="destructive" className="mt-5">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="mt-8 flex justify-between gap-3">
            <Button variant="outline" onClick={previous} disabled={step === "select"}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            {step === "review" ? (
              <Button onClick={submitBooking} disabled={submitting || highestAllowedStepIndex < 3}>
                <CreditCard className="h-4 w-4" />
                {submitting ? "Checking..." : "Continue to Pay"}
              </Button>
            ) : (
              <Button onClick={next} disabled={!currentStepValid()}>
                Continue
              </Button>
            )}
          </div>
        </Card>

        <BookingPriceSummary
          property={property}
          nights={nights}
          subtotal={quote.subtotal}
          discount={quote.discountAmount}
          total={quote.directTotal}
        />
      </div>
    </div>
  );
}
