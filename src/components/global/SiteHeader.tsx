"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { ThemeToggle } from "@/components/global/ThemeToggle";
import { resort } from "@/lib/data/resort-config";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/#villas", label: "Villas" },
  { href: "/#amenities", label: "Amenities" },
  { href: "/#reviews", label: "Reviews" },
  { href: "/#contact", label: "Contact" },
];

export function SiteHeader({ clerkEnabled = false }: { clerkEnabled?: boolean }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isHome = pathname === "/";
  const solid = scrolled || !isHome || mobileMenuOpen;

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40);
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
          ? "border-b border-border bg-background/95 shadow-sm backdrop-blur-md"
          : "bg-transparent",
      )}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 md:px-8 md:py-4">
        <Link href="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
          <span
            className={cn(
              "font-serif text-xl font-semibold tracking-tight md:text-2xl",
              solid ? "text-foreground" : "text-white",
            )}
          >
            {resort.name}
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors",
                solid
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-white/70 hover:text-white",
              )}
            >
              {link.label}
            </Link>
          ))}
          <ButtonLink href="/booking" size="nav" variant={solid ? "primary" : "glass"}>
            Book
          </ButtonLink>
          {clerkEnabled ? (
            <div className="flex items-center gap-2">
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <Button type="button" variant={solid ? "ghost" : "glass"} size="nav">
                    Sign in
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button type="button" variant={solid ? "outline" : "glass"} size="nav">
                    Sign up
                  </Button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </div>
          ) : null}
          <ThemeToggle solid={solid} />
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle solid={solid} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen((value) => !value)}
            className={cn(
              "h-9 w-9 rounded-full hover:bg-transparent",
              solid ? "text-foreground" : "text-white",
            )}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </nav>

      {mobileMenuOpen ? (
        <div className="border-t border-border bg-background/98 backdrop-blur-md md:hidden">
          <div className="flex flex-col space-y-1 px-5 py-4">
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
            <ButtonLink
              href="/booking"
              size="nav"
              className="mt-2 w-full justify-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              Book
            </ButtonLink>
            {clerkEnabled ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Show when="signed-out">
                  <SignInButton mode="modal">
                    <Button
                      type="button"
                      variant="outline"
                      size="nav"
                      className="w-full"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Sign in
                    </Button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <Button
                      type="button"
                      size="nav"
                      className="w-full"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Sign up
                    </Button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <div className="col-span-2 flex justify-center rounded-lg border border-border py-2">
                    <UserButton />
                  </div>
                </Show>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}
