import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DOMPurify from "dompurify";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ArrowLeft, CheckCircle, Plus, Trash2 } from "@/components/icons";
import { DEFAULT_CONTRACT_TEMPLATE_CONTENT, renderTemplate } from "@/lib/contractTemplate";
import type { Contract, ContractService } from "@/types/contracts";

const PAYMENT_METHOD_OPTIONS = [
  "bank transfer",
  "credit card",
  "debit card",
  "paypal",
  "stripe",
  "crypto",
  "other",
];

type EditableParty = "client" | "freelancer" | null;

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [contract, setContract] = useState<(Contract & { clients?: { name: string; company?: string | null } | null; projects?: { name: string } | null }) | null>(null);
  const [items, setItems] = useState<ContractService[]>([]);
  const [activeTab, setActiveTab] = useState("data");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [allProjects, setAllProjects] = useState<Array<{ id: string; name: string; client_id: string | null }>>([]);
  const [services, setServices] = useState<Array<{ id: string; name: string; description: string | null; price: number | null }>>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [lastSaveError, setLastSaveError] = useState<string | null>(null);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [signedCopy, setSignedCopy] = useState(false);
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [freelancerOtpOpen, setFreelancerOtpOpen] = useState(false);
  const [freelancerOtpCode, setFreelancerOtpCode] = useState("");
  const [freelancerOtpSentAt, setFreelancerOtpSentAt] = useState<number | null>(null);
  const [freelancerSigning, setFreelancerSigning] = useState(false);
  const [partySheet, setPartySheet] = useState<EditableParty>(null);
  const [partyForm, setPartyForm] = useState<Record<string, string>>({});
  const [templateName, setTemplateName] = useState("Default template");
  const [templateContent, setTemplateContent] = useState(DEFAULT_CONTRACT_TEMPLATE_CONTENT);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const saveInFlightRef = useRef(false);
  const pdfOpenInFlightRef = useRef(false);
  const clientViewOpenInFlightRef = useRef(false);
  const composeFullAddress = (parts: Array<string | null | undefined>, fallback?: string | null) => {
    const structured = parts
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(", ");
    return structured || (fallback || null);
  };

  const load = async () => {
    if (!id) return;
    const [{ data: c }, { data: lineItems }, { data: catalog }, { data: projects }, { data: profile }] = await Promise.all([
      supabase.from("contracts").select("*, clients(name, company), projects(name)").eq("id", id).single(),
      supabase.from("contract_services").select("*").eq("contract_id", id).order("sort_order"),
      supabase.from("services").select("*").order("name"),
      supabase.from("projects").select("id, name, client_id").order("name"),
      user
        ? supabase
            .from("profiles")
            .select("full_name, email, business_name, business_phone, business_street, business_street2, business_city, business_state, business_postal_code, business_country, tax_id")
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    const mergedContract = c
      ? {
          ...c,
          client_company: c.client_company || c.clients?.company || null,
          freelancer_name: c.freelancer_name || profile?.full_name || null,
          freelancer_email: c.freelancer_email || profile?.email || null,
          freelancer_company: c.freelancer_company || profile?.business_name || null,
          freelancer_phone: c.freelancer_phone || profile?.business_phone || null,
          freelancer_street: c.freelancer_street || profile?.business_street || null,
          freelancer_street2: c.freelancer_street2 || profile?.business_street2 || null,
          freelancer_city: c.freelancer_city || profile?.business_city || null,
          freelancer_state: c.freelancer_state || profile?.business_state || null,
          freelancer_zip: c.freelancer_zip || profile?.business_postal_code || null,
          freelancer_country: c.freelancer_country || profile?.business_country || null,
          freelancer_tax_id: c.freelancer_tax_id || profile?.tax_id || null,
        }
      : null;
    setContract(mergedContract);
    if (c?.template_id) {
      const { data: template } = await supabase.from("contract_templates").select("name, content").eq("id", c.template_id).maybeSingle();
      setTemplateName(template?.name || "Contract template");
      setTemplateContent(template?.content || DEFAULT_CONTRACT_TEMPLATE_CONTENT);
    } else {
      setTemplateName("Default template");
      setTemplateContent(DEFAULT_CONTRACT_TEMPLATE_CONTENT);
    }
    setItems((lineItems || []).map((item) => ({ ...item, price: Number(item.price || 0), quantity: Number(item.quantity || 1) })));
    setServices(catalog || []);
    setAllProjects((projects || []) as Array<{ id: string; name: string; client_id: string | null }>);
  };

  useEffect(() => {
    void load();
  }, [id]);

  const isLocked = ["pending_signatures", "signed", "cancelled"].includes(contract?.status || "");
  const filteredProjects = useMemo(
    () => allProjects.filter((project) => !contract?.client_id || project.client_id === contract.client_id),
    [allProjects, contract?.client_id],
  );
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
    [items],
  );
  const discountAmount = useMemo(() => {
    if (!contract) return 0;
    if (contract.discount_type === "percent") return subtotal * (Number(contract.discount || 0) / 100);
    return Number(contract.discount || 0);
  }, [contract, subtotal]);
  const total = Math.max(0, subtotal - discountAmount);
  const renderedTemplate = useMemo(() => {
    if (!contract) return "";
    return renderTemplate(templateContent, {
      identifier: contract.identifier,
      today: null,
      signed_date: contract.client_signed_at || contract.freelancer_signed_at || null,
      project_name: contract.projects?.name || null,
      client_entity_type: contract.client_entity_type || "individual",
      client_name: contract.client_name,
      client_company_name: (contract as { client_company_name?: string | null }).client_company_name || contract.client_company,
      client_tax_id: contract.client_tax_id,
      client_company_registration: (contract as { client_company_registration?: string | null }).client_company_registration || null,
      client_email: contract.client_email,
      client_phone: contract.client_phone,
      client_address: composeFullAddress(
        [contract.client_street, contract.client_street2, contract.client_city, contract.client_state, contract.client_zip, contract.client_country],
        contract.client_address,
      ),
      client_complement: (contract as { client_complement?: string | null }).client_complement || null,
      freelancer_name: contract.freelancer_name,
      freelancer_company_name: (contract as { freelancer_company_name?: string | null }).freelancer_company_name || contract.freelancer_company,
      freelancer_tax_id: contract.freelancer_tax_id,
      freelancer_company_registration: (contract as { freelancer_company_registration?: string | null }).freelancer_company_registration || null,
      freelancer_email: contract.freelancer_email,
      freelancer_phone: contract.freelancer_phone,
      freelancer_address: composeFullAddress(
        [contract.freelancer_street, contract.freelancer_street2, contract.freelancer_city, contract.freelancer_state, contract.freelancer_zip, contract.freelancer_country],
        contract.freelancer_address,
      ),
      freelancer_complement: (contract as { freelancer_complement?: string | null }).freelancer_complement || null,
      services: items.map((service) => ({
        name: service.name,
        description: service.description,
        quantity: service.quantity,
      })),
      timeline_days: contract.timeline_days,
      payment_structure: contract.payment_structure,
      payment_methods: contract.payment_methods || [],
      installment_description: contract.installment_description,
      payment_link: contract.payment_link,
      additional_clause: contract.additional_clause,
      total: Number(contract.total || 0),
    });
  }, [contract, items, templateContent]);
  const sanitizedTemplateHtml = useMemo(() => DOMPurify.sanitize(renderedTemplate), [renderedTemplate]);

  const updateContract = (patch: Record<string, unknown>) =>
    setContract((prev) => (prev ? { ...prev, ...patch } : prev));

  const persistServices = async () => {
    if (!id) return { ok: false };
    const rows = items
      .map((item, index) => {
        const name = String(item.name || "").trim();
        if (!name) return null;
        return {
          contract_id: id,
          service_id: item.service_id || null,
          name,
          description: item.description || null,
          price: Number(item.price || 0),
          quantity: Math.max(1, Number(item.quantity || 1)),
          sort_order: index,
        };
      })
      .filter(Boolean);
    const { error: deleteError } = await supabase.from("contract_services").delete().eq("contract_id", id);
    if (deleteError) return { ok: false, error: deleteError };
    if (rows.length) {
      const { error: insertError } = await supabase.from("contract_services").insert(rows as never);
      if (insertError) return { ok: false, error: insertError };
    }
    return { ok: true };
  };

  const save = async (silent = false) => {
    if (!contract || !id || saveInFlightRef.current) return false;
    if (isLocked) return true;
    saveInFlightRef.current = true;
    setSaveStatus("saving");
    try {
      const paymentMethodsForSave =
        (contract.payment_methods || []).includes("other") && contract.payment_other
          ? [...(contract.payment_methods || []).filter((m: string) => m !== "other"), `other: ${contract.payment_other}`]
          : (contract.payment_methods || []).filter((m: string) => m !== "other");

      const payload = {
        identifier: contract.identifier,
        client_id: contract.client_id,
        project_id: contract.project_id || null,
        client_entity_type: contract.client_entity_type || "individual",
        client_name: contract.client_name || null,
        client_company: contract.client_company || null,
        client_email: contract.client_email || null,
        client_phone: contract.client_phone || null,
        client_address: composeFullAddress(
          [contract.client_street, contract.client_street2, contract.client_city, contract.client_state, contract.client_zip, contract.client_country],
          contract.client_address,
        ),
        client_city: contract.client_city || null,
        client_state: contract.client_state || null,
        client_zip: contract.client_zip || null,
        client_country: contract.client_country || null,
        client_tax_id: contract.client_tax_id || null,
        client_street: contract.client_street || contract.client_address || null,
        client_street2: contract.client_street2 || null,
        freelancer_name: contract.freelancer_name || null,
        freelancer_company: contract.freelancer_company || null,
        freelancer_email: contract.freelancer_email || null,
        freelancer_phone: contract.freelancer_phone || null,
        freelancer_address: composeFullAddress(
          [contract.freelancer_street, contract.freelancer_street2, contract.freelancer_city, contract.freelancer_state, contract.freelancer_zip, contract.freelancer_country],
          contract.freelancer_address,
        ),
        freelancer_city: contract.freelancer_city || null,
        freelancer_state: contract.freelancer_state || null,
        freelancer_zip: contract.freelancer_zip || null,
        freelancer_country: contract.freelancer_country || null,
        freelancer_tax_id: contract.freelancer_tax_id || null,
        freelancer_street: contract.freelancer_street || contract.freelancer_address || null,
        freelancer_street2: contract.freelancer_street2 || null,
        timeline_days: contract.timeline_days || null,
        reminder_near_end: !!contract.reminder_near_end,
        immediate_availability: !!contract.immediate_availability,
        payment_structure: contract.payment_structure || null,
        installment_description: contract.installment_description || null,
        payment_methods: paymentMethodsForSave,
        payment_link: contract.payment_link || null,
        additional_clause: contract.additional_clause || null,
        subtotal,
        discount: contract.discount || 0,
        discount_type: contract.discount_type || "fixed",
        total,
      };
      const { error } = await supabase.from("contracts").update(payload as never).eq("id", id);
      if (error) {
        setSaveStatus("failed");
        setLastSaveError(error.message);
        if (!silent) toast({ title: "Error saving contract", description: error.message, variant: "destructive" });
        return false;
      }
      const servicesResult = await persistServices();
      if (!servicesResult.ok) {
        setSaveStatus("failed");
        setLastSaveError(servicesResult.error?.message || "Could not save services");
        if (!silent) toast({ title: "Error saving services", description: servicesResult.error?.message, variant: "destructive" });
        return false;
      }
      setSaveStatus("saved");
      setLastSaveError(null);
      if (!silent) toast({ title: "Contract saved" });
      await load();
      return true;
    } finally {
      saveInFlightRef.current = false;
    }
  };

  const onTabChange = async (nextTab: string) => {
    if (nextTab === activeTab) return;
    if (!isLocked) {
      const ok = await save(true);
      if (!ok) return;
    }
    setActiveTab(nextTab);
  };

  const openPartySheet = (party: EditableParty) => {
    if (!contract) return;
    if (party === "client") {
      setPartyForm({
        name: contract.client_name || "",
        company: contract.client_company || "",
        email: contract.client_email || "",
        phone: contract.client_phone || "",
        tax_id: contract.client_tax_id || "",
        street: contract.client_street || "",
        street2: contract.client_street2 || "",
        city: contract.client_city || "",
        state: contract.client_state || "",
        zip: contract.client_zip || "",
        country: contract.client_country || "",
        entity_type: contract.client_entity_type || "individual",
      });
    } else if (party === "freelancer") {
      setPartyForm({
        name: contract.freelancer_name || "",
        company: contract.freelancer_company || "",
        email: contract.freelancer_email || "",
        phone: contract.freelancer_phone || "",
        tax_id: contract.freelancer_tax_id || "",
        street: contract.freelancer_street || "",
        street2: contract.freelancer_street2 || "",
        city: contract.freelancer_city || "",
        state: contract.freelancer_state || "",
        zip: contract.freelancer_zip || "",
        country: contract.freelancer_country || "",
      });
    }
    setPartySheet(party);
  };

  const savePartySheet = async () => {
    if (!partySheet || !contract) return;
    const composeAddress = () =>
      [partyForm.street, partyForm.street2, partyForm.city, partyForm.state, partyForm.zip, partyForm.country]
        .filter((value) => Boolean(String(value || "").trim()))
        .join(", ");
    const composedAddress = composeAddress();
    if (partySheet === "client" && contract.client_id) {
      await supabase
        .from("clients")
        .update({
          name: partyForm.name || null,
          company: partyForm.company || null,
          email: partyForm.email || null,
          phone: partyForm.phone || null,
          address: composedAddress || null,
          street: partyForm.street || null,
          street2: partyForm.street2 || null,
          city: partyForm.city || null,
          state: partyForm.state || null,
          postal_code: partyForm.zip || null,
          country: partyForm.country || null,
        } as never)
        .eq("id", contract.client_id);
      updateContract({
        client_name: partyForm.name || null,
        client_company: partyForm.company || null,
        client_email: partyForm.email || null,
        client_phone: partyForm.phone || null,
        client_address: composedAddress || null,
        client_city: partyForm.city || null,
        client_state: partyForm.state || null,
        client_zip: partyForm.zip || null,
        client_country: partyForm.country || null,
        client_tax_id: partyForm.tax_id || null,
        client_street: partyForm.street || partyForm.address || null,
        client_street2: partyForm.street2 || null,
        client_entity_type: partyForm.entity_type || "individual",
      });
    }
    if (partySheet === "freelancer" && user) {
      await supabase
        .from("profiles")
        .update({
          full_name: partyForm.name || null,
          business_name: partyForm.company || null,
          email: partyForm.email || null,
          business_phone: partyForm.phone || null,
          business_address: composedAddress || null,
          business_city: partyForm.city || null,
          business_state: partyForm.state || null,
          business_postal_code: partyForm.zip || null,
          business_country: partyForm.country || null,
          tax_id: partyForm.tax_id || null,
          business_street: partyForm.street || null,
          business_street2: partyForm.street2 || null,
        } as never)
        .eq("user_id", user.id);
      updateContract({
        freelancer_name: partyForm.name || null,
        freelancer_company: partyForm.company || null,
        freelancer_email: partyForm.email || null,
        freelancer_phone: partyForm.phone || null,
        freelancer_address: composedAddress || null,
        freelancer_city: partyForm.city || null,
        freelancer_state: partyForm.state || null,
        freelancer_zip: partyForm.zip || null,
        freelancer_country: partyForm.country || null,
        freelancer_tax_id: partyForm.tax_id || null,
        freelancer_street: partyForm.street || partyForm.address || null,
        freelancer_street2: partyForm.street2 || null,
      });
    }
    setPartySheet(null);
  };

  const signerDevice = typeof navigator !== "undefined"
    ? `${navigator.platform}/${navigator.userAgent}`
    : "Unknown device";

  const requestFreelancerOtp = async () => {
    if (!id || !contract || !user?.email) return;
    const { error, data } = await supabase.functions.invoke("send-contract-otp", {
      body: {
        contract_id: id,
        email: user.email,
        signer_type: "freelancer",
      },
    });
    if (error || data?.error) {
      toast({ title: "Could not send OTP", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    setFreelancerOtpOpen(true);
    setFreelancerOtpSentAt(Date.now());
    toast({ title: "Verification code sent", description: `Sent to ${user.email}` });
  };

  const verifyFreelancerOtp = async () => {
    if (!id || !contract || !user?.email || freelancerOtpCode.length !== 6) return;
    setFreelancerSigning(true);
    const { error, data } = await supabase.functions.invoke("verify-contract-otp", {
      body: {
        contract_id: id,
        code: freelancerOtpCode,
        signer_type: "freelancer",
        signer_name: contract.freelancer_name,
        signer_email: user.email,
        signer_tax_id: contract.freelancer_tax_id,
        signer_ip: null,
        signer_geo: null,
        signer_device: signerDevice,
        signer_isp: null,
        email_verified: true,
      },
    });
    setFreelancerSigning(false);
    if (error || data?.error) {
      toast({ title: "Could not verify code", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    setFreelancerOtpOpen(false);
    setSignModalOpen(false);
    setFreelancerOtpCode("");
    await load();
  };

  const sendContract = async () => {
    if (!contract || !id) return;
    await navigator.clipboard.writeText(`${window.location.origin}/contract/${contract.public_token}`);
    await supabase
      .from("contracts")
      .update({
        status: contract.status === "draft" ? "pending_signatures" : contract.status,
        sent_at: contract.sent_at || new Date().toISOString(),
      } as never)
      .eq("id", id);
    setSignedCopy(true);
    toast({ title: "Link copied. Share it with your client." });
    await load();
  };

  const openPdfView = async () => {
    if (!contract || pdfOpenInFlightRef.current || pdfGenerating) return;
    const element = document.getElementById("contract-content");
    if (!element) {
      toast({ title: "Could not generate PDF", description: "Contract content not found.", variant: "destructive" });
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
      toast({ title: "Could not generate PDF", description: message, variant: "destructive" });
    } finally {
      setPdfGenerating(false);
      pdfOpenInFlightRef.current = false;
    }
  };

  const openClientView = () => {
    if (!contract || clientViewOpenInFlightRef.current) return;
    clientViewOpenInFlightRef.current = true;
    window.open(`/contract/${contract.public_token}?preview=1`, "contract_client_preview", "noopener,noreferrer");
    window.setTimeout(() => {
      clientViewOpenInFlightRef.current = false;
    }, 2000);
  };

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case "signed":
        return "bg-success/10 text-success border-success/20";
      case "pending_signatures":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "cancelled":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const formatStatus = (status: string) =>
    status === "pending_signatures" ? "Pending signatures" : status.charAt(0).toUpperCase() + status.slice(1);

  const hasRequiredConditions = Boolean(
    contract?.timeline_days &&
      contract?.payment_structure &&
      (contract?.payment_methods || []).length > 0 &&
      (contract?.payment_structure !== "installments" || Boolean(String(contract?.installment_description || "").trim())) &&
      (!(contract?.payment_methods || []).includes("other") || Boolean(String(contract?.payment_other || "").trim()))
  );

  const hasRequiredData = Boolean(
    contract?.identifier &&
      contract?.client_name &&
      contract?.client_email &&
      contract?.client_tax_id &&
      contract?.freelancer_name &&
      contract?.freelancer_email &&
      contract?.freelancer_tax_id,
  );
  const hasRequiredServices = items.some((item) => Boolean(String(item.name || "").trim()) && Number(item.quantity || 0) > 0);
  const tabCompletion = {
    data: hasRequiredData,
    services: hasRequiredServices,
    conditions: hasRequiredConditions,
    preview: Boolean(contract?.identifier),
    signatures: Boolean(contract?.freelancer_signed_at || contract?.client_signed_at),
  };
  const missingRequiredSections: string[] = [];
  if (!hasRequiredData) missingRequiredSections.push("Details");
  if (!hasRequiredServices) missingRequiredSections.push("Services");
  if (!hasRequiredConditions) missingRequiredSections.push("Conditions");
  const canSendContract = missingRequiredSections.length === 0;

  if (!contract) {
    return (
      <AppLayout>
        <div className="text-sm text-muted-foreground">Loading contract...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to="/contracts" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Contracts
            </Link>
            <h1 className="mt-2 text-2xl font-bold">{contract.identifier}</h1>
            <Badge variant="outline" className={statusBadgeClass(contract.status)}>
              {formatStatus(contract.status)}
            </Badge>
            <p className="mt-1 text-xs text-muted-foreground">
              {saveStatus === "saving" && "Saving..."}
              {saveStatus === "saved" && "Saved"}
              {saveStatus === "failed" && "Save failed"}
            </p>
            {lastSaveError ? <p className="text-xs text-destructive">{lastSaveError}</p> : null}
            {contract.status === "draft" ? (
              <p className="mt-2 rounded-md border border-amber-400/50 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Fill in all contract details, sign it, and send to your client — they won't have access until you do.
              </p>
            ) : null}
            {isLocked ? (
              <p className="mt-2 rounded-md border border-blue-300/50 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                This contract has been sent and can no longer be edited.
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void save()} disabled={isLocked}>
              Save Changes
            </Button>
            <Button onClick={() => setSendModalOpen(true)} disabled={!canSendContract}>
              {contract.status === "draft" ? "Send Contract" : "Resend Link"}
            </Button>
          </div>
        </div>
        {!canSendContract ? (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Complete all required fields in {missingRequiredSections.join(", ")} before sending this contract.
          </p>
        ) : null}

        <Tabs value={activeTab} onValueChange={(value) => void onTabChange(value)} className="space-y-4">
          <TabsList className="h-auto w-full justify-start rounded-none border-b bg-transparent p-0">
            {[
              { value: "data", label: "Details", done: tabCompletion.data },
              { value: "services", label: "Services", done: tabCompletion.services },
              { value: "conditions", label: "Conditions", done: tabCompletion.conditions },
              { value: "preview", label: "Preview", done: tabCompletion.preview },
              { value: "signatures", label: "Signatures", done: tabCompletion.signatures },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-0 data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                {tab.label}
                {tab.done ? <CheckCircle className="ml-2 h-4 w-4 text-emerald-600" /> : null}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="data">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardContent className="space-y-3 p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Contracting party</h3>
                    <Button size="sm" variant="outline" onClick={() => openPartySheet("client")} disabled={isLocked}>
                      Update {contract.client_name || "client"}
                    </Button>
                  </div>
                  <p className="text-sm"><strong>Entity:</strong> {contract.client_entity_type === "company" ? "Company" : "Individual"}</p>
                  <p className="text-sm"><strong>Name:</strong> {contract.client_name || <span className="text-amber-700">not provided</span>}</p>
                  {contract.client_entity_type === "company" ? (
                    <p className="text-sm"><strong>Company:</strong> {contract.client_company || <span className="text-amber-700">not provided</span>}</p>
                  ) : null}
                  <p className="text-sm"><strong>Email:</strong> {contract.client_email || <span className="text-amber-700">not provided</span>}</p>
                  <p className="text-sm"><strong>Phone:</strong> {contract.client_phone || <span className="text-amber-700">not provided</span>}</p>
                  <p className="text-sm"><strong>Tax ID:</strong> {contract.client_tax_id || <span className="text-amber-700">not provided</span>}</p>
                  <p className="text-sm"><strong>Street:</strong> {contract.client_street || <span className="text-amber-700">not provided</span>}</p>
                  <p className="text-sm"><strong>Street 2:</strong> {contract.client_street2 || "—"}</p>
                  <p className="text-sm"><strong>City:</strong> {contract.client_city || <span className="text-amber-700">not provided</span>}</p>
                  <p className="text-sm"><strong>State:</strong> {contract.client_state || <span className="text-amber-700">not provided</span>}</p>
                  <p className="text-sm"><strong>ZIP:</strong> {contract.client_zip || <span className="text-amber-700">not provided</span>}</p>
                  <p className="text-sm"><strong>Country:</strong> {contract.client_country || <span className="text-amber-700">not provided</span>}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="space-y-3 p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Service provider</h3>
                    <Button size="sm" variant="outline" onClick={() => openPartySheet("freelancer")} disabled={isLocked}>
                      Update my details
                    </Button>
                  </div>
                  <p className="text-sm"><strong>Name:</strong> {contract.freelancer_name || <span className="text-amber-700">not provided</span>}</p>
                  <p className="text-sm"><strong>Company:</strong> {contract.freelancer_company || <span className="text-amber-700">not provided</span>}</p>
                  <p className="text-sm"><strong>Email:</strong> {contract.freelancer_email || <span className="text-amber-700">not provided</span>}</p>
                  <p className="text-sm"><strong>Phone:</strong> {contract.freelancer_phone || <span className="text-amber-700">not provided</span>}</p>
                  <p className="text-sm"><strong>Tax ID:</strong> {contract.freelancer_tax_id || <span className="text-amber-700">not provided</span>}</p>
                  <p className="text-sm"><strong>Street:</strong> {contract.freelancer_street || <span className="text-amber-700">not provided</span>}</p>
                  <p className="text-sm"><strong>Street 2:</strong> {contract.freelancer_street2 || "—"}</p>
                  <p className="text-sm"><strong>City:</strong> {contract.freelancer_city || <span className="text-amber-700">not provided</span>}</p>
                  <p className="text-sm"><strong>State:</strong> {contract.freelancer_state || <span className="text-amber-700">not provided</span>}</p>
                  <p className="text-sm"><strong>ZIP:</strong> {contract.freelancer_zip || <span className="text-amber-700">not provided</span>}</p>
                  <p className="text-sm"><strong>Country:</strong> {contract.freelancer_country || <span className="text-amber-700">not provided</span>}</p>
                </CardContent>
              </Card>
            </div>
            <Card className="mt-4">
              <CardContent className="grid gap-4 p-6 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Contract identifier</Label>
                  <Input
                    value={contract.identifier || ""}
                    onChange={(e) => updateContract({ identifier: e.target.value })}
                    disabled={isLocked}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Linked project</Label>
                  <Select
                    value={contract.project_id || "none"}
                    onValueChange={(value) => updateContract({ project_id: value === "none" ? null : value })}
                    disabled={isLocked}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select linked project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {filteredProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Template</Label>
                  <Input value={templateName} readOnly />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services">
            <Card>
              <CardContent className="space-y-4 p-6">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setCatalogOpen(true)} disabled={isLocked}>
                    Add from Service Catalog
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setItems((prev) => [
                        ...prev,
                        { id: `tmp-${Date.now()}`, name: "", description: "", price: 0, quantity: 1 },
                      ])
                    }
                    disabled={isLocked}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add manually
                  </Button>
                </div>
                {items.map((item, idx) => (
                  <div key={item.id || idx} className="grid gap-2 rounded-lg border p-3 md:grid-cols-12">
                    <Input className="md:col-span-3" value={item.name || ""} onChange={(e) => setItems((prev) => prev.map((row, i) => (i === idx ? { ...row, name: e.target.value } : row)))} placeholder="Service name" disabled={isLocked} />
                    <Input className="md:col-span-3" value={item.description || ""} onChange={(e) => setItems((prev) => prev.map((row, i) => (i === idx ? { ...row, description: e.target.value } : row)))} placeholder="Description" disabled={isLocked} />
                    <Input className="md:col-span-2" type="number" value={item.price || 0} onChange={(e) => setItems((prev) => prev.map((row, i) => (i === idx ? { ...row, price: Number(e.target.value || 0) } : row)))} disabled={isLocked} />
                    <Input className="md:col-span-2" type="number" value={item.quantity || 1} onChange={(e) => setItems((prev) => prev.map((row, i) => (i === idx ? { ...row, quantity: Number(e.target.value || 1) } : row)))} disabled={isLocked} />
                    <div className="md:col-span-2 flex items-center justify-between">
                      <span className="text-sm font-medium">${(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}</span>
                      <Button size="icon" variant="ghost" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))} disabled={isLocked}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label>Discount type</Label>
                    <Select value={contract.discount_type || "fixed"} onValueChange={(value) => updateContract({ discount_type: value })} disabled={isLocked}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed</SelectItem>
                        <SelectItem value="percent">Percent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Discount value</Label>
                    <Input type="number" value={contract.discount || 0} onChange={(e) => updateContract({ discount: Number(e.target.value || 0) })} disabled={isLocked} />
                  </div>
                  <div className="space-y-1 text-sm">
                    <p>Subtotal: ${subtotal.toFixed(2)}</p>
                    <p>Discount: ${discountAmount.toFixed(2)}</p>
                    <p className="font-semibold">Total: ${total.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conditions">
            <Card>
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-3">
                  <Checkbox checked={!!contract.immediate_availability} onCheckedChange={(checked) => updateContract({ immediate_availability: !!checked })} disabled={isLocked} id="availability" />
                  <Label htmlFor="availability">I have immediate availability</Label>
                </div>
                <div className="space-y-1">
                  <Label>Project Duration</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" value={contract.timeline_days || ""} onChange={(e) => updateContract({ timeline_days: e.target.value ? Number(e.target.value) : null })} disabled={isLocked} className="max-w-[140px]" />
                    <span className="text-sm text-muted-foreground">calendar days</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox checked={!!contract.reminder_near_end} onCheckedChange={(checked) => updateContract({ reminder_near_end: !!checked })} disabled={isLocked} id="reminder" />
                  <Label htmlFor="reminder">Receive an email reminder near the contract end date</Label>
                </div>
                <div className="space-y-1">
                  <Label>Payment structure</Label>
                  <RadioGroup value={contract.payment_structure || "upfront"} onValueChange={(value) => updateContract({ payment_structure: value })} className="flex gap-4" disabled={isLocked}>
                    <div className="flex items-center gap-2"><RadioGroupItem id="upfront" value="upfront" /><Label htmlFor="upfront">Upfront</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem id="installments" value="installments" /><Label htmlFor="installments">Installments</Label></div>
                  </RadioGroup>
                </div>
                {contract.payment_structure === "installments" ? (
                  <div className="space-y-1">
                    <Label>Installment Description</Label>
                    <Textarea value={contract.installment_description || ""} onChange={(e) => updateContract({ installment_description: e.target.value })} disabled={isLocked} />
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label>Payment methods</Label>
                  {PAYMENT_METHOD_OPTIONS.map((method) => (
                    <div className="flex items-center gap-2" key={method}>
                      <Checkbox
                        id={`pm-${method}`}
                        checked={(contract.payment_methods || []).includes(method)}
                        onCheckedChange={(checked) =>
                          updateContract({
                            payment_methods: checked
                              ? [...(contract.payment_methods || []), method]
                              : (contract.payment_methods || []).filter((m: string) => m !== method),
                          })
                        }
                        disabled={isLocked}
                      />
                      <Label htmlFor={`pm-${method}`}>{method.split(" ").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ")}</Label>
                    </div>
                  ))}
                  {(contract.payment_methods || []).includes("other") ? (
                    <Input value={contract.payment_other || ""} onChange={(e) => updateContract({ payment_other: e.target.value })} placeholder="Other payment method" disabled={isLocked} />
                  ) : null}
                </div>
                <div className="space-y-1">
                  <Label>Payment link (optional)</Label>
                  <Input value={contract.payment_link || ""} onChange={(e) => updateContract({ payment_link: e.target.value })} placeholder="https://..." disabled={isLocked} />
                  <p className="text-xs text-muted-foreground">Add a payment link to show your client after they sign the contract.</p>
                </div>
                <div className="space-y-1">
                  <Label>Additional clause (optional)</Label>
                  <Textarea value={contract.additional_clause || ""} onChange={(e) => updateContract({ additional_clause: e.target.value })} disabled={isLocked} />
                  <p className="text-xs text-muted-foreground">Any additional terms agreed with your client. This will be added as an extra clause at the end of the contract.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-3">
            {!canSendContract ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Missing required fields in {missingRequiredSections.join(", ")}. Complete them before sending the contract link.
              </div>
            ) : null}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => void openPdfView()} disabled={pdfGenerating}>
                {pdfGenerating ? "Generating PDF..." : "Save as PDF"}
              </Button>
              <Button variant="outline" onClick={openClientView}>
                Open client view
              </Button>
            </div>
            <div id="contract-content" className="rounded-xl border bg-white p-8">
              <h1 className="mb-6 text-center text-2xl font-semibold">FREELANCE SERVICES AGREEMENT</h1>
              <div className="mb-6 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
                Internal preview (freelancer only). Dynamic values are rendered from saved contract data.
              </div>
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
          </TabsContent>

          <TabsContent value="signatures">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardContent className="space-y-2 p-6">
                  <h3 className="font-semibold">Service Provider</h3>
                  {contract.freelancer_signed_at ? (
                    <>
                      <p className="text-sm">{contract.freelancer_signed_name || "Signed"}</p>
                      <p className="text-xs text-emerald-700">{new Date(contract.freelancer_signed_at).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Email: {contract.freelancer_email || "—"} {contract.freelancer_sign_email_verified ? "• Email validated" : ""}</p>
                      <p className="text-xs text-muted-foreground">Tax ID: {contract.freelancer_tax_id || "—"}</p>
                      <p className="text-xs text-muted-foreground">IP: {contract.freelancer_sign_ip || "—"}</p>
                      <p className="text-xs text-muted-foreground">Geolocation: {contract.freelancer_sign_geo || "—"}</p>
                      <p className="text-xs text-muted-foreground">Device: {contract.freelancer_sign_device || "—"}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-amber-600">Pending signature</p>
                      <p className="text-xs text-amber-600">Date and time: Pending signature</p>
                      <Button variant="outline" onClick={() => setSignModalOpen(true)} disabled={isLocked && contract.status !== "pending_signatures"}>
                        Sign contract
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="space-y-2 p-6">
                  <h3 className="font-semibold">Client</h3>
                  {contract.client_signed_at ? (
                    <>
                      <p className="text-sm">{contract.client_signed_name || "Signed"}</p>
                      <p className="text-xs text-emerald-700">{new Date(contract.client_signed_at).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Email: {contract.client_email || "—"} {contract.client_sign_email_verified ? "• Email validated" : ""}</p>
                      <p className="text-xs text-muted-foreground">Tax ID: {contract.client_tax_id || "—"}</p>
                      <p className="text-xs text-muted-foreground">IP: {contract.client_sign_ip || "—"}</p>
                      <p className="text-xs text-muted-foreground">Geolocation: {contract.client_sign_geo || "—"}</p>
                      <p className="text-xs text-muted-foreground">Device: {contract.client_sign_device || "—"}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-amber-600">Pending signature</p>
                      <p className="text-xs text-amber-600">Date and time: Pending signature</p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={catalogOpen} onOpenChange={setCatalogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Select services</DialogTitle></DialogHeader>
          <div className="max-h-96 space-y-2 overflow-auto">
            {services.map((service) => (
              <button
                key={service.id}
                className="w-full rounded-lg border p-3 text-left hover:bg-muted/50"
                onClick={() =>
                  setItems((prev) => [
                    ...prev,
                    {
                      id: `tmp-${Date.now()}-${service.id}`,
                      service_id: service.id,
                      name: service.name,
                      description: service.description,
                      price: Number(service.price || 0),
                      quantity: 1,
                    },
                  ])
                }
                disabled={isLocked}
              >
                <p className="font-medium">{service.name}</p>
                <p className="text-sm text-muted-foreground">{service.description || "No description"}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={signModalOpen} onOpenChange={setSignModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Sign contract</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            By clicking Sign, you confirm that you are {contract.freelancer_name || "the service provider"} and agree to all terms of this contract. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignModalOpen(false)}>Cancel</Button>
            <Button onClick={() => void requestFreelancerOtp()}>Send OTP to sign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={freelancerOtpOpen} onOpenChange={setFreelancerOtpOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Verify OTP to sign</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code sent to your account email ({user?.email || "—"}).
          </p>
          <Input
            value={freelancerOtpCode}
            onChange={(e) => setFreelancerOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            maxLength={6}
            className="max-w-[220px] tracking-[0.4em] text-lg font-semibold"
          />
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => void requestFreelancerOtp()}
              disabled={Boolean(freelancerOtpSentAt && Date.now() - freelancerOtpSentAt < 60_000)}
            >
              Resend code
            </Button>
            <Button onClick={() => void verifyFreelancerOtp()} disabled={freelancerOtpCode.length !== 6 || freelancerSigning}>
              Verify and sign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sendModalOpen} onOpenChange={setSendModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send this contract to your client</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Send the contract link to your client through any channel you prefer.
          </p>
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Once you copy this link, the contract will move to Pending Signatures and your client will have access. You will no longer be able to edit the contract.
          </p>
          <DialogFooter className="gap-2">
            {!contract.freelancer_signed_at ? (
              <Button variant="outline" onClick={() => { setSendModalOpen(false); setActiveTab("signatures"); }}>
                Sign contract first
              </Button>
            ) : null}
            {!canSendContract ? (
              <p className="w-full rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Missing required fields in {missingRequiredSections.join(", ")}.
              </p>
            ) : null}
            <Button onClick={() => void sendContract()} disabled={!canSendContract}>
              {contract.status === "draft" ? (signedCopy ? "Link copied to clipboard" : "Copy link and send") : "Resend link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!partySheet} onOpenChange={(open) => !open && setPartySheet(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{partySheet === "client" ? `Update ${contract.client_name || "client"}` : "Update my details"}</SheetTitle>
            <SheetDescription>Update source record and refresh contract snapshot.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {partySheet === "client" ? (
              <div className="space-y-1">
                <Label>Entity type</Label>
                <RadioGroup value={partyForm.entity_type || "individual"} onValueChange={(value) => setPartyForm((prev) => ({ ...prev, entity_type: value }))} className="flex gap-4">
                  <div className="flex items-center gap-2"><RadioGroupItem id="client-individual" value="individual" /><Label htmlFor="client-individual">Individual</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem id="client-company" value="company" /><Label htmlFor="client-company">Company</Label></div>
                </RadioGroup>
              </div>
            ) : null}
            {(partySheet === "freelancer" || partyForm.entity_type === "company") ? (
              <div className="space-y-1">
                <Label>Company name</Label>
                <Input value={partyForm.company || ""} onChange={(e) => setPartyForm((prev) => ({ ...prev, company: e.target.value }))} />
              </div>
            ) : null}
            {[
              ["name", "Full name"],
              ["email", "Email"],
              ["phone", "Phone"],
              ["tax_id", "Tax ID"],
              ["street", "Street"],
              ["street2", "Street 2"],
              ["city", "City"],
              ["state", "State / Province"],
              ["zip", "ZIP / Postal code"],
              ["country", "Country"],
            ].map(([key, label]) => (
              <div key={key} className="space-y-1">
                <Label>{label}</Label>
                <Input value={partyForm[key] || ""} onChange={(e) => setPartyForm((prev) => ({ ...prev, [key]: e.target.value }))} />
              </div>
            ))}
            <div className="pt-2">
              <Button onClick={() => void savePartySheet()}>Save details</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #contract-print-root, #contract-print-root * {
            visibility: visible;
          }
          #contract-print-root {
            position: absolute;
            inset: 0;
            width: 100%;
            margin: 0;
            padding: 30px;
            box-shadow: none;
            border: 0;
            background: #fff;
            color: #000;
          }
        }
      `}</style>
    </AppLayout>
  );
}
