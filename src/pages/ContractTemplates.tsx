import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyValue } from "@/components/ui/empty-value";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DataTableFrame, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Star, Trash2, Copy } from "@/components/icons";
import { DEFAULT_CONTRACT_TEMPLATE_CONTENT } from "@/lib/contractTemplate";
import { usePagination } from "@/hooks/usePagination";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { compareBooleans, compareStrings } from "@/lib/tableSort";
import { TablePagination } from "@/components/ui/table-pagination";

type ContractTemplateRow = {
  id: string;
  name: string;
  description: string | null;
  content: string;
  is_default: boolean | null;
};

export default function ContractTemplates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<ContractTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const templateSortComparators = useMemo(
    () => ({
      name: (a: ContractTemplateRow, b: ContractTemplateRow) =>
        compareStrings(a.name, b.name),
      description: (a: ContractTemplateRow, b: ContractTemplateRow) =>
        compareStrings(a.description ?? "", b.description ?? ""),
      default: (a: ContractTemplateRow, b: ContractTemplateRow) =>
        compareBooleans(!!a.is_default, !!b.is_default),
    }),
    [],
  );

  const templateSort = useTableSort(templates, templateSortComparators);
  const templatesPagination = usePagination(templateSort.sortedItems);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("contract_templates").select("*").order("created_at", { ascending: false });
    const rows = (data || []) as ContractTemplateRow[];
    if (rows.length === 0) {
      const { data: inserted } = await supabase
        .from("contract_templates")
        .insert({
          user_id: user.id,
          name: "Service Agreement",
          description: "Default service contract template.",
          content: DEFAULT_CONTRACT_TEMPLATE_CONTENT,
          is_default: true,
        } as never)
        .select("*")
        .single();
      if (inserted) {
        toast({ title: "Default template created", description: "We added a Service Agreement template for you." });
        setTemplates([inserted as ContractTemplateRow]);
      }
    } else {
      setTemplates(rows);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [user]);

  const createTemplate = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("contract_templates")
      .insert({
        user_id: user.id,
        name: "New Contract Template",
        description: "",
        content: "",
      } as never)
      .select("id")
      .single();
    if (data?.id) navigate(`/contract-templates/${data.id}`);
  };

  const setDefault = async (id: string) => {
    if (!user) return;
    await supabase.from("contract_templates").update({ is_default: false } as never).eq("user_id", user.id);
    await supabase.from("contract_templates").update({ is_default: true } as never).eq("id", id).eq("user_id", user.id);
    await load();
  };

  const duplicateTemplate = async (row: ContractTemplateRow) => {
    if (!user) return;
    await supabase.from("contract_templates").insert({
      user_id: user.id,
      name: `Copy of ${row.name}`,
      description: row.description,
      content: row.content,
      is_default: false,
    } as never);
    await load();
  };

  const removeTemplate = async () => {
    if (!deleteId) return;
    await supabase.from("contract_templates").delete().eq("id", deleteId);
    setDeleteId(null);
    await load();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Contract Templates</h1>
            <p className="text-muted-foreground">Create reusable contract templates for faster drafting.</p>
          </div>
          <Button onClick={createTemplate}><Plus className="mr-2 h-4 w-4" />Create Template</Button>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col p-0">
            {loading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Loading templates...</div>
            ) : templates.length === 0 ? (
              <div className="py-14 text-center">
                <h3 className="text-lg font-semibold">No contract templates yet</h3>
                <p className="text-sm text-muted-foreground">Create your first reusable template to speed up contract creation.</p>
              </div>
            ) : (
              <DataTableFrame>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <SortableTableHead label="Name" sortKey="name" sort={templateSort} />
                    <SortableTableHead label="Description" sortKey="description" sort={templateSort} />
                    <SortableTableHead label="Default" sortKey="default" sort={templateSort} />
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templatesPagination.paginatedItems.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-semibold">{row.name}</TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {row.description ? row.description : <EmptyValue variant="table" field="description" />}
                      </TableCell>
                      <TableCell>
                        {row.is_default ? (
                          <Badge variant="secondary">
                            <Star className="mr-1 h-3 w-3" />
                            Default
                          </Badge>
                        ) : (
                          <EmptyValue variant="table" />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" asChild><Link to={`/contract-templates/${row.id}`}>Edit</Link></Button>
                          {!row.is_default ? <Button variant="ghost" size="sm" onClick={() => void setDefault(row.id)}><Star className="mr-1 h-4 w-4" />Set default</Button> : null}
                          <Button variant="ghost" size="sm" onClick={() => void duplicateTemplate(row)}><Copy className="mr-1 h-4 w-4" />Duplicate</Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteId(row.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                total={templatesPagination.total}
                page={templatesPagination.page}
                pageSize={templatesPagination.pageSize}
                from={templatesPagination.from}
                to={templatesPagination.to}
                pageSizeOptions={templatesPagination.pageSizeOptions}
                showPageSizeSelect={templatesPagination.showPageSizeSelect}
                onPageChange={templatesPagination.setPage}
                onPageSizeChange={templatesPagination.setPageSize}
              />
              </DataTableFrame>
            )}
          </CardContent>
        </Card>
      </div>
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete template?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void removeTemplate()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
