import { format, parseISO } from "date-fns";

export const DEFAULT_DATE_FORMAT = "DD/MM/YYYY";
export const DEFAULT_TIME_FORMAT: "12h" | "24h" = "12h";

export const toDateFnsPattern = (pattern: string) =>
  String(pattern || DEFAULT_DATE_FORMAT)
    .replace(/YYYY/g, "yyyy")
    .replace(/DD/g, "dd")
    .replace(/\bD\b/g, "d");

const toDate = (value: Date | string | null | undefined): Date | null => {
  if (!value) return null;
  const parsed = typeof value === "string" ? parseISO(value) : value;
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatLocaleDate = (
  value: Date | string | null | undefined,
  dateFormat: string = DEFAULT_DATE_FORMAT,
): string => {
  const d = toDate(value);
  if (!d) return "—";
  return format(d, toDateFnsPattern(dateFormat));
};

export const formatLocaleTime = (
  value: Date | string | null | undefined,
  timeFormat: string = DEFAULT_TIME_FORMAT,
): string => {
  const d = toDate(value);
  if (!d) return "—";
  return format(d, timeFormat === "24h" ? "HH:mm" : "h:mm a");
};

export const formatLocaleDateTime = (
  value: Date | string | null | undefined,
  dateFormat: string = DEFAULT_DATE_FORMAT,
  timeFormat: string = DEFAULT_TIME_FORMAT,
): string => {
  const d = toDate(value);
  if (!d) return "—";
  return `${format(d, toDateFnsPattern(dateFormat))} ${format(d, timeFormat === "24h" ? "HH:mm" : "h:mm a")}`;
};
