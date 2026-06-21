import type { Metadata } from "next";
import { redirect } from "next/navigation";

export function generateMetadata(): Metadata {
  return {
    title: "Lakebed [alpha]",
  };
}

export default function BookingSuccessPage() {
  redirect("/");
}
