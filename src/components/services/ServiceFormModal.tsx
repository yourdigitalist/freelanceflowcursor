import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { currencies } from "@/lib/locale-data";
import type { Service } from "@/types/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "@/components/icons";

const serviceSchema = z.object({
  name: z.string().trim().min(1, "Service name is required"),
  description: z.string().optional(),
  price: z.preprocess(
    (value) => {
      if (value === "" || value == null) return undefined;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? value : parsed;
    },
    z.number().positive("Price must be greater than 0").optional()
  ),
  is_recurring: z.boolean(),
  recurrence_period: z.enum(["monthly", "annually"]).default("monthly"),
  default_tasks: z.array(z.string().trim()).default([]),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  service?: Service | null;
};

export function ServiceFormModal({ open, onClose, onSaved, service }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const isEdit = !!service;
  const errorMessage = (error: unknown) =>
    error instanceof Error ? error.message : "Something went wrong";

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: service?.name || "",
      description: service?.description || "",
      price: service?.price ?? undefined,
      is_recurring: service?.is_recurring || false,
      recurrence_period: service?.recurrence_period || "monthly",
      default_tasks: service?.default_tasks || [],
    },
  });

  useEffect(() => {
    form.reset({
      name: service?.name || "",
      description: service?.description || "",
      price: service?.price ?? undefined,
      is_recurring: service?.is_recurring || false,
      recurrence_period: service?.recurrence_period || "monthly",
      default_tasks: service?.default_tasks || [],
    });
  }, [service, form]);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("currency")
        .eq("user_id", user.id)
        .maybeSingle();
      const code = (data?.currency || "USD").toUpperCase();
      setCurrencyCode(code);
      const entry = currencies.find((item) => item.value === code);
      setCurrencySymbol(entry?.symbol ?? "$");
    })();
  }, [open, user]);

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!user) return;
    const payload = {
      user_id: user.id,
      name: values.name,
      description: values.description?.trim() || null,
      price: values.price ?? null,
      currency: currencyCode,
      is_recurring: values.is_recurring,
      recurrence_period: values.is_recurring ? values.recurrence_period : "monthly",
      default_tasks: values.default_tasks.map((task) => task.trim()).filter(Boolean),
    };

    try {
      if (isEdit && service) {
        const { error } = await supabase
          .from("services")
          .update(payload)
          .eq("id", service.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("services").insert(payload);
        if (error) throw error;
      }

      toast({ title: isEdit ? "Service updated" : "Service created" });
      onSaved();
      onClose();
    } catch (error: unknown) {
      toast({
        title: "Error saving service",
        description: errorMessage(error),
        variant: "destructive",
      });
    }
  });

  const taskValues = form.watch("default_tasks");
  const isRecurring = form.watch("is_recurring");
  const recurrencePeriod = form.watch("recurrence_period");
  const addTask = () => {
    form.setValue("default_tasks", [...taskValues, ""], { shouldDirty: true });
  };
  const updateTask = (index: number, value: string) => {
    const next = [...taskValues];
    next[index] = value;
    form.setValue("default_tasks", next, { shouldDirty: true });
  };
  const removeTask = (index: number) => {
    const next = taskValues.filter((_, itemIndex) => itemIndex !== index);
    form.setValue("default_tasks", next, { shouldDirty: true });
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Service" : "Add Service"}</DialogTitle>
          <DialogDescription>
            Create reusable services for proposals and contracts.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="service-name">Service Name</Label>
            <Input
              id="service-name"
              className="h-11 text-base leading-6"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="flex items-center gap-3 rounded-md border p-3">
            <Checkbox
              id="service-recurring"
              checked={isRecurring}
              onCheckedChange={(checked) => form.setValue("is_recurring", !!checked)}
            />
            <Label htmlFor="service-recurring" className="leading-none">
              This is a recurring service (monthly or annual)
            </Label>
          </div>

          {isRecurring && (
            <div className="space-y-2">
              <Label>Recurrence Period</Label>
              <RadioGroup
                value={recurrencePeriod}
                onValueChange={(value: "monthly" | "annually") =>
                  form.setValue("recurrence_period", value, { shouldDirty: true })
                }
                className="flex items-center gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="monthly" id="service-recurrence-monthly" />
                  <Label htmlFor="service-recurrence-monthly">Monthly</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="annually" id="service-recurrence-annually" />
                  <Label htmlFor="service-recurrence-annually">Annually</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="service-price">
              Price {isRecurring ? (recurrencePeriod === "annually" ? "(per year)" : "(per month)") : ""}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {currencySymbol}
              </span>
              <Input
                id="service-price"
                type="number"
                step="0.01"
                className="pl-8"
                {...form.register("price")}
              />
            </div>
            {form.formState.errors.price && (
              <p className="text-sm text-destructive">{form.formState.errors.price.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="service-description">Description</Label>
            <Textarea
              id="service-description"
              rows={4}
              {...form.register("description")}
              placeholder="Describe your methodology, deliverables, and tools."
            />
            <p className="text-xs text-muted-foreground">
              This will appear in proposals and contracts. Describe your methodology, deliverables,
              and tools.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label>Default Task List (optional)</Label>
                <p className="text-xs text-muted-foreground">
                  Tasks automatically created when you start a project with this service.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTask}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add task
              </Button>
            </div>

            <div className="space-y-2">
              {taskValues.length === 0 && (
                <p className="text-sm text-muted-foreground">No default tasks yet.</p>
              )}
              {taskValues.map((task, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input value={task} onChange={(e) => updateTask(index, e.target.value)} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTask(index)}
                    aria-label="Remove task"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{isEdit ? "Save changes" : "Create service"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
