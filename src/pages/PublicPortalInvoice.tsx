import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { PortalBackLink } from "@/components/clients/PortalBackLink";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getClientPortalPath } from "@/lib/clientPortal";
import { loadClientPortalData } from "@/lib/loadClientPortal";
import { ArrowLeft } from "@/components/icons";
import { formatStatusLabel, getStatusBadgeClass } from "@/lib/statusDisplay";

export default function PublicPortalInvoice() {
  const { portalToken, invoiceId } = useParams<{ portalToken: string; invoiceId: string }>();
  const [searchParams] = useSearchParams();
  const portalFromQuery = searchParams.get("portal") || portalToken || "";
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let revoked: string | null = null;
    const load = async () => {
      if (!portalToken || !invoiceId) {
        setError("Invalid link");
        setLoading(false);
        return;
      }
      try {
        const { data: meta, error: metaErr } = await loadClientPortalData(portalToken, { invoiceId });
        if (metaErr || !meta) {
          setError(metaErr || "Invoice not available");
          setLoading(false);
          return;
        }
        const inv = meta.invoice_meta as { invoice_number?: string; status?: string } | null;
        if (!inv) {
          setError("Invoice not available");
          setLoading(false);
          return;
        }
        setInvoiceNumber(inv.invoice_number || "");
        setStatus(inv.status || null);

        const { data, error: pdfErr } = await supabase.functions.invoke("view-invoice-pdf", {
          body: { portalToken, invoiceId, inline: false },
        });
        if (pdfErr || data?.error) throw new Error(data?.error || pdfErr?.message || "PDF failed");
        const pdfBase64 = data.pdfBase64 as string;
        if (!pdfBase64) throw new Error("No PDF returned");
        const binary = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
        const blob = new Blob([binary], { type: "application/pdf" });
        revoked = URL.createObjectURL(blob);
        setPdfUrl(revoked);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Could not load invoice");
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [portalToken, invoiceId]);

  const handleDownload = () => {
    if (!pdfUrl) return;
    setDownloading(true);
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `${invoiceNumber || "invoice"}.pdf`;
    a.click();
    setDownloading(false);
  };

  const backHref = portalFromQuery ? getClientPortalPath(portalFromQuery) : undefined;

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">
        Loading invoice…
      </div>
    );
  }

  if (error || !pdfUrl) {
    return (
      <div className="min-h-screen grid place-items-center px-4 text-sm text-muted-foreground">
        {error || "Invoice not available."}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {backHref ? (
            <Link
              to={backHref}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to portal
            </Link>
          ) : (
            <PortalBackLink portalToken={portalFromQuery} />
          )}
          <span className="font-medium">{invoiceNumber}</span>
          {status ? (
            <Badge variant="outline" className={getStatusBadgeClass(status)}>
              {formatStatusLabel(status)}
            </Badge>
          ) : null}
        </div>
        <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
          Download PDF
        </Button>
      </div>
      <iframe title={`Invoice ${invoiceNumber}`} src={pdfUrl} className="w-full h-[calc(100vh-56px)] border-0" />
    </div>
  );
}
