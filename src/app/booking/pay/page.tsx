import { PayClient } from "@/components/booking/PayClient";

type PaySearchParams = {
  bookingId?: string;
  booking_id?: string;
  token?: string;
  bookingToken?: string;
};

export default async function PayPage({
  searchParams,
}: {
  searchParams: Promise<PaySearchParams>;
}) {
  const params = await searchParams;
  const bookingId = params.bookingId ?? params.booking_id ?? "demo";
  const accessToken = params.token ?? params.bookingToken ?? "";

  return <PayClient bookingId={bookingId} accessToken={accessToken} />;
}
