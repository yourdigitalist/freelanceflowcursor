import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  DEFAULT_PORTAL_SECTIONS,
  getClientPortalUrl,
  parsePortalSections,
  type ClientPortalSections,
  type PortalTimeVisibility,
} from "@/lib/clientPortal";
import { getSiteUrl } from "@/lib/site-url";

type ClientPortalClient = {
  id: string;
  name: string;
  email: string | null;
  portal_enabled: boolean | null;
  portal_token: string | null;
  portal_sections: unknown;
  logo_url?: string | null;
  avatar_color?: string | null;
};

const SECTION_LABELS: { key: keyof Omit<ClientPortalSections, "time_visibility">; label: string; description: string }[] = [
  { key: "details", label: "Client details", description: "Name, logo, address, tax ID for the client to verify." },
  { key: "invoices", label: "Invoices", description: "Sent invoices with PDF view (drafts hidden)." },
  { key: "proposals", label: "Proposals", description: "Links to proposal pages already sent to the client." },
  { key: "contracts", label: "Contracts", description: "Links to contract signing (email verification required)." },
  { key: "approvals", label: "Approvals", description: "Links to review and approval requests." },
  { key: "time", label: "Time", description: "Read-only time summary for this client." },
];

function sectionsEqual(a: ClientPortalSections, b: ClientPortalSections): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function ClientPortalSettings({
  client,
  onClientUpdate,
}: {
  client: ClientPortalClient;
  onClientUpdate: (patch: Partial<ClientPortalClient>) => void;
}) {
  const { toast } = useToast();
  const { confirm, ConfirmDialogHost } = useConfirmDialog();
  const [enabled, setEnabled] = useState(Boolean(client.portal_enabled));
  const [portalToken, setPortalToken] = useState(client.portal_token || "");
  const [sections, setSections] = useState<ClientPortalSections>(() =>
    parsePortalSections(client.portal_sections),
  );
  const [savedSnapshot, setSavedSnapshot] = useState(() => ({
    enabled: Boolean(client.portal_enabled),
    portalToken: client.portal_token || "",
    sections: parsePortalSections(client.portal_sections),
  }));
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendEmail, setSendEmail] = useState(client.email || "");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const parsed = parsePortalSections(client.portal_sections);
    setEnabled(Boolean(client.portal_enabled));
    setPortalToken(client.portal_token || "");
    setSections(parsed);
    setSavedSnapshot({
      enabled: Boolean(client.portal_enabled),
      portalToken: client.portal_token || "",
      sections: parsed,
    });
    setSendEmail(client.email || "");
  }, [client.id, client.portal_enabled, client.portal_token, client.portal_sections, client.email]);

  const portalUrl = portalToken ? getClientPortalUrl(portalToken) : "";
  const configuredSiteUrl = getSiteUrl();
  const isLocalDevLink =
    !configuredSiteUrl &&
    typeof window !== "undefined" &&
    /localhost|127\.0\.0\.1/i.test(window.location.hostname);

  const isDirty = useMemo(
    () =>
      enabled !== savedSnapshot.enabled ||
      portalToken !== savedSnapshot.portalToken ||
      !sectionsEqual(sections, savedSnapshot.sections),
    [enabled, portalToken, sections, savedSnapshot],
  );

  const persist = useCallback(
    async (patch: {
      portal_enabled: boolean;
      portal_token: string | null;
      portal_sections: ClientPortalSections;
    }) => {
      setSaving(true);
      try {
        const { data, error } = await supabase
          .from("clients")
          .update({
            portal_enabled: patch.portal_enabled,
            portal_token: patch.portal_token,
            portal_sections: patch.portal_sections as unknown as Json,
          })
          .eq("id", client.id)
          .select("portal_enabled, portal_token, portal_sections")
          .single();
        if (error) throw error;
        if (!data) throw new Error("Save did not return client data");

        const nextEnabled = Boolean(data.portal_enabled);
        const nextToken = data.portal_token || "";
        const nextSections = parsePortalSections(data.portal_sections);

        onClientUpdate({
          portal_enabled: data.portal_enabled,
          portal_token: data.portal_token,
          portal_sections: data.portal_sections,
        });
        setEnabled(nextEnabled);
        setPortalToken(nextToken);
        setSections(nextSections);
        setSavedSnapshot({
          enabled: nextEnabled,
          portalToken: nextToken,
          sections: nextSections,
        });
        return { enabled: nextEnabled, portalToken: nextToken };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Could not save portal settings";
        toast({ title: "Save failed", description: message, variant: "destructive" });
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [client.id, onClientUpdate, toast],
  );

  const saveAll = useCallback(
    async (overrides?: Partial<{ enabled: boolean; portalToken: string; sections: ClientPortalSections }>) => {
      const nextEnabled = overrides?.enabled ?? enabled;
      let nextToken = overrides?.portalToken ?? portalToken;
      const nextSections = overrides?.sections ?? sections;

      if (nextEnabled && !nextToken) {
        nextToken = crypto.randomUUID();
        setPortalToken(nextToken);
      }

      return persist({
        portal_enabled: nextEnabled,
        portal_token: nextEnabled ? nextToken : nextToken || null,
        portal_sections: nextSections,
      });
    },
    [enabled, portalToken, sections, persist],
  );

  const scheduleAutoSave = useCallback(
    (next: { enabled?: boolean; portalToken?: string; sections?: ClientPortalSections }) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void saveAll({
          enabled: next.enabled,
          portalToken: next.portalToken,
          sections: next.sections,
        }).then(() => {
          toast({ title: "Portal settings saved" });
        }).catch(() => {
          /* toast shown in persist */
        });
      }, 400);
    },
    [saveAll, toast],
  );

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  const handleToggleEnabled = async (next: boolean) => {
    setEnabled(next);
    try {
      let token = portalToken;
      if (next && !token) {
        token = crypto.randomUUID();
        setPortalToken(token);
      }
      await saveAll({ enabled: next, portalToken: token });
      toast({
        title: next ? "Client portal enabled" : "Client portal disabled",
        description: next ? "Share the link with your client when ready." : undefined,
      });
    } catch {
      setEnabled(!next);
    }
  };

  const handleSectionChange = (key: keyof ClientPortalSections, value: boolean | PortalTimeVisibility) => {
    const next = { ...sections, [key]: value };
    setSections(next);
    scheduleAutoSave({ sections: next });
  };

  const handleSaveClick = async () => {
    try {
      await saveAll();
      toast({ title: "Portal settings saved" });
    } catch {
      /* persist handles toast */
    }
  };

  const copyLink = async () => {
    if (!portalUrl) return;
    if (isDirty) {
      try {
        await saveAll();
      } catch {
        return;
      }
    }
    await navigator.clipboard.writeText(portalUrl);
    toast({ title: "Portal link copied" });
  };

  const openPreview = async () => {
    if (!portalUrl) return;
    if (isDirty) {
      try {
        await saveAll();
      } catch {
        return;
      }
    }
    window.open(`${portalUrl}?preview=1`, "_blank", "noopener,noreferrer");
  };

  const regenerateToken = async () => {
    const ok = await confirm({
      title: "Regenerate portal link?",
      description: "Regenerate the portal link? The old link will stop working.",
      confirmLabel: "Regenerate",
    });
    if (!ok) return;
    const token = crypto.randomUUID();
    setPortalToken(token);
    try {
      await saveAll({ portalToken: token });
      toast({ title: "New portal link generated" });
    } catch {
      setPortalToken(savedSnapshot.portalToken);
    }
  };

  const sendLink = async () => {
    if (!enabled || !portalToken) {
      toast({ title: "Enable the portal first", variant: "destructive" });
      return;
    }
    const email = sendEmail.trim();
    if (!email) {
      toast({
        title: "Email required",
        description: "Enter the client email to send the portal link.",
        variant: "destructive",
      });
      return;
    }
    if (isDirty) {
      try {
        await saveAll();
      } catch {
        return;
      }
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-client-portal-link", {
        body: {
          clientId: client.id,
          recipientEmail: email,
          origin: getSiteUrl() || window.location.origin,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Portal link sent", description: `Email sent to ${email}` });
    } catch (err: unknown) {
      toast({
        title: "Could not send email",
        description: err instanceof Error ? err.message : "Try again or copy the link manually.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Client portal</CardTitle>
          <CardDescription>
            Give your client a single link to view their documents, verify their details, and open items you have already shared.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="portal-enabled" className="text-sm font-medium">
                Enable client portal
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                When off, the portal link will not load for clients.
              </p>
            </div>
            <Switch
              id="portal-enabled"
              checked={enabled}
              disabled={saving}
              onCheckedChange={(v) => void handleToggleEnabled(v)}
            />
          </div>

          {enabled && portalToken ? (
            <>
              <div className="space-y-2">
                <Label className="text-sm">Portal link</Label>
                {isLocalDevLink ? (
                  <p className="text-xs text-muted-foreground">
                    This link uses your local dev URL ({window.location.origin}). In production, set{" "}
                    <code className="text-xs">VITE_SITE_URL</code> so links use your live domain.
                  </p>
                ) : configuredSiteUrl ? (
                  <p className="text-xs text-muted-foreground">
                    Links use your configured site URL ({configuredSiteUrl}).
                  </p>
                ) : null}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input readOnly value={portalUrl} className="font-mono text-xs" />
                  <div className="flex shrink-0 gap-2">
                    <Button type="button" variant="outline" onClick={() => void copyLink()} disabled={saving}>
                      Copy
                    </Button>
                    <Button type="button" variant="outline" onClick={() => void openPreview()} disabled={saving}>
                      Preview
                    </Button>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => void regenerateToken()}
                  disabled={saving}
                >
                  Regenerate link
                </Button>
              </div>

              <div className="space-y-2 rounded-lg border p-4">
                <Label className="text-sm font-medium">Send link to client</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="portal-send-email" className="text-xs text-muted-foreground">
                      Recipient email
                    </Label>
                    <Input
                      id="portal-send-email"
                      type="email"
                      value={sendEmail}
                      onChange={(e) => setSendEmail(e.target.value)}
                      placeholder="client@example.com"
                    />
                  </div>
                  <Button type="button" onClick={() => void sendLink()} disabled={sending || saving}>
                    {sending ? "Sending…" : "Send link"}
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold">Visible sections</CardTitle>
            <CardDescription>Choose what your client sees in the portal. Changes save automatically.</CardDescription>
          </div>
          {isDirty ? (
            <Button type="button" size="sm" onClick={() => void handleSaveClick()} disabled={saving}>
              {saving ? "Saving…" : "Save now"}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground shrink-0">{saving ? "Saving…" : "Saved"}</span>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {SECTION_LABELS.map(({ key, label, description }) => (
            <div key={key} className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <Switch
                checked={sections[key] as boolean}
                disabled={saving}
                onCheckedChange={(v) => handleSectionChange(key, v)}
              />
            </div>
          ))}
          {sections.time ? (
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-sm">Time entries to show</Label>
              <Select
                value={sections.time_visibility}
                onValueChange={(v) => handleSectionChange("time_visibility", v as PortalTimeVisibility)}
                disabled={saving}
              >
                <SelectTrigger className="w-full sm:w-[240px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Billable and non-billable</SelectItem>
                  <SelectItem value="billable">Billable only</SelectItem>
                  <SelectItem value="non_billable">Non-billable only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => {
              setSections(DEFAULT_PORTAL_SECTIONS);
              scheduleAutoSave({ sections: DEFAULT_PORTAL_SECTIONS });
            }}
          >
            Reset to defaults
          </Button>
        </CardContent>
      </Card>
      {ConfirmDialogHost}
    </div>
  );
}
