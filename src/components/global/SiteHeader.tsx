"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/#capsule", label: "Capsule" },
  { href: "/#workflow", label: "Workflow" },
  { href: "/#runtime", label: "Runtime" },
  { href: "/#deploy", label: "Deploy" },
] as const;

export function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const solid = scrolled || mobileMenuOpen;

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-300",
        solid
          ? "border-b border-border bg-background/92 shadow-sm backdrop-blur-md"
          : "bg-transparent",
      )}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
        <Link
          href="/"
          className={cn(
            "font-mono text-sm font-semibold transition-colors",
            solid ? "text-foreground" : "text-white",
          )}
          onClick={() => setMobileMenuOpen(false)}
        >
          Lakebed <span className={solid ? "text-muted-foreground" : "text-white/45"}>[alpha]</span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors",
                solid ? "text-muted-foreground hover:text-foreground" : "text-white/68 hover:text-white",
              )}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="https://docs.lakebed.dev/"
            className={cn(
              "inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-semibold transition",
              solid
                ? "bg-foreground text-background hover:bg-foreground/88"
                : "bg-white text-black hover:bg-white/90",
            )}
          >
            Docs
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((value) => !value)}
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-lg border transition md:hidden",
            solid
              ? "border-border text-foreground hover:bg-muted"
              : "border-white/15 text-white hover:bg-white/10",
          )}
          aria-label="Toggle navigation"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {mobileMenuOpen ? (
        <div className="border-t border-border bg-background/98 backdrop-blur-md md:hidden">
          <div className="flex flex-col gap-1 px-5 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="https://docs.lakebed.dev/"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-2 inline-flex h-10 items-center justify-center rounded-lg bg-foreground px-4 text-sm font-semibold text-background"
            >
              Docs
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
