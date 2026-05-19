"use client";

import { CheckCircle2, Mail, Minus, Phone, Plus, Shield, User } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDisplayDate } from "@/lib/booking/dates";
import type { BookingMode, BookingProperty } from "@/lib/booking/booking";

function clampGuestCount(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function GuestCountsPanel({
  property,
  adults,
  childCount,
  onChangeAdults,
  onChangeChildren,
}: {
  property: BookingProperty;
  adults: number;
  childCount: number;
  onChangeAdults: (guests: number) => void;
  onChangeChildren: (guests: number) => void;
}) {
  const totalGuests = adults + childCount;
  const remainingCapacity = Math.max(0, property.maxGuests - totalGuests);

  function updateAdults(nextAdults: number) {
    const clampedAdults = clampGuestCount(nextAdults, 1, property.maxGuests);
    const maxChildren = Math.max(0, property.maxGuests - clampedAdults);
    onChangeAdults(clampedAdults);
    if (childCount > maxChildren) onChangeChildren(maxChildren);
  }

  function updateChildren(nextChildren: number) {
    onChangeChildren(clampGuestCount(nextChildren, 0, Math.max(0, property.maxGuests - adults)));
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground">Guests</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {property.name} hosts up to {property.maxGuests} guests.
      </p>
      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Adults</p>
            <p className="text-xs text-muted-foreground">Age 13+</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => updateAdults(adults - 1)} disabled={adults <= 1}>
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center text-lg font-semibold">{adults}</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => updateAdults(adults + 1)}
              disabled={remainingCapacity <= 0}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Children</p>
            <p className="text-xs text-muted-foreground">Age 0-12</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => updateChildren(childCount - 1)}
              disabled={childCount <= 0}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center text-lg font-semibold">{childCount}</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => updateChildren(childCount + 1)}
              disabled={remainingCapacity <= 0}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {totalGuests} total guest{totalGuests > 1 ? "s" : ""}.
      </p>
    </div>
  );
}

export function GuestDetailsPanel({
  guestName,
  guestEmail,
  guestPhone,
  onGuestNameChange,
  onGuestEmailChange,
  onGuestPhoneChange,
}: {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  onGuestNameChange: (value: string) => void;
  onGuestEmailChange: (value: string) => void;
  onGuestPhoneChange: (value: string) => void;
}) {
  const fields = [
    {
      id: "booking-guest-name",
      icon: User,
      label: "Full name",
      value: guestName,
      set: onGuestNameChange,
      type: "text",
      autoComplete: "name",
    },
    {
      id: "booking-guest-email",
      icon: Mail,
      label: "Email",
      value: guestEmail,
      set: onGuestEmailChange,
      type: "email",
      autoComplete: "email",
    },
    {
      id: "booking-guest-phone",
      icon: Phone,
      label: "Phone / WhatsApp",
      value: guestPhone,
      set: onGuestPhoneChange,
      type: "tel",
      autoComplete: "tel",
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground">Guest details</h2>
      {fields.map((field) => {
        const Icon = field.icon;
        return (
          <div key={field.label} className="space-y-2">
            <Label htmlFor={field.id}>{field.label}</Label>
            <div className="relative">
              <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id={field.id}
                type={field.type}
                value={field.value}
                autoComplete={field.autoComplete}
                onChange={(event) => field.set(event.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ReviewPanel({
  property,
  guests,
  nights,
  checkIn,
  checkOut,
  bookingMode,
}: {
  property: BookingProperty;
  guests: number;
  nights: number;
  checkIn: string;
  checkOut: string;
  bookingMode: BookingMode;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground">Review and pay</h2>
      <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
        {property.name}, {guests} guest{guests > 1 ? "s" : ""}, {nights} night
        {nights > 1 ? "s" : ""}, {formatDisplayDate(checkIn)} to {formatDisplayDate(checkOut)}.
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Shield className="h-4 w-4 text-gold" />
        {bookingMode === "live"
          ? "Your booking will be checked once more before payment."
          : "Demo payment will not create a live booking."}
      </div>
    </div>
  );
}

export function DateStatus({
  dateWarning,
  conflicts,
  propertyName,
  nights,
  discountPercent,
}: {
  dateWarning: string;
  conflicts: boolean;
  propertyName: string;
  nights: number;
  discountPercent: number;
}) {
  return (
    <>
      {dateWarning ? (
        <Alert variant="warning">
          <AlertDescription>{dateWarning}</AlertDescription>
        </Alert>
      ) : null}
      {conflicts ? (
        <Alert variant="destructive">
          <AlertTitle>Dates blocked</AlertTitle>
          <AlertDescription>
            {propertyName} is not available for part of this stay. Please choose another villa or date range.
          </AlertDescription>
        </Alert>
      ) : null}
      {nights > 0 && !conflicts ? (
        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-gold" />
          {nights} night{nights > 1 ? "s" : ""} selected. Direct booking saves {discountPercent}%.
        </div>
      ) : null}
    </>
  );
}
