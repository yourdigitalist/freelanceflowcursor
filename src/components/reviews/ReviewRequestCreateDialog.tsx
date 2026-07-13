import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Plus, X } from "@/components/icons";
import { SlotIcon } from "@/contexts/IconSlotContext";
import { ProjectFormDialog } from "@/components/projects/ProjectFormDialog";
import { getSiteUrl } from "@/lib/site-url";
import { uploadReviewFile } from "@/lib/reviewFileUpload";
import { sendReviewRequestEmail } from "@/lib/sendReviewRequest";
import { applyClientEmailToRecipients } from "@/lib/reviewRecipients";
import {
  formatFileSize,
  REVIEW_FILE_MAX_SIZE_BYTES,
  REVIEW_FILE_MAX_SIZE_MB,
} from "@/lib/reviewFileLimits";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const PDF_TYPES = ["application/pdf"];
const WORD_TYPES = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
const MAX_FILE_SIZE = REVIEW_FILE_MAX_SIZE_BYTES;
const MAX_FILE_SIZE_MB = REVIEW_FILE_MAX_SIZE_MB;

function FileThumbnail({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  if (!url) return <div className="h-8 w-8 rounded overflow-hidden bg-muted animate-pulse" />;
  return <img src={url} alt="" className="h-8 w-8 rounded object-cover bg-background" />;
}

type Project = { id: string; name: string; client_id: string | null };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lockedClientId?: string;
  lockedClientName?: string;
  lockedClientEmail?: string | null;
  projects?: Project[];
  onSuccess?: () => void | Promise<void>;
};

