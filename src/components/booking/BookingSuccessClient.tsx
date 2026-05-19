"use client";

import Link from "next/link";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getPublicBooking, type PublicBooking } from "@/lib/react/convex-api";
import { useOptionalConvex } from "@/lib/react/convex";

export function BookingSuccessClient({
  bookingId,
  accessToken,
}: {
  bookingId: string;
  accessToken: string;
}) {
  const convex = useOptionalConvex();
  const isDemo = bookingId === "demo";
  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [loading, setLoading] = useState(Boolean(convex && !isDemo));
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function verifyBooking() {
      if (isDemo) {
        setLoading(false);
        return;
      }
      if (!convex) {
        setError("Live booking verification is unavailable. Please keep your payment reference and contact the host.");
        setLoading(false);
        return;
      }
      if (!accessToken) {
        setError("This confirmation link is missing its secure access token.");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const result = await getPublicBooking(convex, {
          id: bookingId,
          accessToken,
        });
        if (!active) return;
        if (!result) {
          setError("Booking not found.");
        } else {
          setBooking(result);
          setError("");
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to verify this booking.");
      } finally {
        if (active) setLoading(false);
      }
    }
    verifyBooking();
    return () => {
      active = false;
    };
  }, [accessToken, bookingId, convex, isDemo]);

  const confirmed = isDemo || (booking?.paymentStatus === "paid" && booking.status === "confirmed");

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center px-5 py-24">
      <div className="w-full rounded-2xl border border-border bg-card p-6 text-center shadow-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold/10">
          {confirmed ? (
            <CheckCircle2 className="h-7 w-7 text-gold" />
          ) : (
            <CircleAlert className="h-7 w-7 text-gold" />
          )}
        </div>
        <h1 className="mt-5 font-serif text-3xl font-semibold text-foreground">
          {loading ? "Verifying booking" : confirmed ? "Booking confirmed" : "Booking not confirmed"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {confirmed
            ? "Your reservation request is confirmed. The host can follow up with arrival details, airport pickup, and any special requests."
            : "We could not verify a paid booking from this link."}
        </p>
        <p className="mt-4 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
          Reference: {booking?.confirmationCode ?? bookingId}
        </p>
        {error ? (
          <Alert variant="destructive" className="mt-4 text-left">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="mt-6 grid gap-3">
          <Button asChild>
            <Link href="/">Return Home</Link>
          </Button>
          <Link
            href="/#villas"
            className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            Explore more villas
          </Link>
        </div>
      </div>
    </div>
  );
}
