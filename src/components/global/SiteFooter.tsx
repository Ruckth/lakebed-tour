import Link from "next/link";

const footerLinks = [
  { href: "https://docs.lakebed.dev/", label: "Docs" },
  { href: "https://docs.lakebed.dev/examples/todo", label: "Todo example" },
  { href: "https://docs.lakebed.dev/examples/guestbook", label: "Guestbook" },
  { href: "https://lakebed.dev/", label: "lakebed.dev" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 md:grid-cols-[1fr_auto] md:px-8">
        <div>
          <p className="font-mono text-lg font-semibold text-foreground">
            Lakebed <span className="text-muted-foreground">[alpha]</span>
          </p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Agent-native CLI and runtime for building small full-stack TypeScript apps.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground md:text-right">
          {footerLinks.map((link) => (
            <Link key={link.href} className="transition hover:text-foreground" href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
