"use client";

import { AIChatWidget } from "@/components/chat/AIChatWidget";
import { ChatContextProvider } from "@/components/chat/ChatContext";
import { DemoDisclaimerDialog } from "@/components/global/DemoDisclaimerDialog";
import { SiteFooter } from "@/components/global/SiteFooter";
import { SiteHeader } from "@/components/global/SiteHeader";
import { stripLocalePrefix } from "@/i18n/routing";
import { resort } from "@/lib/data/resort-config";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const normalizedPath = stripLocalePrefix(pathname);

  if (pathname.startsWith("/admin")) {
    return <div className="min-h-screen bg-background text-foreground">{children}</div>;
  }

  if (normalizedPath === "/chat") {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <DemoDisclaimerDialog />
        <SiteHeader />
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <DemoDisclaimerDialog />
      <SiteHeader />
      <ChatContextProvider>
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <AIChatWidget whatsappNumber={resort.whatsapp} lineId={resort.lineId} />
      </ChatContextProvider>
    </div>
  );
}
