"use client";

import { bookingSteps, type BookingStep } from "@/lib/booking/booking";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BookingStepNav({
  currentStep,
  highestAllowedStepIndex,
  onSelectStep,
}: {
  currentStep: BookingStep;
  highestAllowedStepIndex: number;
  onSelectStep: (step: BookingStep) => void;
}) {
  const currentIndex = bookingSteps.findIndex((item) => item.key === currentStep);

  return (
    <div className="mb-6 grid grid-cols-4 gap-2">
      {bookingSteps.map((item, index) => (
        <Button
          key={item.key}
          type="button"
          variant={currentIndex >= index ? "primary" : "secondary"}
          disabled={index > highestAllowedStepIndex}
          onClick={() => onSelectStep(item.key)}
          className={cn(
            "min-h-11 whitespace-normal px-2 py-2 text-xs md:text-sm",
            currentIndex < index && "bg-muted text-muted-foreground hover:bg-muted",
            index > highestAllowedStepIndex && "cursor-not-allowed opacity-55",
          )}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}
