"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { localizeHref } from "@/i18n/routing";

export function MobileStickyBar({
  propertyId,
}: {
  propertyId: string;
}) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("Nav");
  const chatT = useTranslations("Chat");
  const chatHref = localizeHref(`/chat?property=${encodeURIComponent(propertyId)}`, locale);

  return (
    <div className="fixed inset-x-4 bottom-3 z-40 md:hidden">
      <div className="mx-auto flex max-w-sm translate-y-1 items-center gap-2 rounded-full border border-border/80 bg-background/90 p-2 shadow-2xl shadow-black/25 backdrop-blur-xl transition-transform duration-300 focus-within:translate-y-0 hover:translate-y-0 dark:bg-card/90">
        <Link
          href={localizeHref(`/booking?unit=${propertyId}`, locale)}
          className="flex h-12 flex-1 items-center justify-center rounded-full bg-gold px-5 text-sm font-semibold text-navy shadow-lg shadow-gold/20 transition hover:bg-gold-light"
        >
          {t("book")}
        </Link>
        <Link
          href={chatHref}
          onClick={(event) => {
            event.preventDefault();
            router.push(chatHref);
          }}
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label={chatT("open")}
        >
          <MessageCircle className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}
