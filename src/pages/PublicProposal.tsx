import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PortalBackLink, usePortalTokenFromSearch } from "@/components/clients/PortalBackLink";
import { ProposalDocument } from "@/components/proposals/ProposalDocument";

function getInvokeErrorMessage(error: unknown, data: { error?: string } | null): string {
  if (data?.error) return data.error;
  if (error instanceof Error) return error.message;
  return "Could not accept proposal. Please try again.";
}

export default function PublicProposal() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [state, setState] = useState<"loading" | "unavailable" | "live">("loading");
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const isPreviewMode = searchParams.get("preview") === "1";
  const portalToken = usePortalTokenFromSearch();

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.functions.invoke("view-proposal", { body: { token, preview: isPreviewMode } });
      if (error || data?.error) return setState("unavailable");
      setData(data);
      setState("live");
    };
    void load();
  }, [token, isPreviewMode]);

  const accept = async () => {
    if (!token || accepting || data?.proposal?.status === "accepted") return;
    setAccepting(true);
    setAcceptError(null);
    try {
      const { data: result, error } = await supabase.functions.invoke("accept-proposal", { body: { token } });
      if (error || result?.error) {
        throw new Error(getInvokeErrorMessage(error, result));
      }
      const acceptedAt = result?.accepted_at || new Date().toISOString();
      setData((prev: typeof data) =>
        prev
          ? {
              ...prev,
              proposal: {
                ...prev.proposal,
                status: "accepted",
                accepted_at: acceptedAt,
              },
            }
          : prev,
      );
    } catch (error: unknown) {
      setAcceptError(getInvokeErrorMessage(error, null));
    } finally {
      setAccepting(false);
    }
  };

  if (state === "loading") return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading proposal...</div>;
  if (state === "unavailable") return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Proposal not available.</div>;

  const proposal = data.proposal;
  const items = data.items || [];

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <PortalBackLink portalToken={portalToken} />
      </div>
      <ProposalDocument
        proposal={proposal}
        items={items}
        business={data.business}
        coverImageUrl={data.cover_image_signed_url}
        onAccept={accept}
        accepting={accepting}
        acceptError={acceptError}
        onSendMessage={() => {
          window.location.href = `mailto:${data.business?.business_email || data.business?.email || ""}`;
        }}
      />
    </div>
  );
}
