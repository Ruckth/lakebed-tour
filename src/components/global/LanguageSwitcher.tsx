"use client";

import { Globe2 } from "lucide-react";
import { useLocale } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  defaultLocale,
  isLocale,
  localeLabels,
  locales,
  stripLocalePrefix,
  type Locale,
} from "@/i18n/routing";
import { cn } from "@/lib/utils";

const compactLocaleLabels: Record<Locale, string> = {
  en: "EN",
  th: "TH",
  "zh-CN": "ZH",
  ja: "JA",
  ko: "KO",
  fr: "FR",
  de: "DE",
  es: "ES",
  ru: "RU",
  it: "IT",
  hi: "HI",
};

export function LanguageSwitcher({
  solid = true,
  compact = false,
  className,
}: {
  solid?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentLocale = isLocale(locale) ? locale : defaultLocale;

  function changeLocale(nextLocale: Locale) {
    const basePath = stripLocalePrefix(pathname);
    const nextPath =
      nextLocale === defaultLocale
        ? basePath
        : `/${nextLocale}${basePath === "/" ? "" : basePath}`;
    const query = searchParams.toString();
    const hash = window.location.hash;
    window.location.assign(`${nextPath}${query ? `?${query}` : ""}${hash}`);
  }

  return (
    <Select value={currentLocale} onValueChange={(value) => changeLocale(value as Locale)}>
      <SelectTrigger
        aria-label="Language"
        className={cn(
          "h-9 rounded-full text-xs",
          compact ? "w-[4.5rem] px-2.5" : "w-[9rem] px-3",
          solid
            ? "border-border bg-background/90 text-foreground"
            : "border-white/20 bg-white/10 text-white shadow-white/5 backdrop-blur-md hover:bg-white/15",
          className,
        )}
      >
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <Globe2 className="h-3.5 w-3.5 shrink-0" />
          <SelectValue>
            {compact ? compactLocaleLabels[currentLocale] : localeLabels[currentLocale]}
          </SelectValue>
        </span>
      </SelectTrigger>
      <SelectContent align="end" className="min-w-[11rem]">
        <SelectGroup>
          {locales.map((item) => (
            <SelectItem key={item} value={item}>
              <span className="flex w-full items-center justify-between gap-4">
                <span>{localeLabels[item]}</span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {compactLocaleLabels[item]}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
