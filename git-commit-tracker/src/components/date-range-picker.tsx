"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format, subDays, subYears, isAfter, startOfDay, endOfDay } from "date-fns";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DateRange } from "@/lib/github";

interface DateRangePickerProps {
  dateRange: DateRangeState;
  onDateRangeChange: (range: DateRangeState) => void;
}

export interface DateRangeState {
  from: Date | undefined;
  to: Date | undefined;
}

type PresetKey = "7days" | "30days" | "1year" | "all";

interface Preset {
  label: string;
  getValue: () => DateRangeState;
}

const presets: Record<PresetKey, Preset> = {
  "7days": {
    label: "Last 7 days",
    getValue: () => ({
      from: subDays(new Date(), 7),
      to: new Date(),
    }),
  },
  "30days": {
    label: "Last 30 days",
    getValue: () => ({
      from: subDays(new Date(), 30),
      to: new Date(),
    }),
  },
  "1year": {
    label: "Last year",
    getValue: () => ({
      from: subYears(new Date(), 1),
      to: new Date(),
    }),
  },
  all: {
    label: "All time",
    getValue: () => ({
      from: undefined,
      to: undefined,
    }),
  },
};

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [activePreset, setActivePreset] = React.useState<PresetKey | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const isDesktop = useMediaQuery("(min-width: 640px)");

  const handlePresetClick = (key: PresetKey) => {
    setActivePreset(key);
    setError(null);
    const range = presets[key].getValue();
    onDateRangeChange(range);
  };

  const handleSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (!range) {
      onDateRangeChange({ from: undefined, to: undefined });
      setError(null);
      return;
    }

    const newFrom = range.from;
    const newTo = range.to;

    // Validate the range
    if (newFrom && newTo && isAfter(newFrom, newTo)) {
      setError("End date must be after start date");
      // Still update the state to show the selection
      onDateRangeChange({ from: newFrom, to: newTo });
      return;
    }

    setError(null);
    setActivePreset(null); // Clear preset when manually selecting
    onDateRangeChange({ from: newFrom, to: newTo });
  };

  const getButtonText = () => {
    if (!dateRange.from && !dateRange.to) {
      return "All time";
    }
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`;
    }
    if (dateRange.from) {
      return `From ${format(dateRange.from, "MMM d, yyyy")}`;
    }
    return "Select date range";
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !dateRange.from && !dateRange.to && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {getButtonText()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col sm:flex-row">
            <div className="flex flex-col gap-2 border-r p-4">
              <p className="text-sm font-medium">Presets</p>
              {(Object.keys(presets) as PresetKey[]).map((key) => (
                <Button
                  key={key}
                  variant={activePreset === key ? "secondary" : "ghost"}
                  size="sm"
                  className="justify-start"
                  onClick={() => handlePresetClick(key)}
                >
                  {presets[key].label}
                </Button>
              ))}
            </div>
            <div className="p-4">
              <Calendar
                mode="range"
                selected={
                  dateRange.from || dateRange.to
                    ? { from: dateRange.from, to: dateRange.to }
                    : undefined
                }
                onSelect={handleSelect}
                numberOfMonths={isDesktop ? 2 : 1}
                disabled={{ after: new Date() }}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

/**
 * Convert DateRangeState to GitHub API DateRange format
 */
export function toGitHubDateRange(state: DateRangeState): DateRange {
  return {
    since: state.from ? startOfDay(state.from).toISOString() : undefined,
    until: state.to ? endOfDay(state.to).toISOString() : undefined,
  };
}
