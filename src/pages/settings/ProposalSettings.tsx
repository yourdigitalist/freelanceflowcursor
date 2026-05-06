import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Upload } from "@/components/icons";

const PAYMENT_METHOD_OPTIONS = [
  "bank transfer",
  "credit card",
  "debit card",
  "paypal",
  "stripe",
  "crypto",
  "other",
];

type ProposalSettingsProfile = {
  proposal_default_cover_image_url: string | null;
  proposal_default_validity_days: number | null;
  proposal_default_immediate_availability: boolean | null;
  proposal_default_payment_structure: "upfront" | "installments" | null;
  proposal_default_payment_methods: string[] | null;
  proposal_default_conditions_notes: string | null;
  proposal_default_installment_description: string | null;
};

const MAX_COVER_SIZE = 10 * 1024 * 1024;
const MAX_STORAGE_BYTES = 200 * 1024 * 1024;

export default function ProposalSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<ProposalSettingsProfile>({
    proposal_default_cover_image_url: null,
    proposal_default_validity_days: 30,
    proposal_default_immediate_availability: true,
    proposal_default_payment_structure: "upfront",
    proposal_default_payment_methods: [],
    proposal_default_conditions_notes: "",
    proposal_default_installment_description: "",
  });
  const [coverSignedUrl, setCoverSignedUrl] = useState<string | null>(null);
  const [paymentOther, setPaymentOther] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select(
        "proposal_default_cover_image_url, proposal_default_validity_days, proposal_default_immediate_availability, proposal_default_payment_structure, proposal_default_payment_methods, proposal_default_conditions_notes, proposal_default_installment_description"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    const methods = Array.isArray(data?.proposal_default_payment_methods)
      ? data?.proposal_default_payment_methods
      : [];
    const otherMethod = methods.find((method) => method.startsWith("other:"));
    setProfile({
      proposal_default_cover_image_url: data?.proposal_default_cover_image_url ?? null,
      proposal_default_validity_days: data?.proposal_default_validity_days ?? 30,
      proposal_default_immediate_availability: data?.proposal_default_immediate_availability ?? true,
      proposal_default_payment_structure: data?.proposal_default_payment_structure ?? "upfront",
      proposal_default_payment_methods: otherMethod
        ? [...methods.filter((method) => !method.startsWith("other:")), "other"]
        : methods,
      proposal_default_conditions_notes: data?.proposal_default_conditions_notes ?? "",
      proposal_default_installment_description: data?.proposal_default_installment_description ?? "",
    });
    setPaymentOther(otherMethod ? otherMethod.replace(/^other:\s*/i, "") : "");
    if (data?.proposal_default_cover_image_url) {
      const { data: signed } = await supabase.storage
        .from("proposal-images")
        .createSignedUrl(data.proposal_default_cover_image_url, 3600);
      setCoverSignedUrl(signed?.signedUrl || null);
    } else {
      setCoverSignedUrl(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [user?.id]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const methods = (profile.proposal_default_payment_methods || []).includes("other") && paymentOther.trim()
        ? [
            ...(profile.proposal_default_payment_methods || []).filter((method) => method !== "other"),
            `other: ${paymentOther.trim()}`,
          ]
        : (profile.proposal_default_payment_methods || []).filter((method) => method !== "other");
      const { error } = await supabase
        .from("profiles")
        .update({
          proposal_default_cover_image_url: profile.proposal_default_cover_image_url,
          proposal_default_validity_days: Math.max(1, Number(profile.proposal_default_validity_days || 30)),
          proposal_default_immediate_availability: !!profile.proposal_default_immediate_availability,
          proposal_default_payment_structure: profile.proposal_default_payment_structure || "upfront",
          proposal_default_payment_methods: methods,
          proposal_default_conditions_notes: profile.proposal_default_conditions_notes || null,
          proposal_default_installment_description:
            profile.proposal_default_payment_structure === "installments"
              ? (profile.proposal_default_installment_description || null)
              : null,
        })
        .eq("user_id", user.id);
      if (error) throw error;
      toast({ title: "Proposal settings saved" });
      await load();
    } catch (error: any) {
      toast({ title: "Error saving settings", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const onCoverUpload = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > MAX_COVER_SIZE) {
      toast({ title: "File too large", description: "Max size is 10MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const { data: owned } = await supabase.storage.from("proposal-images").list(user.id, { limit: 200 });
      const currentBytes = (owned || []).reduce((sum: number, item: any) => sum + Number(item.metadata?.size || 0), 0);
      if (currentBytes + file.size > MAX_STORAGE_BYTES) {
        toast({ title: "Storage limit reached", description: "Please remove files first.", variant: "destructive" });
        return;
      }
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/proposal-default-cover-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("proposal-images").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: signed } = await supabase.storage.from("proposal-images").createSignedUrl(path, 3600);
      setProfile((prev) => ({ ...prev, proposal_default_cover_image_url: path }));
      setCoverSignedUrl(signed?.signedUrl || null);
      toast({ title: "Default cover uploaded" });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Proposal settings</h1>
        <p className="text-muted-foreground">Build proposals even faster with pre-filled defaults.</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Cover image</CardTitle>
          <CardDescription>
            Choose a default cover image for all new proposals. Recommended size: 1500 x 500px (3:1 ratio).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {coverSignedUrl ? (
            <img src={coverSignedUrl} alt="Default proposal cover" className="h-36 w-full rounded-lg object-cover border" />
          ) : (
            <div className="grid h-36 w-full place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">
              No default cover selected
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && void onCoverUpload(e.target.files[0])}
            disabled={uploading}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Uploading..." : "Choose image"}
            </Button>
            {profile.proposal_default_cover_image_url ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setProfile((prev) => ({ ...prev, proposal_default_cover_image_url: null }));
                  setCoverSignedUrl(null);
                }}
              >
                Remove
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Defaults for new proposals</CardTitle>
          <CardDescription>These values are preloaded when you create a proposal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Validity period</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                value={profile.proposal_default_validity_days ?? 30}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    proposal_default_validity_days: Number(e.target.value || 30),
                  }))
                }
                className="max-w-[140px]"
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
            <p className="text-xs text-muted-foreground">How long the sent proposal remains valid.</p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label className="text-base">Immediate availability</Label>
              <p className="text-xs text-muted-foreground">If accepted, are you available to start right away?</p>
            </div>
            <Switch
              checked={!!profile.proposal_default_immediate_availability}
              onCheckedChange={(checked) =>
                setProfile((prev) => ({ ...prev, proposal_default_immediate_availability: checked }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Payment structure</Label>
            <RadioGroup
              value={profile.proposal_default_payment_structure || "upfront"}
              onValueChange={(value) =>
                setProfile((prev) => ({
                  ...prev,
                  proposal_default_payment_structure: value as "upfront" | "installments",
                }))
              }
              className="flex gap-4 pt-1"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem id="proposal-upfront" value="upfront" />
                <Label htmlFor="proposal-upfront">Upfront</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="proposal-installments" value="installments" />
                <Label htmlFor="proposal-installments">Installments</Label>
              </div>
            </RadioGroup>
          </div>

          {profile.proposal_default_payment_structure === "installments" ? (
            <div className="space-y-2">
              <Label>Installment description</Label>
              <Textarea
                value={profile.proposal_default_installment_description || ""}
                onChange={(e) =>
                  setProfile((prev) => ({ ...prev, proposal_default_installment_description: e.target.value }))
                }
                placeholder="E.g. 50% upfront, 50% on delivery"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Payment methods</Label>
            {PAYMENT_METHOD_OPTIONS.map((method) => (
              <div key={method} className="flex items-center gap-2">
                <Checkbox
                  id={`proposal-payment-${method}`}
                  checked={(profile.proposal_default_payment_methods || []).includes(method)}
                  onCheckedChange={(checked) =>
                    setProfile((prev) => ({
                      ...prev,
                      proposal_default_payment_methods: checked
                        ? [...(prev.proposal_default_payment_methods || []), method]
                        : (prev.proposal_default_payment_methods || []).filter((item) => item !== method),
                    }))
                  }
                />
                <Label htmlFor={`proposal-payment-${method}`}>
                  {method.split(" ").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")}
                </Label>
              </div>
            ))}
            {(profile.proposal_default_payment_methods || []).includes("other") ? (
              <Input
                placeholder="Other payment method"
                value={paymentOther}
                onChange={(e) => setPaymentOther(e.target.value)}
              />
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={profile.proposal_default_conditions_notes || ""}
              onChange={(e) =>
                setProfile((prev) => ({ ...prev, proposal_default_conditions_notes: e.target.value }))
              }
              placeholder="Add any default terms, cancellation policies, or payment notes."
              rows={5}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving || uploading}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save changes
        </Button>
      </div>
    </div>
  );
}
