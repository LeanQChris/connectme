import { memo } from "react";

interface AssigneePickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

const TEAM = ["unassigned", "ana", "ben", "chloe", "dev"];

export const AssigneePicker = memo(function AssigneePicker({ value, onChange }: AssigneePickerProps) {
  const current = value ?? "unassigned";

  return (
    <label className="relative flex items-center">
      <span className="sr-only">Assignee</span>
      <select
        value={current}
        onChange={(event) =>
          onChange(event.target.value === "unassigned" ? null : event.target.value)
        }
        className="h-8 max-w-[84px] xs:max-w-[96px] sm:max-w-none appearance-none rounded-[6px] border border-hairline bg-canvas-elevated pl-2 pr-5 sm:pr-6 text-[11.5px] sm:text-[12px] text-body shadow-2xs transition-colors hover:bg-surface-well hover:text-ink focus:outline-none truncate"
      >
        {TEAM.map((member) => (
          <option key={member} value={member}>
            {member === "unassigned" ? "Unassigned" : member}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-1.5 h-3 w-3 text-mute"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    </label>
  );
});
