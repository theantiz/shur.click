export const IST_TIMEZONE = "Asia/Kolkata";

const OFFSET_SUFFIX_PATTERN = /(?:[zZ]|[+-]\d{2}:\d{2})$/;
const NAIVE_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/;

export function parseApiDateTime(value: string | null | undefined): Date | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = OFFSET_SUFFIX_PATTERN.test(trimmed)
    ? trimmed
    : NAIVE_ISO_PATTERN.test(trimmed)
      ? `${trimmed}+05:30`
      : trimmed;

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatIstDateTime(value: string | null | undefined, fallback = "Never") {
  const parsed = parseApiDateTime(value);
  if (!parsed) return fallback;

  return parsed.toLocaleString("en-IN", {
    timeZone: IST_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
}
