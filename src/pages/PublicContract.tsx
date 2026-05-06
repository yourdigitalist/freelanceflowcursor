import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import DOMPurify from "dompurify";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle } from "@/components/icons";
import { DEFAULT_CONTRACT_TEMPLATE_CONTENT, renderTemplate } from "@/lib/contractTemplate";
import type { Contract, ContractService } from "@/types/contracts";

type Step = "view" | "details" | "agree" | "otp" | "done";

export default function PublicContract() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contract, setContract] = useState<(Contract & { projects?: { name: string } | null }) | null>(null);
  const [services, setServices] = useState<ContractService[]>([]);
  const [step, setStep] = useState<Step>("view");
  const [agreeChecked, setAgreeChecked] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSentAt, setOtpSentAt] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [detailsFeedback, setDetailsFeedback] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpFeedback, setOtpFeedback] = useState<string | null>(null);
  const [templateContent, setTemplateContent] = useState(DEFAULT_CONTRACT_TEMPLATE_CONTENT);
  const pdfOpenInFlightRef = useRef(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [clientData, setClientData] = useState({
    client_entity_type: "individual",
    client_name: "",
    client_company: "",
    client_email: "",
    client_phone: "",
    client_address: "",
    client_city: "",
    client_state: "",
    client_zip: "",
    client_country: "",
    client_tax_id: "",
  });
  const searchParams = new URLSearchParams(window.location.search);
  const inAppMode = searchParams.get("inapp") === "1";
  const composeFullAddress = (parts: Array<string | null | undefined>, fallback?: string | null) => {
    const structured = parts
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(", ");
    return structured || (fallback || null);
  };
  const handleSaveAsPDF = async () => {
    if (!contract || pdfOpenInFlightRef.current || pdfGenerating) return;
    const element = document.getElementById("contract-content");
    if (!element) {
      setOtpError("Could not generate PDF right now. Please try again.");
      return;
    }
    pdfOpenInFlightRef.current = true;
    setPdfGenerating(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginX = 10;
      const marginY = 12;
      const printableWidth = pageWidth - marginX * 2;
      const printableHeight = pageHeight - marginY * 2;
      const pxPerMm = canvas.width / printableWidth;
      const targetSlicePx = Math.floor(printableHeight * pxPerMm);
      const searchWindowPx = 120;
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      const sourceCtx = canvas.getContext("2d");
      const pageCtx = pageCanvas.getContext("2d");
      if (!sourceCtx || !pageCtx) throw new Error("Could not prepare PDF canvas.");

      const pickCutY = (startY: number, desiredEndY: number) => {
        const minY = Math.max(startY + Math.floor(targetSlicePx * 0.65), desiredEndY - searchWindowPx);
        const maxY = Math.min(canvas.height, desiredEndY + searchWindowPx);
        let bestY = Math.min(desiredEndY, canvas.height);
        let bestScore = -1;
        for (let y = minY; y <= maxY; y += 3) {
          const row = sourceCtx.getImageData(0, y - 1, canvas.width, 1).data;
          let lightPixels = 0;
          for (let i = 0; i < row.length; i += 16 * 4) {
            const r = row[i] || 0;
            const g = row[i + 1] || 0;
            const b = row[i + 2] || 0;
            if (r > 240 && g > 240 && b > 240) lightPixels += 1;
          }
          if (lightPixels > bestScore) {
            bestScore = lightPixels;
            bestY = y;
          }
        }
        return bestY;
      };

      let startY = 0;
      let pageIndex = 0;
      while (startY < canvas.height) {
        const desiredEndY = Math.min(canvas.height, startY + targetSlicePx);
        const endY = desiredEndY >= canvas.height ? canvas.height : pickCutY(startY, desiredEndY);
        const sliceHeight = Math.max(1, endY - startY);
        pageCanvas.height = sliceHeight;
        pageCtx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
        pageCtx.drawImage(canvas, 0, startY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
        const imgData = pageCanvas.toDataURL("image/png");
        if (pageIndex > 0) pdf.addPage();
        const sliceHeightMm = sliceHeight / pxPerMm;
        pdf.addImage(imgData, "PNG", marginX, marginY, printableWidth, sliceHeightMm);
        startY = endY;
        pageIndex += 1;
      }
      pdf.save(`${contract.identifier || "contract"}.pdf`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setOtpError(message);
    } finally {
      setPdfGenerating(false);
      pdfOpenInFlightRef.current = false;
    }
  };

  const readFunctionErrorMessage = async (
    error: unknown,
    fallback: string,
    data?: { error?: string } | null,
  ) => {
    if (data?.error) return data.error;
    if (error && typeof error === "object" && "context" in error) {
      try {
        const response = (error as { context?: Response }).context;
        if (response) {
          const body = (await response.json()) as { error?: string };
          if (body?.error) return body.error;
        }
      } catch {
        // Ignore parse issues and use fallback below.
      }
    }
    if (error && typeof error === "object" && "message" in error) {
      const message = String((error as { message?: unknown }).message || "").trim();
      if (message) return message;
    }
    return fallback;
  };


  const load = async () => {
    if (!token) return;
    const preview = new URLSearchParams(window.location.search).get("preview") === "1";
    const { data, error } = await supabase.functions.invoke("get-contract", { body: { token, preview } });
    if (error || data?.error) {
      setError(data?.error || "This contract is not available.");
      setLoading(false);
      return;
    }
    setContract(data.contract);
    setServices(data.services || []);
    if (data.contract?.template_id) {
      const { data: template } = await supabase.from("contract_templates").select("content").eq("id", data.contract.template_id).maybeSingle();
      setTemplateContent(template?.content || DEFAULT_CONTRACT_TEMPLATE_CONTENT);
    } else {
      setTemplateContent(DEFAULT_CONTRACT_TEMPLATE_CONTENT);
    }
    setClientData({
      client_entity_type: data.contract.client_entity_type || "individual",
      client_name: data.contract.client_name || "",
      client_company: data.contract.client_company || "",
      client_email: data.contract.client_email || "",
      client_phone: data.contract.client_phone || "",
      client_address:
        composeFullAddress(
          [
            data.contract.client_street,
            data.contract.client_street2,
            data.contract.client_city,
            data.contract.client_state,
            data.contract.client_zip,
            data.contract.client_country,
          ],
          data.contract.client_address,
        ) || "",
      client_city: data.contract.client_city || "",
      client_state: data.contract.client_state || "",
      client_zip: data.contract.client_zip || "",
      client_country: data.contract.client_country || "",
      client_tax_id: data.contract.client_tax_id || "",
    });
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [token]);

  const renderedTemplate = useMemo(() => {
    if (!contract) return "";
    return renderTemplate(templateContent, {
      identifier: contract.identifier,
      today: null,
      signed_date: contract.client_signed_at || contract.freelancer_signed_at || null,
      project_name: contract.projects?.name || null,
      client_entity_type: contract.client_entity_type || "individual",
      client_name: contract.client_name,
      client_company_name: (contract as any).client_company_name || contract.client_company,
      client_tax_id: contract.client_tax_id,
      client_company_registration: (contract as any).client_company_registration || null,
      client_email: contract.client_email,
      client_phone: contract.client_phone,
      client_address: composeFullAddress([contract.client_street, contract.client_street2, contract.client_city, contract.client_state, contract.client_zip, contract.client_country], contract.client_address),
      client_complement: (contract as any).client_complement || null,
      freelancer_name: contract.freelancer_name,
      freelancer_company_name: (contract as any).freelancer_company_name || contract.freelancer_company,
      freelancer_tax_id: contract.freelancer_tax_id,
      freelancer_company_registration: (contract as any).freelancer_company_registration || null,
      freelancer_email: contract.freelancer_email,
      freelancer_phone: contract.freelancer_phone,
      freelancer_address: composeFullAddress([contract.freelancer_street, contract.freelancer_street2, contract.freelancer_city, contract.freelancer_state, contract.freelancer_zip, contract.freelancer_country], contract.freelancer_address),
      freelancer_complement: (contract as any).freelancer_complement || null,
      services: services.map((service) => ({ name: service.name, description: service.description, quantity: service.quantity })),
      timeline_days: contract.timeline_days,
      payment_structure: contract.payment_structure,
      payment_methods: contract.payment_methods || [],
      installment_description: contract.installment_description,
      payment_link: contract.payment_link,
      additional_clause: contract.additional_clause,
      total: Number(contract.total || 0),
    });
  }, [contract, services, templateContent]);
  const sanitizedTemplateHtml = useMemo(() => DOMPurify.sanitize(renderedTemplate), [renderedTemplate]);

  const submitDetails = async () => {
    if (!token) return;
    setDetailsError(null);
    setDetailsFeedback(null);
    setSubmitting(true);
    const { error, data } = await supabase.functions.invoke("update-contract-client-details", {
      body: { token, clientData },
    });
    setSubmitting(false);
    if (error || data?.error) {
      setDetailsError(await readFunctionErrorMessage(error, "Could not confirm details. Please try again.", data));
      return;
    }
    setContract((prev) => (prev ? { ...prev, ...clientData } : prev));
    setDetailsFeedback("Details confirmed successfully. Continue to legal agreement.");
    setStep("agree");
  };

  const requestOtp = async () => {
    if (!token) return;
    if (!clientData.client_email?.trim()) {
      setOtpError("Client email is required before requesting a verification code.");
      return;
    }
    setOtpError(null);
    setOtpFeedback(null);
    setSubmitting(true);
    const { error, data } = await supabase.functions.invoke("send-contract-otp", {
      body: { token, email: clientData.client_email.trim(), signer_type: "client" },
    });
    setSubmitting(false);
    if (error || data?.error) {
      setOtpError(await readFunctionErrorMessage(error, "Could not send verification code. Please try again.", data));
      return;
    }
    setOtpSentAt(Date.now());
    setOtpCode("");
    setOtpFeedback(`Verification code sent to ${clientData.client_email.trim()}.`);
    setStep("otp");
  };

  const verifyOtp = async () => {
    if (!token) return;
    setOtpError(null);
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("verify-contract-otp", {
      body: {
        token,
        code: otpCode,
        signer_type: "client",
        signer_name: clientData.client_name,
        signer_email: clientData.client_email,
        signer_tax_id: clientData.client_tax_id,
        signer_ip: null,
        signer_geo: null,
        signer_device: typeof navigator !== "undefined" ? `${navigator.platform}/${navigator.userAgent}` : "Unknown device",
        signer_isp: null,
        email_verified: true,
      },
    });
    setSubmitting(false);
    if (error || data?.error) {
      setOtpError(await readFunctionErrorMessage(error, "Invalid or expired code. Please request a new one.", data));
      return;
    }
    setStep("done");
    await load();
  };

  const resendBlocked = otpSentAt ? Date.now() - otpSentAt < 60 * 1000 : false;

  if (loading) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading contract...</div>;
  if (error || !contract) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">This contract is not available.</div>;

  const bothSigned = !!contract.freelancer_signed_at && !!contract.client_signed_at;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="mx-auto max-w-4xl space-y-4">
        <button className="text-sm text-muted-foreground hover:text-foreground" onClick={() => history.back()}>
          ← Back to Client Area
        </button>

        {(step === "view" || bothSigned) && (
          <>
            {bothSigned ? (
              <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                This contract has been signed by both parties.
              </div>
            ) : null}
            <div id="contract-content" className="rounded-xl border bg-white p-8">
              <h1 className="mb-6 text-center text-2xl font-semibold">FREELANCE SERVICES AGREEMENT</h1>
              {inAppMode ? (
                <div className="mb-6 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
                  Highlighted text shows fields automatically pulled from saved records.
                </div>
              ) : null}
              <section
                className="mb-6 text-[15px] leading-relaxed text-zinc-800 [&_h1]:mb-3 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold [&_h4]:mb-2 [&_h4]:text-lg [&_h4]:font-semibold [&_p]:mb-2 [&_ul]:mb-2 [&_ol]:mb-2 [&_li]:ml-5"
                dangerouslySetInnerHTML={{ __html: sanitizedTemplateHtml }}
              />
              <section className="mt-10 border-t pt-6">
                <div className="mb-5 text-right text-sm text-zinc-600">
                  {contract.freelancer_city || contract.client_city || "City"}, {new Date().toLocaleDateString()}
                </div>
                <div className="mb-6 grid gap-8 md:grid-cols-2">
                  <div className="text-center">
                    <p className={`text-xl font-semibold ${contract.client_signed_at ? "text-zinc-800" : "text-amber-600"}`}>
                      {contract.client_signed_name || contract.client_name || "Signature pending"}
                    </p>
                    <div className="mx-auto mt-3 h-px w-full bg-zinc-500" />
                    <p className="mt-2 text-lg font-semibold tracking-wide text-zinc-900">CONTRACTING PARTY</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Signed at: {contract.client_signed_at ? new Date(contract.client_signed_at).toLocaleString() : "Pending signature"}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className={`text-xl font-semibold ${contract.freelancer_signed_at ? "text-zinc-800" : "text-amber-600"}`}>
                      {contract.freelancer_signed_name || contract.freelancer_name || "Signature pending"}
                    </p>
                    <div className="mx-auto mt-3 h-px w-full bg-zinc-500" />
                    <p className="mt-2 text-lg font-semibold tracking-wide text-zinc-900">SERVICE PROVIDER</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Signed at: {contract.freelancer_signed_at ? new Date(contract.freelancer_signed_at).toLocaleString() : "Pending signature"}
                    </p>
                  </div>
                </div>
              </section>
              <section className="mt-6 border-t pt-6">
                <h3 className="mb-3 text-lg font-semibold text-zinc-900">Signature evidence</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className={`rounded-lg border p-4 ${contract.freelancer_signed_at ? "bg-emerald-50 border-emerald-200" : "bg-muted/30 border-border"}`}>
                    <p className={`font-semibold ${contract.freelancer_signed_at ? "text-emerald-700" : "text-amber-600"}`}>{contract.freelancer_signed_at ? "Signed by freelancer" : "Freelancer signature pending"}</p>
                    <p className="text-sm"><strong>Name:</strong> {contract.freelancer_signed_name || contract.freelancer_name || "—"}</p>
                    <p className="text-sm"><strong>Company:</strong> {contract.freelancer_company || "—"}</p>
                    <p className="text-sm"><strong>Tax ID:</strong> {contract.freelancer_tax_id || "—"}</p>
                    <p className="text-sm"><strong>Email:</strong> {contract.freelancer_email || "—"} {contract.freelancer_sign_email_verified ? "• Email validated" : ""}</p>
                    <p className={`text-sm ${contract.freelancer_signed_at ? "text-emerald-700" : "text-amber-600"}`}><strong>Date and time:</strong> {contract.freelancer_signed_at ? new Date(contract.freelancer_signed_at).toLocaleString() : "Pending signature"}</p>
                    <p className="text-sm"><strong>Geolocation:</strong> {contract.freelancer_sign_geo || "—"}</p>
                    <p className="text-sm"><strong>IP:</strong> {contract.freelancer_sign_ip || "—"}{contract.freelancer_sign_isp ? ` (${contract.freelancer_sign_isp})` : ""}</p>
                    <p className="text-sm"><strong>Device:</strong> {contract.freelancer_sign_device || "—"}</p>
                  </div>
                  <div className={`rounded-lg border p-4 ${contract.client_signed_at ? "bg-emerald-50 border-emerald-200" : "bg-muted/30 border-border"}`}>
                    <p className={`font-semibold ${contract.client_signed_at ? "text-emerald-700" : "text-amber-600"}`}>{contract.client_signed_at ? "Signed by client" : "Client signature pending"}</p>
                    <p className="text-sm"><strong>Name:</strong> {contract.client_signed_name || contract.client_name || "—"}</p>
                    {contract.client_entity_type === "company" ? <p className="text-sm"><strong>Company:</strong> {contract.client_company || "—"}</p> : null}
                    <p className="text-sm"><strong>Tax ID:</strong> {contract.client_tax_id || "—"}</p>
                    <p className="text-sm"><strong>Email:</strong> {contract.client_email || "—"} {contract.client_sign_email_verified ? "• Email validated" : ""}</p>
                    <p className={`text-sm ${contract.client_signed_at ? "text-emerald-700" : "text-amber-600"}`}><strong>Date and time:</strong> {contract.client_signed_at ? new Date(contract.client_signed_at).toLocaleString() : "Pending signature"}</p>
                    <p className="text-sm"><strong>Geolocation:</strong> {contract.client_sign_geo || "—"}</p>
                    <p className="text-sm"><strong>IP:</strong> {contract.client_sign_ip || "—"}{contract.client_sign_isp ? ` (${contract.client_sign_isp})` : ""}</p>
                    <p className="text-sm"><strong>Device:</strong> {contract.client_sign_device || "—"}</p>
                  </div>
                </div>
              </section>
              <footer className="mt-10 border-t pt-4 text-center text-xs text-zinc-500">
                Contract generated and signed digitally via Lance.
              </footer>
            </div>
            <div className="sticky bottom-4 z-20 flex flex-wrap gap-2 rounded-lg border bg-card p-3 shadow">
              <Button variant="outline" onClick={() => void handleSaveAsPDF()} disabled={pdfGenerating}>
                {pdfGenerating ? "Generating PDF..." : "Save as PDF"}
              </Button>
              {!bothSigned ? (
                <Button onClick={() => setStep("details")}>Confirm details and sign</Button>
              ) : null}
            </div>
          </>
        )}

        {step === "details" && (
          <Card>
            <CardContent className="space-y-4 p-6">
              <h2 className="text-xl font-semibold">Confirm your details</h2>
              <p className="text-sm text-muted-foreground">Please confirm your details below to complete the electronic signing of this contract.</p>
              <div className="space-y-1">
                <Label>Entity type</Label>
                <RadioGroup value={clientData.client_entity_type} onValueChange={(value) => setClientData((prev) => ({ ...prev, client_entity_type: value }))} className="flex gap-4">
                  <div className="flex items-center gap-2"><RadioGroupItem id="individual" value="individual" /><Label htmlFor="individual">Individual</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem id="company" value="company" /><Label htmlFor="company">Company</Label></div>
                </RadioGroup>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {([
                  ["client_name", "Full name"],
                  ["client_email", "Email"],
                  ["client_phone", "Phone"],
                  ["client_address", "Address"],
                  ["client_city", "City"],
                  ["client_state", "State"],
                  ["client_zip", "ZIP"],
                  ["client_country", "Country"],
                  ["client_tax_id", "Tax ID"],
                ] as const).map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <Label>{label}</Label>
                    <Input value={clientData[key] || ""} onChange={(event) => setClientData((prev) => ({ ...prev, [key]: event.target.value }))} />
                  </div>
                ))}
                {clientData.client_entity_type === "company" ? (
                  <div className="space-y-1">
                    <Label>Company name</Label>
                    <Input value={clientData.client_company || ""} onChange={(event) => setClientData((prev) => ({ ...prev, client_company: event.target.value }))} />
                  </div>
                ) : null}
              </div>
              {detailsError ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {detailsError}
                </p>
              ) : null}
              {detailsFeedback ? (
                <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {detailsFeedback}
                </p>
              ) : null}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("view")}>Go back</Button>
                <Button onClick={() => void submitDetails()} disabled={submitting}>Confirm details</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "agree" && (
          <Card>
            <CardContent className="space-y-4 p-6">
              <h2 className="text-xl font-semibold">Sign this contract</h2>
              <p className="text-sm text-muted-foreground">
                You are signing contract {contract.identifier}, for {new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(Number(contract.total || 0))}, related to project {contract.projects?.name || "Not specified"}.
                The signature will be made in the name of {clientData.client_name || "the client"}.
              </p>
              <div className="flex items-start gap-2 rounded-md border p-3">
                <Checkbox id="agree" checked={agreeChecked} onCheckedChange={(checked) => setAgreeChecked(!!checked)} />
                <Label htmlFor="agree">I have read and agree to the terms of this contract and take responsibility for the accuracy of the information provided.</Label>
              </div>
              {otpError ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {otpError}
                </p>
              ) : null}
              {otpFeedback ? (
                <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {otpFeedback}
                </p>
              ) : null}
              <Button onClick={() => void requestOtp()} disabled={!agreeChecked || submitting}>Receive verification code</Button>
            </CardContent>
          </Card>
        )}

        {step === "otp" && (
          <Card>
            <CardContent className="space-y-4 p-6">
              <h2 className="text-xl font-semibold">Verify your email to sign</h2>
              <p className="text-sm text-muted-foreground">
                For your security, a 6-digit code has been sent to {clientData.client_email}. Enter it below to verify your identity and sign the contract.
              </p>
              <div className="space-y-1">
                <Label>6-digit code</Label>
                <Input value={otpCode} maxLength={6} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className="max-w-[220px] tracking-[0.4em] text-lg font-semibold" />
              </div>
              {otpError ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {otpError}
                </p>
              ) : null}
              {otpFeedback ? (
                <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {otpFeedback}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => void verifyOtp()} disabled={otpCode.length !== 6 || submitting}>
                  Verify and sign
                </Button>
                <button
                  type="button"
                  disabled={resendBlocked}
                  className="text-sm text-primary disabled:text-muted-foreground"
                  onClick={() => void requestOtp()}
                >
                  Resend code
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "done" && (
          <Card>
            <CardContent className="space-y-4 p-8 text-center">
              <CheckCircle className="mx-auto h-10 w-10 text-emerald-600" />
              <h2 className="text-2xl font-semibold text-emerald-700">Contract signed successfully!</h2>
              <p className="text-sm text-muted-foreground">
                Your signature has been recorded. Both parties will receive a copy for their records.
              </p>
              <div>
                <Button variant="outline" onClick={() => void handleSaveAsPDF()} disabled={pdfGenerating}>
                  {pdfGenerating ? "Generating PDF..." : "Save as PDF"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

      </div>

      <style>{`
        ${inAppMode ? `
        #crisp-chatbox, .crisp-client, [id*="crisp"], [class*="crisp"] {
          display: none !important;
          visibility: hidden !important;
        }
        ` : ""}
      `}</style>
    </div>
  );
}
