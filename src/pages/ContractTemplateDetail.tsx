import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CONTRACT_VARIABLES } from "@/lib/contractVariables";
import { ArrowLeft } from "@/components/icons";
import ReactQuill from "react-quill";
import type ReactQuillType from "react-quill";
import "react-quill/dist/quill.snow.css";

type Row = { id: string; name: string; description: string | null; content: string };

export default function ContractTemplateDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState("data");
  const [row, setRow] = useState<Row | null>(null);
  const quillRef = useRef<ReactQuillType>(null);

  const quillModules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, 4, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ align: [] }],
        ["link"],
        ["clean"],
      ],
    }),
    [],
  );

  const quillFormats = useMemo(
    () => ["header", "bold", "italic", "underline", "strike", "list", "bullet", "align", "link"],
    [],
  );

  const load = async () => {
    if (!id) return;
    const { data } = await supabase.from("contract_templates").select("id,name,description,content").eq("id", id).single();
    setRow(data as Row);
  };

  useEffect(() => { void load(); }, [id]);

  const save = async () => {
    if (!id || !row) return;
    await supabase.from("contract_templates").update({ name: row.name, description: row.description, content: row.content } as never).eq("id", id);
    toast({ title: "Template saved" });
  };

  const duplicate = async () => {
    if (!row) return;
    const { data } = await supabase.from("contract_templates").insert({ name: `Copy of ${row.name}`, description: row.description, content: row.content } as never).select("id").single();
    if (data?.id) navigate(`/contracts/templates/${data.id}`);
  };

  const remove = async () => {
    if (!id) return;
    await supabase.from("contract_templates").delete().eq("id", id);
    navigate("/contracts?tab=templates");
  };

  const preview = useMemo(() => {
    if (!row) return "";
    return row.content.replace(
      /\{\{([a-zA-Z0-9_]+)\}\}/g,
      (_m, token: string) =>
        `<span class="inline-flex rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-semibold">{{${token}}}</span>`,
    );
  }, [row]);

  const insertVariableAtCursor = (tag: string) => {
    if (!row) return;
    const editor = quillRef.current?.getEditor();
    if (!editor) {
      setRow((prev) => (prev ? { ...prev, content: `${prev.content || ""}${tag}` } : prev));
      return;
    }
    const range = editor.getSelection(true);
    const index = range?.index ?? editor.getLength();
    editor.insertText(index, tag, "user");
    editor.setSelection(index + tag.length, 0, "user");
    setRow((prev) => (prev ? { ...prev, content: editor.root.innerHTML } : prev));
  };

  if (!row) return <AppLayout><div className="text-sm text-muted-foreground">Loading template...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to="/contracts?tab=templates" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Contract Templates
            </Link>
          <h1 className="text-2xl font-bold">{row.name}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="destructive" onClick={() => void remove()}>Delete template</Button>
            <Button variant="outline" onClick={() => void duplicate()}>Duplicate template</Button>
            <Button onClick={() => void save()}>Save template</Button>
          </div>
        </div>
        <Tabs value={tab} onValueChange={setTab} className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
          <TabsList className="h-auto w-full justify-start rounded-none border-b bg-transparent p-0">
            <TabsTrigger value="data" className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-0 data-[state=active]:border-primary data-[state=active]:bg-transparent">Data</TabsTrigger>
            <TabsTrigger value="content" className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-0 data-[state=active]:border-primary data-[state=active]:bg-transparent">Content</TabsTrigger>
            <TabsTrigger value="preview" className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-0 data-[state=active]:border-primary data-[state=active]:bg-transparent">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="data" className="space-y-3">
            <div className="space-y-1">
              <Label>Template Name</Label>
              <Input
                className="bg-muted/40"
                value={row.name}
                onChange={(e) => setRow((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
              />
              <p className="text-xs text-muted-foreground">Required. This name is shown in your contract templates list.</p>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                className="bg-muted/40"
                value={row.description || ""}
                onChange={(e) => setRow((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
              />
              <p className="text-xs text-muted-foreground">Optional summary shown in template listings.</p>
            </div>
          </TabsContent>
          <TabsContent value="content">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[68%_32%]">
              <div className="space-y-3">
                <div className="rounded-lg border">
                  <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={row.content}
                    onChange={(value) => setRow((prev) => (prev ? { ...prev, content: value } : prev))}
                    modules={quillModules}
                    formats={quillFormats}
                    style={{ minHeight: "600px" }}
                    className="[&_.ql-container]:min-h-[540px] [&_.ql-editor]:min-h-[520px]"
                  />
                </div>
                <div className="rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                  <p className="font-medium">Recommended legal clause</p>
                  <p>Include a clause confirming both parties accept electronic signature validity before publishing this template.</p>
                </div>
              </div>
              <div className="space-y-4 rounded-lg border p-3">
                <h3 className="text-sm font-semibold">Available Variables</h3>
                {Array.from(new Set(CONTRACT_VARIABLES.map((v) => v.group))).map((group) => (
                  <div key={group} className="space-y-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">{group}</p>
                    <div className="flex flex-wrap gap-2">
                      {CONTRACT_VARIABLES.filter((item) => item.group === group).map((item) => (
                        <button
                          key={item.tag}
                          type="button"
                          className="rounded-full bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90"
                          onClick={() => insertVariableAtCursor(item.tag)}
                          title={item.description}
                        >
                          {item.tag}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="preview" className="space-y-3">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.print()}>Save as PDF</Button>
            </div>
            <div id="contract-template-print-root" className="rounded-xl border bg-white p-8">
              <div
                className="text-[15px] leading-relaxed [&_h1]:mb-3 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold [&_h4]:mb-2 [&_h4]:text-lg [&_h4]:font-semibold [&_p]:mb-2 [&_ul]:mb-2 [&_ol]:mb-2 [&_li]:ml-5 [&_li]:list-disc"
                dangerouslySetInnerHTML={{ __html: preview }}
              />
              <section className="mt-10 border-t pt-6">
                <div className="mb-5 text-right text-sm text-zinc-600">
                  City, {new Date().toLocaleDateString()}
                </div>
                <div className="mb-6 grid gap-8 md:grid-cols-2">
                  <div className="text-center">
                    <div className="border-b border-zinc-500 pb-1">
                      <p className="text-xl font-semibold text-zinc-800">Client Name</p>
                    </div>
                    <p className="mt-2 text-lg font-semibold tracking-wide text-zinc-900">CONTRACTING PARTY</p>
                  </div>
                  <div className="text-center">
                    <div className="border-b border-zinc-500 pb-1">
                      <p className="text-xl font-semibold text-zinc-800">Freelancer Name</p>
                    </div>
                    <p className="mt-2 text-lg font-semibold tracking-wide text-zinc-900">SERVICE PROVIDER</p>
                  </div>
                </div>
              </section>
              <footer className="mt-10 border-t pt-4 text-center text-xs text-zinc-500">
                Contract generated and signed digitally via Lance.
              </footer>
              <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                Preview mode: variables remain visible as blue tags for template editing.
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <style>{`@media print { body *{visibility:hidden;} #contract-template-print-root,#contract-template-print-root *{visibility:visible;} #contract-template-print-root{position:absolute;inset:0;background:#fff;} }`}</style>
    </AppLayout>
  );
}