export function ReviewRequestCreateDialog({
  open,
  onOpenChange,
  lockedClientId,
  lockedClientName,
  lockedClientEmail,
  projects: projectsProp = [],
  onSuccess,
}: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string; email: string | null }[]>([]);
  const [projects, setProjects] = useState<Project[]>(projectsProp);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("1");
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [folderId, setFolderId] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [files, setFiles] = useState<File[]>([]);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState("");
  const [showCreateFolderInline, setShowCreateFolderInline] = useState(false);
  const [inlineFolderName, setInlineFolderName] = useState("");
  const [creatingFolderInline, setCreatingFolderInline] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false);
  const [wordWarningOpen, setWordWarningOpen] = useState(false);
  const pendingWordFilesRef = useRef<File[]>([]);
  const autoClientEmailRef = useRef<string | null>(null);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setVersion("1");
    setClientId(lockedClientId || "");
    setProjectId("");
    setFolderId("");
    setDueDate(undefined);
    setFiles([]);
    setRecipients([]);
    setRecipientInput("");
    setShowCreateFolderInline(false);
    setInlineFolderName("");
    setCreateProjectDialogOpen(false);
    autoClientEmailRef.current = null;
  };

  useEffect(() => {
    setProjects(projectsProp);
  }, [projectsProp]);

  useEffect(() => {
    if (!open || !user) return;
    resetForm();
    void supabase.from("review_folders").select("id, name").order("name").then(({ data }) => setFolders(data || []));
    if (!lockedClientId) {
      void supabase
        .from("clients")
        .select("id, name, email")
        .is("archived_at", null)
        .order("name")
        .then(({ data }) => setClients(data || []));
      void supabase.from("projects").select("id, name, client_id").order("name").then(({ data }) => setProjects(data || []));
    } else {
      setClientId(lockedClientId);
    }
  }, [open, user, lockedClientId]);

  useEffect(() => {
    if (!open) return;

    const selectedClientId = lockedClientId || clientId;
    const clientEmail = !selectedClientId
      ? null
      : lockedClientId
        ? (lockedClientEmail?.trim() || clients.find((c) => c.id === lockedClientId)?.email?.trim() || null)
        : (clients.find((c) => c.id === clientId)?.email?.trim() || null);

    setRecipients((prev) => {
      const synced = applyClientEmailToRecipients(prev, autoClientEmailRef.current, clientEmail);
      autoClientEmailRef.current = synced.autoEmail;
      return synced.recipients;
    });
  }, [open, clientId, clients, lockedClientId, lockedClientEmail]);

  const filteredProjects = projects.filter((p) => !clientId || p.client_id === clientId);

  const fileMatchesTypes = (file: File, allowedTypes: string[]) => {
    if (allowedTypes.includes(file.type)) return true;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext) return false;
    const inferred = EXT_TO_MIME[ext];
    return !!inferred && allowedTypes.includes(inferred);
  };

  const validateAndAddFiles = (incoming: File[], allowedTypes: string[], typeLabel: string) => {
    const validFiles: File[] = [];
    const errors: string[] = [];
    for (const file of incoming) {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: too large (max ${MAX_FILE_SIZE_MB}MB)`);
        continue;
      }
      if (!fileMatchesTypes(file, allowedTypes)) {
        errors.push(`${file.name}: not a valid ${typeLabel} type`);
        continue;
      }
      validFiles.push(file);
    }
    if (errors.length > 0) {
      toast({ title: "Some files were rejected", description: errors.join("\n"), variant: "destructive" });
    }
    if (validFiles.length > 0) setFiles((prev) => [...prev, ...validFiles]);
  };

  const handleWordFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files || []);
    const valid: File[] = [];
    const errors: string[] = [];
    for (const file of incoming) {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: too large (max ${MAX_FILE_SIZE_MB}MB)`);
        continue;
      }
      if (!fileMatchesTypes(file, WORD_TYPES)) {
        errors.push(`${file.name}: not a valid Word document`);
        continue;
      }
      valid.push(file);
    }
    if (errors.length > 0) {
      toast({ title: "Some files were rejected", description: errors.join("\n"), variant: "destructive" });
    }
    if (valid.length > 0) {
      pendingWordFilesRef.current = valid;
      setWordWarningOpen(true);
    }
    e.target.value = "";
  };

  const confirmWordFiles = () => {
    const pending = pendingWordFilesRef.current;
    if (pending.length > 0) setFiles((prev) => [...prev, ...pending]);
    pendingWordFilesRef.current = [];
    setWordWarningOpen(false);
  };

  const createFolderInline = async () => {
    if (!user || !inlineFolderName.trim()) return;
    setCreatingFolderInline(true);
    try {
      const { data, error } = await supabase
        .from("review_folders")
        .insert({ user_id: user.id, name: inlineFolderName.trim() })
        .select("id, name")
        .single();
      if (error) throw error;
      if (!data) throw new Error("Folder was not created");
      setFolders((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setFolderId(data.id);
      setShowCreateFolderInline(false);
      setInlineFolderName("");
      toast({ title: "Folder created" });
    } catch (err: unknown) {
      toast({
        title: "Could not create folder",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setCreatingFolderInline(false);
    }
  };

  const handleAddRecipient = () => {
    const email = recipientInput.trim();
    if (!email) return;
    if (!recipients.includes(email)) setRecipients([...recipients, email]);
    setRecipientInput("");
  };

  const handleSave = async () => {
    if (!user || !title.trim() || !clientId) return;
    if (files.length === 0) {
      toast({ title: "Please upload at least one file", variant: "destructive" });
      return;
    }
    if (recipients.length === 0) {
      toast({ title: "Add at least one recipient", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const { data, error } = await supabase
        .from("review_requests")
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          version,
          client_id: clientId,
          project_id: projectId || null,
          folder_id: folderId || null,
          due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
        })
        .select()
        .single();
      if (error) throw error;
      const requestId = data.id;
      try {
        for (const file of files) {
          try {
            await uploadReviewFile(file, requestId);
          } catch (uploadError) {
            const message = uploadError instanceof Error ? uploadError.message : 'Upload failed';
            throw new Error(`${file.name}: ${message}`);
          }
        }
      } catch (uploadError) {
        await supabase.from("review_requests").delete().eq("id", requestId);
        throw uploadError;
      }
      await supabase.from("review_recipients").insert(recipients.map((email) => ({ review_request_id: requestId, email })));
      try {
        await sendReviewRequestEmail(requestId, getSiteUrl() || window.location.origin);
        toast({ title: "Approval sent", description: "Recipients have been emailed the review link." });
      } catch (err: unknown) {
        toast({
          title: "Email failed to send",
          description:
            err instanceof Error
              ? err.message
              : "The request was created, but email could not be sent. Share the link from the approval page.",
          variant: "destructive",
        });
      }
      onOpenChange(false);
      resetForm();
      await onSuccess?.();
    } catch (error: unknown) {
      toast({
        title: "Error saving request",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const imageFiles = files.filter((f) => f.type.startsWith("image/"));
  const pdfFiles = files.filter((f) => f.type === "application/pdf");
  const wordFiles = files.filter((f) => WORD_TYPES.includes(f.type));
  const uploadId = lockedClientId ? "client-detail" : "reviews";

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) resetForm();
          onOpenChange(next);
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send for approval</DialogTitle>
            <p className="text-sm text-muted-foreground">Create an approval request and send to clients</p>
          </DialogHeader>
          <div className="space-y-4">
            {lockedClientId ? (
              <div className="space-y-2">
                <Label>Client</Label>
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{lockedClientName || "Selected client"}</div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Client *</Label>
                <Select
                  value={clientId}
                  onValueChange={(v) => {
                    setClientId(v);
                    setProjectId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Design Mockups v1" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Project (optional)</Label>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-sm"
                  disabled={!clientId}
                  onClick={() => setCreateProjectDialogOpen(true)}
                >
                  Create new project
                </Button>
              </div>
              <Select value={projectId || "none"} onValueChange={(v) => setProjectId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Version</Label>
                <Input value={version} onChange={(e) => setVersion(e.target.value)} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Folder</Label>
                  <Button type="button" variant="link" className="h-auto p-0 text-sm" onClick={() => setShowCreateFolderInline((p) => !p)}>
                    {showCreateFolderInline ? "Cancel" : "Create new folder"}
                  </Button>
                </div>
                <Select value={folderId || "none"} onValueChange={(v) => setFolderId(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="No folder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No folder</SelectItem>
                    {folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        {folder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {showCreateFolderInline ? (
                  <div className="rounded-lg border p-3 space-y-3">
                    <Input value={inlineFolderName} onChange={(e) => setInlineFolderName(e.target.value)} placeholder="Folder name *" />
                    <div className="flex justify-end">
                      <Button type="button" size="sm" disabled={creatingFolderInline || !inlineFolderName.trim()} onClick={() => void createFolderInline()}>
                        {creatingFolderInline ? "Adding…" : "Add folder"}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <SlotIcon slot="approval_calendar" className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-3">
              <Label>Files *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <input type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp" onChange={(e) => { validateAndAddFiles(Array.from(e.target.files || []), IMAGE_TYPES, "image"); e.target.value = ""; }} className="hidden" id={`upload-images-${uploadId}`} />
                  <label htmlFor={`upload-images-${uploadId}`} className="cursor-pointer block text-sm font-medium">Images</label>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG, GIF, WebP (max {MAX_FILE_SIZE_MB}MB each)</p>
                </div>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <input type="file" multiple accept=".pdf,application/pdf" onChange={(e) => { validateAndAddFiles(Array.from(e.target.files || []), PDF_TYPES, "PDF"); e.target.value = ""; }} className="hidden" id={`upload-pdf-${uploadId}`} />
                  <label htmlFor={`upload-pdf-${uploadId}`} className="cursor-pointer block text-sm font-medium">PDF</label>
                  <p className="text-xs text-muted-foreground mt-1">Max {MAX_FILE_SIZE_MB}MB each</p>
                </div>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <input type="file" multiple accept=".doc,.docx" onChange={handleWordFileChange} className="hidden" id={`upload-word-${uploadId}`} />
                  <label htmlFor={`upload-word-${uploadId}`} className="cursor-pointer block text-sm font-medium">Word</label>
                  <p className="text-xs text-muted-foreground mt-1">Max {MAX_FILE_SIZE_MB}MB each</p>
                </div>
              </div>
              {files.length > 0 && (
                <div className="space-y-2 text-sm">
                  {imageFiles.length > 0 && <p>Images ({imageFiles.length})</p>}
                  {pdfFiles.length > 0 && <p>PDF ({pdfFiles.length})</p>}
                  {wordFiles.length > 0 && <p>Word ({wordFiles.length})</p>}
                  {files.map((file, i) => (
                    <div key={`${file.name}-${i}`} className="flex items-center justify-between rounded-lg border p-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {file.type.startsWith("image/") ? <FileThumbnail file={file} /> : null}
                        <span className="truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{formatFileSize(file.size)}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Recipients *</Label>
              <div className="flex gap-2">
                <Input
                  value={recipientInput}
                  onChange={(e) => setRecipientInput(e.target.value)}
                  placeholder="Email address"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddRecipient())}
                />
                <Button variant="outline" onClick={handleAddRecipient}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {recipients.map((email, i) => (
                <div key={email} className="flex items-center justify-between rounded-md border p-2">
                  <span className="text-sm">{email}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setRecipients((prev) => prev.filter((_, j) => j !== i))}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSave()}
              loading={uploading}
              loadingText="Sending…"
              disabled={!title.trim() || !clientId || files.length === 0 || recipients.length === 0}
            >
              Send for approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={wordWarningOpen} onOpenChange={setWordWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Word files are download only</AlertDialogTitle>
            <AlertDialogDescription>
              Word documents cannot be viewed or commented on in the browser. Clients will only be able to download them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={confirmWordFiles}>I understand, add anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProjectFormDialog
        open={createProjectDialogOpen}
        onOpenChange={setCreateProjectDialogOpen}
        clients={lockedClientId ? [{ id: lockedClientId, name: lockedClientName || "" }] : clients}
        initialClientId={clientId || lockedClientId || null}
        onSaved={(project) => {
          setProjects((prev) => [...prev.filter((p) => p.id !== project.id), { id: project.id, name: project.name, client_id: project.client_id }]);
          setProjectId(project.id);
        }}
      />
    </>
  );
}
