"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { dateToIso, formatDisplayDate, isoToDate } from "@/lib/booking/dates";
import { cn } from "@/lib/utils";

export function BookingDatePicker({
  label,
  value,
  onChange,
  isDateDisabled,
  placeholder,
  helperText,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isDateDisabled: (date: Date) => boolean;
  placeholder: string;
  helperText?: string;
}) {
  const selected = isoToDate(value);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-12 w-full justify-start border-input bg-background px-3 text-left font-medium",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{value ? formatDisplayDate(value) : placeholder}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-4">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (!date) return;
              onChange(dateToIso(date));
              setOpen(false);
            }}
            disabled={isDateDisabled}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {helperText ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
}
