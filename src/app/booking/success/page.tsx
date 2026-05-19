import { BookingSuccessClient } from "@/components/booking/BookingSuccessClient";

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ bookingId?: string; booking_id?: string; token?: string; bookingToken?: string }>;
}) {
  const params = await searchParams;
  const bookingId = params.bookingId ?? params.booking_id ?? "demo";
  const accessToken = params.token ?? params.bookingToken ?? "";

  return <BookingSuccessClient bookingId={bookingId} accessToken={accessToken} />;
}
