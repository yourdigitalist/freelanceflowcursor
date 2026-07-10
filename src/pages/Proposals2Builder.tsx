import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { detailPageBreadcrumb } from "@/lib/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProposalLayoutEditor } from "@/components/proposals/ProposalLayoutEditor";
import { createDefaultProposalLayoutDocument } from "@/lib/proposals2/defaultDocument";
import { parseProposalLayoutDocument } from "@/lib/proposals2/layoutSchema";

type ProposalRow = Record<string, any>;

export default function Proposals2Builder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [proposal, setProposal] = useState<ProposalRow | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [business, setBusiness] = useState<any>(null);
  const [coverSignedUrl, setCoverSignedUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [{ data: proposalData }, { data: itemsData }, { data: userData }] = await Promise.all([
      supabase
        .from("proposals")
        .select("*, clients(name, company, logo_url), projects(name)")
        .eq("id", id)
        .maybeSingle(),
      supabase.from("proposal_services").select("*").eq("proposal_id", id).order("position"),
      supabase.auth.getUser(),
    ]);
    if (!proposalData) {
      toast({ title: "Proposal not found", variant: "destructive" });
      navigate("/proposals-2");
      return;
    }
    setProposal(proposalData as ProposalRow);
    setItems((itemsData || []).map((item: any) => ({ ...item, line_total: Number(item.line_total || 0) })));
    if (userData.user?.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("business_name, business_logo, business_email, notification_preferences")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      setBusiness(profile || null);
    }
    if (proposalData.cover_image_url) {
      const { data: signed } = await supabase.storage.from("proposal-images").createSignedUrl(proposalData.cover_image_url, 3600);
      setCoverSignedUrl(signed?.signedUrl || null);
    } else {
      setCoverSignedUrl(null);
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const layout = useMemo(
    () => parseProposalLayoutDocument(proposal?.layout) || null,
    [proposal?.layout],
  );

  const saveLayout = async () => {
    if (!proposal?.id || !layout) return;
    setSaving(true);
    const { error } = await supabase
      .from("proposals")
      .update({ layout })
      .eq("id", proposal.id);
    setSaving(false);
    if (error) {
      toast({ title: "Could not save layout", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Proposals 2 layout saved" });
    await load();
  };

  if (!proposal) {
    return (
      <AppLayout>
        <div className="text-sm text-muted-foreground">Loading Proposals 2 builder…</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 border-b pb-4">
          <div>
            <PageBreadcrumb items={detailPageBreadcrumb("Proposals 2", "/proposals-2", proposal.identifier || "Draft")} />
            <h1 className="mt-1 text-2xl font-bold">{proposal.identifier || "Draft proposal"}</h1>
            <p className="text-sm text-muted-foreground">Click any section or block to edit. Drag elements from the left panel.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/proposals-2")}>Back to list</Button>
            <Button onClick={saveLayout} disabled={saving || !layout}>{saving ? "Saving..." : "Save layout"}</Button>
          </div>
        </div>

        {!layout ? (
          <Card>
            <CardContent className="space-y-3 p-6">
              <p className="text-sm text-muted-foreground">
                This proposal does not have a Proposals 2 layout yet.
              </p>
              <Button
                onClick={() =>
                  setProposal((current) =>
                    current ? { ...current, layout: createDefaultProposalLayoutDocument() } : current,
                  )
                }
              >
                Initialize Proposals 2 layout
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ProposalLayoutEditor
            value={layout}
            onChange={(next) => setProposal((current) => (current ? { ...current, layout: next } : current))}
            proposal={proposal}
            items={items}
            business={business}
            coverImageUrl={coverSignedUrl}
          />
        )}
      </div>
    </AppLayout>
  );
}
