import { BookingFunnel } from "@/components/booking/BookingFunnel";

export const metadata = {
  title: "Book Direct — Seaview Residence",
};

type BookingSearchParams = Record<string, string | string[] | undefined>;

function getParam(params: BookingSearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<BookingSearchParams>;
}) {
  const params = await searchParams;

  return (
    <BookingFunnel
      initialCheckIn={getParam(params, "checkin")}
      initialCheckOut={getParam(params, "checkout")}
      initialNights={getParam(params, "nights")}
      initialGuests={getParam(params, "guests")}
      initialAdults={getParam(params, "adults")}
      initialChildren={getParam(params, "children")}
      initialProperty={getParam(params, "unit") ?? getParam(params, "property")}
    />
  );
}
