import { format, parseISO } from "https://esm.sh/date-fns@3.6.0";

export const DEFAULT_DATE_FORMAT = "DD/MM/YYYY";

export const toDateFnsPattern = (pattern: string) =>
  String(pattern || DEFAULT_DATE_FORMAT)
    .replace(/YYYY/g, "yyyy")
    .replace(/DD/g, "dd")
    .replace(/\bD\b/g, "d");

const toDate = (value: Date | string | null | undefined): Date | null => {
  if (value == null || value === "") return null;
  const raw = String(value).trim();
  const parsed =
    typeof value === "string"
      ? parseISO(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00` : raw)
      : value;
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** Format a date for invoice PDF/email using the user's locale date_format. */
export function formatLocaleDate(
  value: Date | string | null | undefined,
  dateFormat: string = DEFAULT_DATE_FORMAT,
): string {
  const d = toDate(value);
  if (!d) return "";
  return format(d, toDateFnsPattern(dateFormat));
}
