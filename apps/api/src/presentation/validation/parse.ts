import { BadRequestException } from "@nestjs/common";

export function optionalDate(value: string | undefined, field: string): Date | undefined {
  if (value === undefined || value === "") return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`Query parameter "${field}" must be a valid ISO date.`);
  }
  return parsed;
}

export function clampLimit(value: string | undefined, fallback: number, max = 100): number {
  if (value === undefined || value === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}
