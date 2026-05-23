"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "seaview-demo-disclaimer-dismissed";

function setDismissed() {
  try {
    sessionStorage.setItem(STORAGE_KEY, "true");
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function wasDismissed() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function DemoDisclaimerDialog() {
  const t = useTranslations("DemoDisclaimer");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!wasDismissed()) {
      setOpen(true);
    }
  }, []);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      setDismissed();
    }

    setOpen(nextOpen);
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md gap-5 border-gold/30 bg-card p-5 shadow-2xl sm:p-6"
      >
        <DialogClose className="absolute right-3 top-3 rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X className="h-4 w-4" />
          <span className="sr-only">{t("close")}</span>
        </DialogClose>
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="font-serif text-2xl font-semibold text-foreground">
            {t("title")}
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-muted-foreground">
            {t("body")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" className="w-full sm:w-auto" onClick={() => handleOpenChange(false)}>
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
