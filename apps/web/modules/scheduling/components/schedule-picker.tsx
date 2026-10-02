"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

interface SchedulePickerProps {
  onConfirm: (scheduledForIso: string) => void | Promise<void>;
  onCancel: () => void;
  minLeadMinutes?: number;
  maxDaysAhead?: number;
  pending?: boolean;
  title?: string;
}

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function SchedulePicker({
  onConfirm,
  onCancel,
  minLeadMinutes = 1,
  maxDaysAhead = 75,
  pending = false,
  title = "Schedule",
}: SchedulePickerProps) {
  const now = useMemo(() => new Date(), []);
  const minValue = useMemo(
    () => toLocalInputValue(addMinutes(now, minLeadMinutes)),
    [now, minLeadMinutes],
  );
  const maxValue = useMemo(
    () => toLocalInputValue(new Date(now.getTime() + maxDaysAhead * 24 * 60 * 60_000)),
    [now, maxDaysAhead],
  );

  const presets = useMemo(() => {
    const tomorrow9 = new Date(now);
    tomorrow9.setDate(tomorrow9.getDate() + 1);
    tomorrow9.setHours(9, 0, 0, 0);
    const nextWeek9 = new Date(tomorrow9);
    nextWeek9.setDate(nextWeek9.getDate() + 6);
    return [
      { label: "In 1 hour", value: addMinutes(now, 60) },
      { label: "In 3 hours", value: addMinutes(now, 180) },
      { label: "Tomorrow 9am", value: tomorrow9 },
      { label: "Next week 9am", value: nextWeek9 },
    ];
  }, [now]);

  const [value, setValue] = useState(toLocalInputValue(addMinutes(now, 60)));
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      setError("Pick a valid date and time.");
      return;
    }
    const minDate = addMinutes(new Date(), minLeadMinutes);
    if (parsed.getTime() < minDate.getTime()) {
      setError(`Choose a time at least ${minLeadMinutes} minute(s) from now.`);
      return;
    }
    if (parsed.getTime() > new Date(Date.now() + maxDaysAhead * 24 * 60 * 60_000).getTime()) {
      setError(`Choose a time within ${maxDaysAhead} days.`);
      return;
    }
    await onConfirm(parsed.toISOString());
  };

  return (
    <div className="rounded-[10px] border border-hairline bg-canvas-elevated p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-ink">{title}</span>
        <button
          type="button"
          onClick={onCancel}
          className="text-[12px] text-mute hover:text-ink cursor-pointer"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => setValue(toLocalInputValue(preset.value))}
            className="rounded-full border border-hairline px-2 py-0.5 text-[10.5px] text-body transition-colors hover:bg-surface-well hover:text-ink cursor-pointer"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <input
        type="datetime-local"
        value={value}
        min={minValue}
        max={maxValue}
        onChange={(event) => setValue(event.target.value)}
        className="mb-1 w-full rounded-[6px] border border-hairline bg-canvas px-2.5 py-1.5 text-[13px] text-ink focus:border-ink focus:outline-none"
      />
      <p className="mb-2 text-[10.5px] text-mute">
        Times use your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}).
      </p>

      {error && (
        <div className="mb-2 rounded-[6px] border border-error/20 bg-error/10 px-2.5 py-1.5 text-[11.5px] text-error">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="h-8 text-[12px]">
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => void submit()}
          disabled={pending}
          className="h-8 text-[12px]"
        >
          {pending ? "Scheduling…" : "Confirm schedule"}
        </Button>
      </div>
    </div>
  );
}