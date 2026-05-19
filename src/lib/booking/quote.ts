export type BookingQuote = {
  pricePerNight: number;
  nights: number;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  directTotal: number;
  currency: string;
};

export function calculateBookingQuote({
  pricePerNight,
  nights,
  discountPercent,
  currency,
}: {
  pricePerNight: number;
  nights: number;
  discountPercent: number;
  currency: string;
}): BookingQuote {
  const safeNights = Math.max(0, nights);
  const subtotal = pricePerNight * safeNights;
  const discountAmount = Math.round(subtotal * (discountPercent / 100));

  return {
    pricePerNight,
    nights: safeNights,
    subtotal,
    discountPercent,
    discountAmount,
    directTotal: subtotal - discountAmount,
    currency,
  };
}
