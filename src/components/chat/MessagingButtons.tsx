"use client";

import { useLocale } from "next-intl";
import { ContactAppBrandIcon } from "@/components/chat/ContactAppBrandIcon";
import { localizeHref } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function MessagingButtons({
  whatsappNumber,
  lineId,
  quiet = false,
}: {
  whatsappNumber: string;
  lineId?: string;
  quiet?: boolean;
}) {
  const locale = useLocale();
  const cleanNumber = whatsappNumber.replace(/[^\d]/g, "");
  const linkClassName =
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-slate-700 shadow-sm transition hover:border-gold/40 hover:bg-gold/10 hover:text-navy focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 dark:text-slate-200 dark:hover:text-gold";

  return (
    <div className={cn("flex items-center gap-2", quiet && "opacity-90")}>
      <a
        href={`https://wa.me/${cleanNumber}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Open WhatsApp chat"
        title="WhatsApp"
        className={linkClassName}
      >
        <ContactAppBrandIcon app="whatsapp" />
      </a>
      <a
        href={lineId ? `https://line.me/R/ti/p/${encodeURIComponent(lineId)}` : localizeHref("/#contact", locale)}
        target={lineId ? "_blank" : undefined}
        rel={lineId ? "noreferrer" : undefined}
        aria-label="Open LINE chat"
        title="LINE"
        className={linkClassName}
      >
        <ContactAppBrandIcon app="line" />
      </a>
    </div>
  );
}
