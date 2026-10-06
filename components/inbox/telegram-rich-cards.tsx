"use client";

import { formatTime } from "./format";

export interface LocationPayload {
  latitude?: number;
  longitude?: number;
  name?: string;
  address?: string;
}

export interface ContactPayload {
  name: string;
  phone?: string;
}

export interface PollOption {
  text: string;
  votes: number | null;
}

export interface PollPayload {
  question: string;
  options: PollOption[];
}

export function parseLocation(text: string | null | undefined): LocationPayload | null {
  if (!text) return null;

  const urlMatch = text.match(/maps\.google\.com\/\?q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const firstLine = text.split("\n")[0];

  if (urlMatch) {
    const nameMatch = firstLine.match(/^📍\s*(.+?)\s*\((.*)\)$/);
    return {
      latitude: Number(urlMatch[1]),
      longitude: Number(urlMatch[2]),
      name: nameMatch && !nameMatch[1].startsWith("Location") ? nameMatch[1] : undefined,
      address: nameMatch?.[2] || undefined,
    };
  }

  const plainMatch = text.match(/📍\s*Location:\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (plainMatch) {
    return { latitude: Number(plainMatch[1]), longitude: Number(plainMatch[2]) };
  }

  const nameMatch = firstLine.match(/^📍\s*(.+?)\s*\((.*)\)\s*$/);
  if (nameMatch && nameMatch[1] !== "Location") {
    return { name: nameMatch[1], address: nameMatch[2] || undefined };
  }

  return null;
}

export function parseContact(text: string | null | undefined): ContactPayload | null {
  if (!text) return null;
  const match = text.match(/^👤 Contact:\s*(.+?)(?:\s*\(([^)]+)\))?\s*$/);
  if (!match) return null;
  return { name: match[1], phone: match[2] };
}

export function parsePoll(text: string | null | undefined): PollPayload | null {
  if (!text) return null;
  const match = text.match(/^📊 Poll:\s*(.+)$/m);
  if (!match) return null;
  const question = match[1].split("\n")[0].trim();
  const options: PollOption[] = [];
  for (const line of text.split("\n").slice(1)) {
    const opt = line.match(/^[•\-]\s*(.+?)(?:\s*\((\d+)\s*votes?\))?\s*$/);
    if (opt) options.push({ text: opt[1], votes: opt[2] ? Number(opt[2]) : null });
  }
  return { question, options };
}

function CardShell({
  children,
  outgoing,
}: {
  children: React.ReactNode;
  outgoing?: boolean;
}) {
  return (
    <div
      className={`w-[280px] sm:w-[320px] overflow-hidden rounded-[14px] border shadow-2xs ${
        outgoing
          ? "border-white/20 bg-primary/95 text-on-primary"
          : "border-hairline bg-canvas-elevated text-ink"
      }`}
    >
      {children}
    </div>
  );
}

export function LocationCard({
  location,
  createdAt,
  outgoing,
  statusGlyph,
}: {
  location: LocationPayload;
  createdAt: string;
  outgoing?: boolean;
  statusGlyph?: string;
}) {
  const { latitude, longitude, name, address } = location;
  const hasCoords = latitude !== undefined && longitude !== undefined;
  const mapsUrl = hasCoords
    ? `https://maps.google.com/?q=${latitude},${longitude}`
    : `https://maps.google.com/?q=${encodeURIComponent([name, address].filter(Boolean).join(", "))}`;
  return (
    <CardShell outgoing={outgoing}>
      {hasCoords && (
        <div className="relative h-[150px] w-full bg-surface-well">
          <iframe
            title="Shared location"
            src={`https://www.google.com/maps?q=${latitude},${longitude}&z=14&output=embed`}
            className="absolute inset-0 h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}
      <div className="flex items-center gap-3 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-red-500/10 text-red-500">
          <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              d="M12 21s-7-5.1-7-11a7 7 0 1114 0c0 5.9-7 11-7 11z"
            />
            <circle cx="12" cy="10" r="2.5" strokeWidth="1.8" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-medium leading-tight">
            {name || "Shared location"}
          </p>
          <p className="truncate font-mono text-[10.5px] opacity-70">
            {hasCoords
              ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
              : address || "Location shared"}
          </p>
        </div>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`rounded-[7px] border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
            outgoing
              ? "border-white/25 hover:bg-white/10"
              : "border-hairline text-link hover:bg-surface-well"
          }`}
        >
          Open ↗
        </a>
      </div>
      <div
        className={`flex items-center justify-end gap-1.5 border-t px-3 py-1.5 font-mono text-[10px] tabular-nums ${
          outgoing ? "border-white/15 opacity-70" : "border-hairline text-mute"
        }`}
      >
        <span>{formatTime(createdAt)}</span>
        {statusGlyph ? <span>{statusGlyph}</span> : null}
      </div>
    </CardShell>
  );
}

export function ContactCard({
  contact,
  createdAt,
  outgoing,
  statusGlyph,
}: {
  contact: ContactPayload;
  createdAt: string;
  outgoing?: boolean;
  statusGlyph?: string;
}) {
  const initials = contact.name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <CardShell outgoing={outgoing}>
      <div className="flex items-center gap-3 p-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-link/10 text-[14px] font-semibold text-link">
          {initials || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold">{contact.name}</p>
          <p className="font-mono text-[11.5px] opacity-70">
            {contact.phone ?? "Contact card"}
          </p>
        </div>
        {contact.phone && (
        <a
          href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`}
          title="Call"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
            outgoing
              ? "border-white/25 hover:bg-white/10"
              : "border-hairline text-link hover:bg-surface-well"
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              d="M3 5a2 2 0 012-2h2.2a1 1 0 01.95.68l1.2 3.6a1 1 0 01-.5 1.2L7 10a12 12 0 005 5l1.5-1.85a1 1 0 011.2-.5l3.6 1.2a1 1 0 01.68.95V17a2 2 0 01-2 2A16 16 0 013 5z"
            />
          </svg>
        </a>
        )}
      </div>
      <div
        className={`flex items-center justify-end gap-1.5 border-t px-3 py-1.5 font-mono text-[10px] tabular-nums ${
          outgoing ? "border-white/15 opacity-70" : "border-hairline text-mute"
        }`}
      >
        <span>Shared contact</span>
        <span>·</span>
        <span>{formatTime(createdAt)}</span>
        {statusGlyph ? <span>{statusGlyph}</span> : null}
      </div>
    </CardShell>
  );
}

export function PollCard({
  poll,
  createdAt,
  outgoing,
  statusGlyph,
}: {
  poll: PollPayload;
  createdAt: string;
  outgoing?: boolean;
  statusGlyph?: string;
}) {
  const total = poll.options.reduce((sum, option) => sum + (option.votes ?? 0), 0);

  return (
    <CardShell outgoing={outgoing}>
      <div className="p-3.5">
        <div className="mb-2.5 flex items-center gap-1.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.08em] opacity-60">
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l10-3v13M9 19a3 3 0 11-6 0 3 3 0 016 0zm10-3a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Poll
        </div>
        <p className="text-[13px] font-semibold leading-snug">{poll.question}</p>
        {poll.options.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {poll.options.map((option, index) => {
              const pct =
                total > 0 && option.votes !== null
                  ? Math.round((option.votes / total) * 100)
                  : null;
              return (
                <div key={index}>
                  <div className="flex items-baseline justify-between gap-2 text-[12px]">
                    <span className="truncate">{option.text}</span>
                    {option.votes !== null && (
                      <span className="shrink-0 font-mono text-[10.5px] tabular-nums opacity-60">
                        {option.votes} · {pct}%
                      </span>
                    )}
                  </div>
                  {pct !== null && (
                    <div
                      className={`mt-1 h-1.5 overflow-hidden rounded-full ${
                        outgoing ? "bg-white/20" : "bg-surface-well"
                      }`}
                    >
                      <div
                        className={`h-full rounded-full ${outgoing ? "bg-white/80" : "bg-link"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            <p className="pt-1 font-mono text-[10px] opacity-60">
              {total} vote{total === 1 ? "" : "s"}
            </p>
          </div>
        )}
      </div>
      <div
        className={`flex items-center justify-end gap-1.5 border-t px-3 py-1.5 font-mono text-[10px] tabular-nums ${
          outgoing ? "border-white/15 opacity-70" : "border-hairline text-mute"
        }`}
      >
        <span>{formatTime(createdAt)}</span>
        {statusGlyph ? <span>{statusGlyph}</span> : null}
      </div>
    </CardShell>
  );
}
