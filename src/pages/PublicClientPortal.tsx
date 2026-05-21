import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ClientAvatar } from "@/components/clients/ClientAvatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { appendPortalParam, parsePortalSections } from "@/lib/clientPortal";
import { loadClientPortalData } from "@/lib/loadClientPortal";
import { countryLabel } from "@/lib/locale-data";
import { formatLocaleDate } from "@/lib/datetime";
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { Button } from "@/components/ui/button";

type PortalData = {
  business: { business_name: string | null; business_logo: string | null; primary_color: string };
  client: Record<string, string | null>;
  sections: ReturnType<typeof parsePortalSections>;
  portal_token: string;
  invoices?: { id: string; invoice_number: string; status: string; total: number; due_date: string | null }[];
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

const statusClass = (status?: string | null) => {
  switch (status) {
    case "active":
    case "accepted":
    case "approved":
    case "paid":
      return "bg-success/10 text-success border-success/20";
    case "sent":
    case "pending":
    case "pending_signatures":
      return "bg-warning/10 text-warning border-warning/20";
    case "read":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "overdue":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "cancelled":
    case "rejected":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-muted text-muted-foreground border-muted";
  }
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

function PortalTimeSection({ entries }: { entries: TimeEntryRow[] }) {
  const [timeView, setTimeView] = useState<"week" | "month">("week");
  const [timeAnchor, setTimeAnchor] = useState(new Date());
  const [selectedTimeDay, setSelectedTimeDay] = useState(new Date());

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

  const selectedDayEntries = useMemo(() => {
    const key = format(selectedTimeDay, "yyyy-MM-dd");
    return entries.filter((e) => {
      const dateStr = e.started_at || e.start_time;
      if (!dateStr) return false;
      return format(parseISO(dateStr), "yyyy-MM-dd") === key;
    });
  }, [entries, selectedTimeDay]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setTimeAnchor((d) => (timeView === "week" ? subWeeks(d, 1) : subMonths(d, 1)))}>
            ‹
          </Button>
          <Button variant="outline" size="icon" onClick={() => setTimeAnchor((d) => (timeView === "week" ? addWeeks(d, 1) : addMonths(d, 1)))}>
            ›
          </Button>
          <input
            type="date"
            className="rounded-md border px-2 py-1 text-sm"
            value={format(timeAnchor, "yyyy-MM-dd")}
            onChange={(e) => {
              const picked = new Date(`${e.target.value}T12:00:00`);
              if (!Number.isNaN(picked.getTime())) {
                setTimeAnchor(picked);
                setSelectedTimeDay(picked);
              }
            }}
          />
        </div>
        <div className="flex gap-2">
          <Button variant={timeView === "week" ? "default" : "outline"} onClick={() => setTimeView("week")}>
            Week
          </Button>
          <Button variant={timeView === "month" ? "default" : "outline"} onClick={() => setTimeView("month")}>
            Month
          </Button>
        </div>
      </div>
      {timeView === "week" ? (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
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
                          {row.byDay[k] ? formatHm(row.byDay[k]) : "—"}
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
                      {dayTotals[k] ? formatHm(dayTotals[k]) : "—"}
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
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedTimeDay(d)}
                    className={`rounded-md border min-h-[88px] p-2 text-left ${
                      inMonth ? "bg-card" : "bg-muted/30 text-muted-foreground"
                    } ${isSameDay(d, selectedTimeDay) ? "border-primary bg-primary/5" : ""}`}
                  >
                    <p className="text-xs">{format(d, "d")}</p>
                    <p className="mt-2 text-xs font-mono">{total ? formatHm(total) : "0:00"}</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Entries on {formatLocaleDate(selectedTimeDay)}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {selectedDayEntries.length === 0 ? (
            <div className="px-4 pb-4 text-sm text-muted-foreground">No entries for this day.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project / Task</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedDayEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="font-medium">{entry.projects?.name || "No project"}</div>
                      <div className="text-xs text-muted-foreground">{entry.tasks?.title || "No task"}</div>
                    </TableCell>
                    <TableCell>{entry.description || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="font-mono">{formatHm(toSeconds(entry))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PublicClientPortal() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "1";
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
  const pt = data.portal_token;
  const primary = data.business.primary_color || "#9B63E9";
  const c = data.client;

  const tabDefs: { value: string; label: string; show: boolean }[] = [
    { value: "details", label: "Your details", show: sections.details },
    { value: "invoices", label: "Invoices", show: sections.invoices },
    { value: "proposals", label: "Proposals", show: sections.proposals },
    { value: "contracts", label: "Contracts", show: sections.contracts },
    { value: "approvals", label: "Approvals", show: sections.approvals },
    { value: "time", label: "Time", show: sections.time },
  ].filter((t) => t.show);

  const defaultTab = tabDefs[0]?.value || "details";

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
          <Tabs defaultValue={defaultTab} className="space-y-4">
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
                      <strong>Name:</strong> {c.name || "—"}
                    </p>
                    <p>
                      <strong>Company:</strong> {c.company || "—"}
                    </p>
                    <p>
                      <strong>Email:</strong> {c.email || "—"}
                    </p>
                    <p>
                      <strong>Phone:</strong> {c.phone || "—"}
                    </p>
                    <p>
                      <strong>Tax ID:</strong> {c.tax_id || "—"}
                    </p>
                    <p className="sm:col-span-2">
                      <strong>Address:</strong>{" "}
                      {[c.street, c.street2, c.city, c.state, c.postal_code, countryLabel(c.country)]
                        .filter(Boolean)
                        .join(", ") || "—"}
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
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Due</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data.invoices || []).map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              <Link
                                to={`/portal/${pt}/invoice/${row.id}?portal=${encodeURIComponent(pt)}`}
                                className="font-medium text-primary hover:underline"
                              >
                                {row.invoice_number}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusClass(row.status)}>
                                {row.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{row.total}</TableCell>
                            <TableCell>
                              {row.due_date ? formatLocaleDate(row.due_date) : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                        {(data.invoices || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-muted-foreground">
                              No invoices yet.
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            ) : null}

            {sections.proposals ? (
              <TabsContent value="proposals">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Proposal</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data.proposals || []).map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              <a
                                href={appendPortalParam(`/proposal/${row.public_token}`, pt)}
                                className="font-medium text-primary hover:underline"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {row.identifier}
                              </a>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusClass(row.status)}>
                                {row.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{row.total ?? "—"}</TableCell>
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
                  </CardContent>
                </Card>
              </TabsContent>
            ) : null}

            {sections.contracts ? (
              <TabsContent value="contracts">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Contract</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data.contracts || []).map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              <a
                                href={appendPortalParam(`/contract/${row.public_token}`, pt)}
                                className="font-medium text-primary hover:underline"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {row.identifier}
                              </a>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusClass(row.status)}>
                                {row.status?.replace(/_/g, " ")}
                              </Badge>
                            </TableCell>
                            <TableCell>{row.total ?? "—"}</TableCell>
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
                  </CardContent>
                </Card>
              </TabsContent>
            ) : null}

            {sections.approvals ? (
              <TabsContent value="approvals">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
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
                                className="font-medium text-primary hover:underline"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {row.title}
                              </a>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusClass(row.status)}>
                                {row.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{row.projects?.name || "—"}</TableCell>
                            <TableCell>{formatLocaleDate(row.created_at)}</TableCell>
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
                  </CardContent>
                </Card>
              </TabsContent>
            ) : null}

            {sections.time ? (
              <TabsContent value="time">
                <PortalTimeSection entries={data.time_entries || []} />
              </TabsContent>
            ) : null}
          </Tabs>
        )}
      </main>
    </div>
  );
}
