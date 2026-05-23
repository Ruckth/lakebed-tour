"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BookingRangePicker } from "@/components/booking/BookingDatePicker";
import { defaultLocale, isLocale, localizeHref } from "@/i18n/routing";
import { dateToIso, todayIsoLocal } from "@/lib/booking/dates";
import { Button } from "@/components/ui/button";

export function HomeQuickBooking() {
  const bookingT = useTranslations("Booking");
  const navT = useTranslations("Nav");
  const activeLocale = useLocale();
  const locale = isLocale(activeLocale) ? activeLocale : defaultLocale;
  const router = useRouter();
  const today = todayIsoLocal();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [error, setError] = useState("");

  function submitQuickBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!checkIn || !checkOut) {
      setError(bookingT("chooseDates"));
      return;
    }

    if (checkOut <= checkIn) {
      setError(bookingT("checkoutAfterCheckin"));
      return;
    }

    const params = new URLSearchParams({ checkin: checkIn, checkout: checkOut });
    router.push(localizeHref(`/booking?${params.toString()}`, locale));
  }

  return (
    <section className="relative z-20 px-5 pb-0 pt-4 md:px-8 md:pb-0 md:pt-6">
      <form
        onSubmit={submitQuickBooking}
        className="mx-auto grid max-w-5xl gap-3 md:grid-cols-[1fr_auto] md:items-end"
        aria-label={bookingT("directBooking")}
      >
        <BookingRangePicker
          checkIn={checkIn}
          checkOut={checkOut}
          onChange={(range) => {
            setCheckIn(range.checkIn);
            setCheckOut(range.checkOut);
            setError("");
          }}
          isDateDisabled={(date) => dateToIso(date) < today}
          onRangeChange={() => setError("")}
        />

        <Button type="submit" variant="gold" className="h-12 rounded-xl px-8 md:h-11">
          {navT("book")}
        </Button>

        {error ? (
          <p className="text-sm font-medium text-destructive md:col-span-2" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </section>
  );
}
