import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ServiceFormModal } from "@/components/services/ServiceFormModal";
import { useProfileCurrency } from "@/hooks/useProfileCurrency";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "@/components/icons";
import { SlotIcon } from "@/contexts/IconSlotContext";
import type { Service } from "@/types/services";

function mapTasks(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export default function Services() {
  const { formatCurrency } = useProfileCurrency();
  const { toast } = useToast();
  const errorMessage = (error: unknown) =>
    error instanceof Error ? error.message : "Something went wrong";
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const mapped: Service[] = (data || []).map((service) => ({
        ...service,
        price: service.price == null ? null : Number(service.price),
        recurrence_period: service.recurrence_period === "annually" ? "annually" : "monthly",
        default_tasks: mapTasks(service.default_tasks),
      }));
      setServices(mapped);
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const stats = useMemo(
    () => ({
      total: services.length,
      recurring: services.filter((service) => service.is_recurring).length,
    }),
    [services]
  );

  const handleDelete = async () => {
    if (!deletingService) return;
    try {
      const { error } = await supabase.from("services").delete().eq("id", deletingService.id);
      if (error) throw error;
      toast({ title: "Service deleted" });
      setDeletingService(null);
      fetchServices();
    } catch (error: unknown) {
      toast({
        title: "Error deleting service",
        description: errorMessage(error),
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Services</h1>
            <p className="text-muted-foreground">
              Build your service catalog to quickly add them to proposals and contracts.
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingService(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Service
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Total services</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Recurring services</p>
              <p className="text-2xl font-bold">{stats.recurring}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Loading services...</div>
            ) : services.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <h3 className="mb-1 text-lg font-semibold">No services yet</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Add the services you offer and reuse them across proposals and contracts in
                  seconds.
                </p>
                <Button
                  onClick={() => {
                    setEditingService(null);
                    setFormOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add my first service
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Default tasks</TableHead>
                    <TableHead className="w-[96px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow
                      key={service.id}
                      className="cursor-pointer"
                      onClick={() => {
                        setEditingService(service);
                        setFormOpen(true);
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{service.name}</span>
                          {service.is_recurring && (
                            <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/40 dark:text-purple-200">
                              {service.recurrence_period === "annually" ? "Recurring · Yearly" : "Recurring · Monthly"}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[320px] truncate text-muted-foreground">
                        {service.description || "—"}
                      </TableCell>
                      <TableCell>
                        {service.price == null ? "—" : formatCurrency(service.price)}
                      </TableCell>
                      <TableCell>
                        {service.default_tasks.length > 0 ? `${service.default_tasks.length} tasks` : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(event) => {
                              event.stopPropagation();
                              setEditingService(service);
                              setFormOpen(true);
                            }}
                            aria-label="Edit service"
                          >
                            <SlotIcon slot="action_edit" className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeletingService(service);
                            }}
                            aria-label="Delete service"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <ServiceFormModal
        open={formOpen}
        service={editingService}
        onClose={() => {
          setFormOpen(false);
          setEditingService(null);
        }}
        onSaved={fetchServices}
      />

      <AlertDialog open={!!deletingService} onOpenChange={(open) => !open && setDeletingService(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete service?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingService
                ? `Are you sure you want to delete ${deletingService.name}? This cannot be undone.`
                : "This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
