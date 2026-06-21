import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Manrope, Roboto_Mono } from "next/font/google";
import "../app.css";
import { SiteShell } from "@/components/global/SiteShell";
import { getClerkPublishableKey, isClerkConfigured } from "@/lib/clerk-config";
import { themeInitScript } from "@/lib/theme";
import { Providers } from "./providers";

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL("https://lakebed.dev"),
    title: "Lakebed [alpha] - Agent-native app runtime",
    description:
      "Lakebed is an agent-native CLI and runtime for building small full-stack TypeScript apps called capsules.",
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "256x256" },
        { url: "/icon.png", type: "image/png", sizes: "512x512" },
      ],
    },
    openGraph: {
      type: "website",
      siteName: "Lakebed",
      title: "Lakebed [alpha]",
      description:
        "Let agents build small full-stack TypeScript apps called capsules, then inspect, iterate, and deploy without leaving code.",
    },
    twitter: {
      card: "summary",
      title: "Lakebed [alpha]",
      description:
        "Agent-native CLI and runtime for building small full-stack TypeScript apps.",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const convexUrl =
    process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.PUBLIC_CONVEX_URL;
  const clerkPublishableKey = getClerkPublishableKey();
  const clerkEnabled = isClerkConfigured();
  const app = (
    <Providers convexUrl={convexUrl} clerkEnabled={clerkEnabled}>
      <SiteShell>{children}</SiteShell>
    </Providers>
  );

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${sans.variable} ${mono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {clerkEnabled ? (
            <ClerkProvider publishableKey={clerkPublishableKey}>{app}</ClerkProvider>
          ) : (
            app
          )}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
