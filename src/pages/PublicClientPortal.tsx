import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ClientAvatar } from "@/components/clients/ClientAvatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { appendPortalParam, formatPortalMoney, parsePortalSections, resolveMoneyCurrency } from "@/lib/clientPortal";
import { loadClientPortalData } from "@/lib/loadClientPortal";
import { TableStatusBadge } from "@/components/ui/table-status-badge";
import { EmptyValue, valueOrEmpty } from "@/components/ui/empty-value";
import { DataTableFrame } from "@/components/ui/table";
import {
  formatDuration,
  sumMonthSecondsFromDayTotals,
  timeMonthCalendarDayClassName,
  timeMonthCalendarDurationClassName,
} from "@/lib/time";
import { countryLabel } from "@/lib/locale-data";
import { DEFAULT_DATE_FORMAT, formatLocaleDate } from "@/lib/datetime";
import {
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  endOfDay,
  format,
  isSameDay,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";

type PortalData = {
  business: {
    business_name: string | null;
    business_logo: string | null;
    primary_color: string;
    date_format?: string | null;
    currency?: string | null;
    profile_currency?: string | null;
  };
  client: Record<string, string | null>;
  sections: ReturnType<typeof parsePortalSections>;
  portal_token: string;
  invoices?: {
    id: string;
    invoice_number: string;
    status: string;
    total: number;
    due_date: string | null;
    issue_date?: string | null;
  }[];
  proposals?: { id: string; identifier: string; status: string; total: number | null; public_token: string }[];
  contracts?: { id: string; identifier: string; status: string; total: number | null; public_token: string }[];
  approvals?: { id: string; title: string; status: string; created_at: string; share_token: string; projects?: { name: string } | null }[];
  time_entries?: TimeEntryRow[];
};

type TimeEntryRow = {
  id: string;
  project_id: string | null;
  task_id: string | null;
  description: string | null;
  started_at: string | null;
  start_time: string | null;
  total_duration_seconds: number | null;
  duration_minutes: number | null;
  projects?: { name: string } | null;
  tasks?: { title: string } | null;
};

const toSeconds = (entry: TimeEntryRow) => {
  if (entry.total_duration_seconds != null && entry.total_duration_seconds > 0) return entry.total_duration_seconds;
  if (entry.duration_minutes != null) return entry.duration_minutes * 60;
  return 0;
};

const formatHm = (seconds: number) => {
  const totalMinutes = Math.round(Math.max(0, seconds) / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
};

function invoiceTimesheetMonth(invoice: {
  issue_date?: string | null;
  due_date: string | null;
}): string | null {
  const raw = invoice.issue_date || invoice.due_date;
  if (!raw) return null;
  try {
    return format(parseISO(raw), "yyyy-MM");
  } catch {
    return null;
  }
}

function parsePortalMonthParam(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null;
  const [year, month] = value.split("-").map(Number);
  const d = new Date(year, month - 1, 1);
  return Number.isNaN(d.getTime()) ? null : d;
}

function PortalTimeSection({
  entries,
  dateFormat,
  initialMonth,
}: {
  entries: TimeEntryRow[];
  dateFormat: string;
  initialMonth?: string | null;
}) {
  const fmtDate = (value: Date | string | null | undefined) => formatLocaleDate(value, dateFormat);
  const initialAnchor = parsePortalMonthParam(initialMonth) ?? new Date();
  const [timeView, setTimeView] = useState<"week" | "month">("month");
  const [timeAnchor, setTimeAnchor] = useState(initialAnchor);
  const [selectedTimeDay, setSelectedTimeDay] = useState(initialAnchor);
  const [monthDayFilter, setMonthDayFilter] = useState<Date | null>(null);
  const [timeMonthPickerOpen, setTimeMonthPickerOpen] = useState(false);
  const [timeWeekPickerOpen, setTimeWeekPickerOpen] = useState(false);

  const weekRange = useMemo(
    () => ({
      start: startOfWeek(timeAnchor, { weekStartsOn: 1 }),
      end: endOfWeek(timeAnchor, { weekStartsOn: 1 }),
    }),
    [timeAnchor],
  );
  const days = useMemo(() => eachDayOfInterval(weekRange), [weekRange]);
  const dayKeys = useMemo(() => days.map((d) => format(d, "yyyy-MM-dd")), [days]);
  const monthStart = useMemo(() => startOfMonth(timeAnchor), [timeAnchor]);
  const monthEnd = useMemo(() => endOfMonth(timeAnchor), [timeAnchor]);
  const monthGridStart = useMemo(() => startOfWeek(monthStart, { weekStartsOn: 1 }), [monthStart]);
  const monthGridEnd = useMemo(() => endOfWeek(monthEnd, { weekStartsOn: 1 }), [monthEnd]);
  const monthGridDays = useMemo(
    () => eachDayOfInterval({ start: monthGridStart, end: monthGridEnd }),
    [monthGridStart, monthGridEnd],
  );

  const groupedRows = useMemo(() => {
    const map = new Map<string, { projectName: string; taskName: string; byDay: Record<string, number> }>();
    entries.forEach((entry) => {
      const dateStr = entry.started_at || entry.start_time;
      if (!dateStr) return;
      const d = parseISO(dateStr);
      if (d < weekRange.start || d > weekRange.end) return;
      const keyDay = format(d, "yyyy-MM-dd");
      const projectName = entry.projects?.name || "No project";
      const taskName = entry.tasks?.title || "No task";
      const notes = entry.description || "";
      const key = `${entry.project_id || "none"}::${entry.task_id || "none"}::${notes}`;
      if (!map.has(key)) map.set(key, { projectName, taskName, byDay: {} });
      const row = map.get(key)!;
      row.byDay[keyDay] = (row.byDay[keyDay] || 0) + toSeconds(entry);
    });
    return Array.from(map.values());
  }, [entries, weekRange]);

  const dayTotals = useMemo(() => {
    const out: Record<string, number> = {};
    groupedRows.forEach((row) => {
      dayKeys.forEach((k) => {
        out[k] = (out[k] || 0) + (row.byDay[k] || 0);
      });
    });
    return out;
  }, [groupedRows, dayKeys]);

  const monthDayTotals = useMemo(() => {
    const out: Record<string, number> = {};
    entries.forEach((entry) => {
      const dateStr = entry.started_at || entry.start_time;
      if (!dateStr) return;
      const d = parseISO(dateStr);
      if (d < monthStart || d > monthEnd) return;
      const key = format(d, "yyyy-MM-dd");
      out[key] = (out[key] || 0) + toSeconds(entry);
    });
    return out;
  }, [entries, monthStart, monthEnd]);

  const monthTotalSeconds = useMemo(
    () => sumMonthSecondsFromDayTotals(monthDayTotals, monthStart, monthEnd),
    [monthDayTotals, monthStart, monthEnd],
  );

  const monthGroupedRows = useMemo(() => {
    const map = new Map<string, { projectName: string; taskName: string; totalSeconds: number }>();
    entries.forEach((entry) => {
      const dateStr = entry.started_at || entry.start_time;
      if (!dateStr) return;
      const d = parseISO(dateStr);
      if (d < monthStart || d > monthEnd) return;
      const projectName = entry.projects?.name || "No project";
      const taskName = entry.tasks?.title || "No task";
      const key = `${entry.project_id || "none"}::${entry.task_id || "none"}`;
      if (!map.has(key)) map.set(key, { projectName, taskName, totalSeconds: 0 });
      const row = map.get(key)!;
      row.totalSeconds += toSeconds(entry);
    });
    return Array.from(map.values()).sort((a, b) => {
      const byProject = a.projectName.localeCompare(b.projectName);
      if (byProject !== 0) return byProject;
      return a.taskName.localeCompare(b.taskName);
    });
  }, [entries, monthStart, monthEnd]);

  const monthEntries = useMemo(
    () =>
      entries
        .filter((entry) => {
          const dateStr = entry.started_at || entry.start_time;
          if (!dateStr) return false;
          const d = parseISO(dateStr);
          return d >= startOfDay(monthStart) && d <= endOfDay(monthEnd);
        })
        .sort((a, b) => {
          const aDate = parseISO(a.started_at || a.start_time || new Date(0).toISOString()).getTime();
          const bDate = parseISO(b.started_at || b.start_time || new Date(0).toISOString()).getTime();
          return bDate - aDate;
        }),
    [entries, monthStart, monthEnd],
  );

  const selectedDayEntries = useMemo(() => {
    const key = format(selectedTimeDay, "yyyy-MM-dd");
    return entries.filter((e) => {
      const dateStr = e.started_at || e.start_time;
      if (!dateStr) return false;
      return format(parseISO(dateStr), "yyyy-MM-dd") === key;
    });
  }, [entries, selectedTimeDay]);

  const monthFilteredEntries = useMemo(() => {
    if (!monthDayFilter) return monthEntries;
    const key = format(monthDayFilter, "yyyy-MM-dd");
    return monthEntries.filter((e) => {
      const dateStr = e.started_at || e.start_time;
      if (!dateStr) return false;
      return format(parseISO(dateStr), "yyyy-MM-dd") === key;
    });
  }, [monthEntries, monthDayFilter]);

  const weekTotalSeconds = useMemo(
    () =>
      entries.reduce((sum, entry) => {
        const dateStr = entry.started_at || entry.start_time;
        if (!dateStr) return sum;
        const d = parseISO(dateStr);
        if (d < weekRange.start || d > weekRange.end) return sum;
        return sum + toSeconds(entry);
      }, 0),
    [entries, weekRange],
  );

  const isCurrentMonth =
    monthStart.getFullYear() === new Date().getFullYear() && monthStart.getMonth() === new Date().getMonth();
  const isCurrentWeek = isSameDay(weekRange.start, startOfWeek(new Date(), { weekStartsOn: 1 }));

  const goToCurrentMonth = () => {
    const now = new Date();
    setTimeAnchor(now);
    setSelectedTimeDay(now);
    setMonthDayFilter(null);
  };

  const goToCurrentWeek = () => {
    const now = new Date();
    setTimeAnchor(now);
    setSelectedTimeDay(now);
  };

  const setTimeMonth = (year: number, monthIndex: number) => {
    const next = new Date(year, monthIndex, 1);
    setTimeAnchor(next);
    setSelectedTimeDay(next);
    setMonthDayFilter(null);
  };

  const shiftTimePeriod = (direction: "prev" | "next") => {
    if (timeView === "month") {
      setTimeAnchor((d) => {
        const next = new Date(d.getFullYear(), d.getMonth() + (direction === "prev" ? -1 : 1), 1);
        setSelectedTimeDay(next);
        setMonthDayFilter(null);
        return next;
      });
      return;
    }
    setTimeAnchor((d) => {
      const currentWeekStart = startOfWeek(d, { weekStartsOn: 1 });
      const nextWeekStart = direction === "prev" ? subWeeks(currentWeekStart, 1) : addWeeks(currentWeekStart, 1);
      const nextWeekEnd = endOfWeek(nextWeekStart, { weekStartsOn: 1 });
      setSelectedTimeDay((prev) => {
        if (prev >= nextWeekStart && prev <= nextWeekEnd) return prev;
        return nextWeekStart;
      });
      return nextWeekStart;
    });
  };

  const switchTimeView = (view: "week" | "month") => {
    setTimeView(view);
    if (view === "month") setMonthDayFilter(null);
  };

  const handleMonthDayClick = (day: Date) => {
    setSelectedTimeDay(day);
    setMonthDayFilter((prev) => (prev && isSameDay(prev, day) ? null : day));
  };

  const listEntries = timeView === "week" ? selectedDayEntries : monthFilteredEntries;
  const listTitle =
    timeView === "week"
      ? `Entries on ${fmtDate(selectedTimeDay)}`
      : monthDayFilter
        ? `Entries on ${fmtDate(monthDayFilter)}`
        : `Entries for ${format(monthStart, "MMMM yyyy")}`;
  const listEmptyMessage =
    timeView === "week"
      ? "No entries for this day."
      : monthDayFilter
        ? "No entries for this day."
        : "No entries for this month.";
  const listTotalSeconds =
    timeView === "week"
      ? selectedDayEntries.reduce((sum, e) => sum + toSeconds(e), 0)
      : monthDayFilter
        ? monthFilteredEntries.reduce((sum, e) => sum + toSeconds(e), 0)
        : monthTotalSeconds;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => shiftTimePeriod("prev")} aria-label="Previous period">
            ‹
          </Button>
          {timeView === "month" ? (
            <Popover open={timeMonthPickerOpen} onOpenChange={setTimeMonthPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" type="button">
                  {isCurrentMonth
                    ? `This month · ${format(monthStart, "MMM yyyy")}`
                    : format(monthStart, "MMMM yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="start">
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Select
                      value={String(timeAnchor.getMonth())}
                      onValueChange={(m) => setTimeMonth(timeAnchor.getFullYear(), Number(m))}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {format(new Date(2024, i, 1), "MMMM")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={String(timeAnchor.getFullYear())}
                      onValueChange={(y) => setTimeMonth(Number(y), timeAnchor.getMonth())}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 11 }, (_, i) => {
                          const year = new Date().getFullYear() - 5 + i;
                          return (
                            <SelectItem key={year} value={String(year)}>
                              {year}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      goToCurrentMonth();
                      setTimeMonthPickerOpen(false);
                    }}
                  >
                    This month
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <Popover open={timeWeekPickerOpen} onOpenChange={setTimeWeekPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" type="button">
                  {isCurrentWeek
                    ? `This week · ${fmtDate(weekRange.start)} – ${fmtDate(weekRange.end)}`
                    : `${fmtDate(weekRange.start)} – ${fmtDate(weekRange.end)}`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedTimeDay}
                  onSelect={(date) => {
                    if (!date) return;
                    setSelectedTimeDay(date);
                    setTimeAnchor(date);
                    setTimeWeekPickerOpen(false);
                  }}
                  defaultMonth={selectedTimeDay}
                  initialFocus
                />
                <div className="border-t p-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      goToCurrentWeek();
                      setTimeWeekPickerOpen(false);
                    }}
                  >
                    This week
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
          <Button variant="outline" size="sm" onClick={() => shiftTimePeriod("next")} aria-label="Next period">
            ›
          </Button>
          {timeView === "week" ? (
            <span className="text-sm text-muted-foreground">
              Week total:{" "}
              <span className="font-mono font-medium text-foreground">{formatHm(weekTotalSeconds)}</span>
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">
              Month total:{" "}
              <span className="font-mono font-medium text-foreground">{formatDuration(monthTotalSeconds)}</span>
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant={timeView === "week" ? "default" : "outline"} size="sm" onClick={() => switchTimeView("week")}>
            Week
          </Button>
          <Button variant={timeView === "month" ? "default" : "outline"} size="sm" onClick={() => switchTimeView("month")}>
            Month
          </Button>
        </div>
      </div>
      {timeView === "week" ? (
        <Card>
          <CardContent className="flex flex-col p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Project / Task</TableHead>
                  {days.map((day) => (
                    <TableHead key={day.toISOString()}>{format(day, "EEE d")}</TableHead>
                  ))}
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedRows.map((row, idx) => {
                  const rowTotal = dayKeys.reduce((sum, k) => sum + (row.byDay[k] || 0), 0);
                  return (
                    <TableRow key={idx}>
                      <TableCell>
                        <div className="font-medium">{row.projectName}</div>
                        <div className="text-xs text-muted-foreground">{row.taskName}</div>
                      </TableCell>
                      {dayKeys.map((k) => (
                        <TableCell
                          key={k}
                          className="font-mono cursor-pointer hover:bg-muted/40"
                          onClick={() => setSelectedTimeDay(new Date(`${k}T12:00:00`))}
                        >
                          {row.byDay[k] ? formatHm(row.byDay[k]) : <EmptyValue variant="table" />}
                        </TableCell>
                      ))}
                      <TableCell className="font-mono font-medium">{formatHm(rowTotal)}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow>
                  <TableCell className="font-semibold">Total</TableCell>
                  {dayKeys.map((k) => (
                    <TableCell key={k} className="font-mono font-semibold">
                      {dayTotals[k] ? formatHm(dayTotals[k]) : <EmptyValue variant="table" />}
                    </TableCell>
                  ))}
                  <TableCell className="font-mono font-semibold">
                    {formatHm(Object.values(dayTotals).reduce((s, v) => s + v, 0))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                {format(monthStart, "MMMM yyyy")} summary
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col p-0 overflow-x-auto">
              {monthGroupedRows.length === 0 ? (
                <p className="px-4 pb-4 text-sm text-muted-foreground">No time logged this month.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Project / Task</TableHead>
                      <TableHead className="text-right">Month total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthGroupedRows.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <div className="font-medium">{row.projectName}</div>
                          <div className="text-xs text-muted-foreground">{row.taskName}</div>
                        </TableCell>
                        <TableCell className="font-mono text-right font-medium">{formatHm(row.totalSeconds)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="font-semibold">Total</TableCell>
                      <TableCell className="font-mono text-right font-semibold">
                        {formatDuration(monthTotalSeconds)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-7 gap-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
                  <div key={label} className="px-2 py-1 text-xs font-medium text-muted-foreground">
                    {label}
                  </div>
                ))}
                {monthGridDays.map((d) => {
                  const key = format(d, "yyyy-MM-dd");
                  const inMonth = d >= monthStart && d <= monthEnd;
                  const total = monthDayTotals[key] || 0;
                  const hasEntries = total > 0;
                  const isSelected = monthDayFilter ? isSameDay(d, monthDayFilter) : false;
                  const isToday = isSameDay(d, new Date());
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => inMonth && handleMonthDayClick(d)}
                      className={timeMonthCalendarDayClassName({
                        inMonth,
                        totalSeconds: total,
                        isSelected,
                        isToday,
                      })}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs">{format(d, "d")}</p>
                        {isToday ? (
                          <span className="rounded-full border border-emerald-600/40 bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                            Today
                          </span>
                        ) : null}
                      </div>
                      <p className={timeMonthCalendarDurationClassName(hasEntries)}>
                        {hasEntries ? formatHm(total) : "0:00"}
                      </p>
                    </button>
                  );
                })}
              </div>
              {monthDayFilter ? (
                <div className="mt-3 flex justify-end border-t pt-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => setMonthDayFilter(null)}>
                    Show full month
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </>
      )}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold">{listTitle}</CardTitle>
          {timeView === "month" && monthDayFilter ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setMonthDayFilter(null)}>
              Show full month
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col p-0">
          {listEntries.length === 0 ? (
            <div className="px-4 pb-4 text-sm text-muted-foreground">{listEmptyMessage}</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {timeView === "month" && !monthDayFilter ? (
                      <TableHead>Date</TableHead>
                    ) : null}
                    <TableHead>Project / Task</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      {timeView === "month" && !monthDayFilter ? (
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {fmtDate(entry.started_at || entry.start_time)}
                        </TableCell>
                      ) : null}
                      <TableCell>
                        <div className="font-medium">{entry.projects?.name || "No project"}</div>
                        <div className="text-xs text-muted-foreground">{entry.tasks?.title || "No task"}</div>
                      </TableCell>
                      <TableCell>
                        {entry.description ? (
                          entry.description
                        ) : (
                          <EmptyValue variant="detail" field="description" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-right">{formatHm(toSeconds(entry))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-end border-t px-4 py-3">
                <p className="text-sm font-medium text-foreground">
                  {timeView === "week" ? "Day total: " : monthDayFilter ? "Day total: " : "Month total: "}
                  <span className="font-mono">{formatHm(listTotalSeconds)}</span>
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PublicClientPortal() {
  const { token } = useParams<{ token: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "1";
  const tabParam = searchParams.get("tab");
  const monthParam = searchParams.get("month");
  const [data, setData] = useState<PortalData | null>(null);
  const [state, setState] = useState<"loading" | "unavailable" | "live">("loading");
  const [unavailableMessage, setUnavailableMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setUnavailableMessage("Invalid portal link.");
        return setState("unavailable");
      }
      const { data: res, error } = await loadClientPortalData(token, { preview: isPreview });
      if (error || !res) {
        setUnavailableMessage(error || "This client portal is not available.");
        return setState("unavailable");
      }
      setData(res as unknown as PortalData);
      setUnavailableMessage(null);
      setState("live");
    };
    void load();
  }, [token, isPreview]);

  if (state === "loading") {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">
        Loading portal…
      </div>
    );
  }

  if (state === "unavailable" || !data) {
    return (
      <div className="min-h-screen grid place-items-center px-4 text-center max-w-md mx-auto">
        <p className="text-sm font-medium text-foreground">Client portal unavailable</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {unavailableMessage || "This client portal is not available."}
        </p>
      </div>
    );
  }

  const sections = parsePortalSections(data.sections);
  const portalDateFormat = data.business.date_format?.trim() || DEFAULT_DATE_FORMAT;
  const pt = data.portal_token;
  const primary = data.business.primary_color || "#9B63E9";
  const c = data.client;
  const portalCurrency = resolveMoneyCurrency(
    c.currency,
    data.business.profile_currency || data.business.currency,
  );
  const fmtMoney = (amount: number | null | undefined) =>
    formatPortalMoney(amount, portalCurrency);

  const tabDefs: { value: string; label: string; show: boolean }[] = [
    { value: "details", label: "Your details", show: sections.details },
    { value: "invoices", label: "Invoices", show: sections.invoices },
    { value: "proposals", label: "Proposals", show: sections.proposals },
    { value: "contracts", label: "Contracts", show: sections.contracts },
    { value: "approvals", label: "Approvals", show: sections.approvals },
    { value: "time", label: "Time", show: sections.time },
  ].filter((t) => t.show);

  const defaultTab = tabDefs[0]?.value || "details";
  const activeTab = tabDefs.some((t) => t.value === tabParam) ? tabParam! : defaultTab;

  const setActiveTab = (value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === defaultTab) next.delete("tab");
        else next.set("tab", value);
        return next;
      },
      { replace: true },
    );
  };

  const portalBasePath = `/portal/${pt}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b" style={{ borderColor: `${primary}33` }}>
        <div className="mx-auto max-w-5xl px-4 py-6 flex flex-wrap items-center gap-4">
          {data.business.business_logo ? (
            <img
              src={data.business.business_logo}
              alt=""
              className="h-10 max-w-[180px] object-contain"
            />
          ) : null}
          <div>
            <h1 className="text-lg font-semibold">{data.business.business_name || "Client portal"}</h1>
            <p className="text-sm text-muted-foreground">Welcome, {c.name}</p>
          </div>
          <ClientAvatar
            client={{ name: c.name || "", logo_url: c.logo_url, avatar_color: c.avatar_color }}
            size="md"
            className="ml-auto"
          />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {isPreview ? (
          <p className="mb-4 text-xs text-warning bg-warning/10 border border-warning/20 rounded-md px-3 py-2">
            Preview mode — only you can see this while the portal is disabled.
          </p>
        ) : null}

        {tabDefs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sections are visible in this portal.</p>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="h-auto w-full justify-start flex-wrap rounded-none border-b bg-transparent p-0">
              {tabDefs.map(({ value, label }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-0 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            {sections.details ? (
              <TabsContent value="details" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Your information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-2 sm:grid-cols-2 text-sm">
                    <p>
                      <strong>Name:</strong> {c.name || <EmptyValue variant="detail" />}
                    </p>
                    <p>
                      <strong>Company:</strong> {valueOrEmpty(c.company, { variant: 'detail', field: 'company' })}
                    </p>
                    <p>
                      <strong>Email:</strong> {valueOrEmpty(c.email, { variant: 'detail', field: 'email' })}
                    </p>
                    <p>
                      <strong>Phone:</strong> {valueOrEmpty(c.phone, { variant: 'detail', field: 'phone' })}
                    </p>
                    <p>
                      <strong>Tax ID:</strong> {valueOrEmpty(c.tax_id, { variant: 'detail', field: 'tax_id' })}
                    </p>
                    <p className="sm:col-span-2">
                      <strong>Address:</strong>{' '}
                      {valueOrEmpty(
                        [c.street, c.street2, c.city, c.state, c.postal_code, countryLabel(c.country)]
                          .filter(Boolean)
                          .join(', '),
                        { variant: 'detail', field: 'address' },
                      )}
                    </p>
                    <p className="sm:col-span-2 text-muted-foreground text-xs">
                      If anything looks incorrect, contact {data.business.business_name || "your provider"}.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            ) : null}

            {sections.invoices ? (
              <TabsContent value="invoices">
                <Card>
                  <CardContent className="flex flex-col p-0">
                    <DataTableFrame>
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Invoice</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Due</TableHead>
                          {sections.time ? <TableHead>Time</TableHead> : null}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data.invoices || []).map((row) => {
                          const timesheetMonth = invoiceTimesheetMonth(row);
                          return (
                          <TableRow key={row.id}>
                            <TableCell>
                              <Link
                                to={`/portal/${pt}/invoice/${row.id}?portal=${encodeURIComponent(pt)}`}
                                className="font-semibold text-primary hover:underline"
                              >
                                {row.invoice_number}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <TableStatusBadge status={row.status} />
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">{fmtMoney(row.total)}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {row.due_date ? (
                                formatLocaleDate(row.due_date, portalDateFormat)
                              ) : (
                                <EmptyValue variant="table" />
                              )}
                            </TableCell>
                            {sections.time ? (
                              <TableCell>
                                {timesheetMonth ? (
                                  <Link
                                    to={`${portalBasePath}?tab=time&month=${timesheetMonth}${isPreview ? "&preview=1" : ""}`}
                                    className="text-sm text-primary hover:underline"
                                  >
                                    View timesheet
                                  </Link>
                                ) : (
                                  <EmptyValue variant="table" />
                                )}
                              </TableCell>
                            ) : null}
                          </TableRow>
                        );})}
                        {(data.invoices || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={sections.time ? 5 : 4} className="text-muted-foreground">
                              No invoices yet.
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </TableBody>
                    </Table>
                    </DataTableFrame>
                  </CardContent>
                </Card>
              </TabsContent>
            ) : null}

            {sections.proposals ? (
              <TabsContent value="proposals">
                <Card>
                  <CardContent className="flex flex-col p-0">
                    <DataTableFrame>
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Proposal</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data.proposals || []).map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              <a
                                href={appendPortalParam(`/proposal/${row.public_token}`, pt)}
                                className="font-semibold text-primary hover:underline"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {row.identifier}
                              </a>
                            </TableCell>
                            <TableCell>
                              <TableStatusBadge status={row.status} />
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">{fmtMoney(row.total)}</TableCell>
                          </TableRow>
                        ))}
                        {(data.proposals || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-muted-foreground">
                              No proposals yet.
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </TableBody>
                    </Table>
                    </DataTableFrame>
                  </CardContent>
                </Card>
              </TabsContent>
            ) : null}

            {sections.contracts ? (
              <TabsContent value="contracts">
                <Card>
                  <CardContent className="flex flex-col p-0">
                    <DataTableFrame>
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Contract</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data.contracts || []).map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              <a
                                href={appendPortalParam(`/contract/${row.public_token}`, pt)}
                                className="font-semibold text-primary hover:underline"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {row.identifier}
                              </a>
                            </TableCell>
                            <TableCell>
                              <TableStatusBadge status={row.status} />
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">{fmtMoney(row.total)}</TableCell>
                          </TableRow>
                        ))}
                        {(data.contracts || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-muted-foreground">
                              No contracts yet.
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </TableBody>
                    </Table>
                    </DataTableFrame>
                  </CardContent>
                </Card>
              </TabsContent>
            ) : null}

            {sections.approvals ? (
              <TabsContent value="approvals">
                <Card>
                  <CardContent className="flex flex-col p-0">
                    <DataTableFrame>
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Title</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Project</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data.approvals || []).map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              <a
                                href={appendPortalParam(`/review/${row.share_token}`, pt)}
                                className="font-semibold text-primary hover:underline"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {row.title}
                              </a>
                            </TableCell>
                            <TableCell>
                              <TableStatusBadge status={row.status} />
                            </TableCell>
                            <TableCell>
                              {row.projects?.name ? row.projects.name : <EmptyValue variant="table" field="project" />}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{formatLocaleDate(row.created_at, portalDateFormat)}</TableCell>
                          </TableRow>
                        ))}
                        {(data.approvals || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-muted-foreground">
                              No approvals yet.
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </TableBody>
                    </Table>
                    </DataTableFrame>
                  </CardContent>
                </Card>
              </TabsContent>
            ) : null}

            {sections.time ? (
              <TabsContent value="time">
                <PortalTimeSection
                  entries={data.time_entries || []}
                  dateFormat={portalDateFormat}
                  initialMonth={monthParam}
                />
              </TabsContent>
            ) : null}
          </Tabs>
        )}
      </main>
    </div>
  );
}
