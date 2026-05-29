import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { notifyStartGuideRefresh } from '@/components/layout/startGuideUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ClientFormDialog, type ClientFormDialogClient } from '@/components/clients/ClientFormDialog';

export interface ProjectFormDialogClient {
  id: string;
  name: string;
  email?: string | null;
  company?: string | null;
}

export interface ProjectFormDialogProject {
  id: string;
  name: string;
  description: string | null;
  status: string;
  budget: number | null;
  hourly_rate: number | null;
  start_date: string | null;
  due_date: string | null;
  client_id: string | null;
}

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProject?: ProjectFormDialogProject | null;
  clients: ProjectFormDialogClient[];
  initialClientId?: string | null;
  onSaved?: (project: ProjectFormDialogProject) => void;
  onClientSaved?: (client: ProjectFormDialogClient) => void;
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  editingProject = null,
  clients,
  initialClientId = null,
  onSaved,
  onClientSaved,
}: ProjectFormDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialogClientId, setDialogClientId] = useState<string>('none');
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availableClients, setAvailableClients] = useState<ProjectFormDialogClient[]>(clients);

  useEffect(() => {
    setAvailableClients(clients);
  }, [clients]);

  useEffect(() => {
    if (!open) return;
    setDialogClientId(editingProject?.client_id || initialClientId || 'none');
  }, [open, editingProject, initialClientId]);

  const resetAndClose = () => {
    onOpenChange(false);
    setDialogClientId('none');
    setCreateClientOpen(false);
  };

  const handleClientSaved = (client: ClientFormDialogClient) => {
    const projectClient = {
      id: client.id,
      name: client.name,
      email: client.email ?? null,
      company: client.company ?? null,
    };
    setAvailableClients((prev) =>
      [...prev.filter((item) => item.id !== client.id), projectClient].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    );
    setDialogClientId(client.id);
    onClientSaved?.(projectClient);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const projectData = {
      name: formData.get('name') as string,
      description: (formData.get('description') as string) || null,
      status: formData.get('status') as string,
      budget: formData.get('budget') ? parseFloat(formData.get('budget') as string) : null,
      hourly_rate: formData.get('hourly_rate') ? parseFloat(formData.get('hourly_rate') as string) : null,
      start_date: (formData.get('start_date') as string) || null,
      due_date: (formData.get('due_date') as string) || null,
      client_id: (formData.get('client_id') as string) === 'none'
        ? null
        : (formData.get('client_id') as string) || null,
      user_id: user.id,
    };

    setSaving(true);
    try {
      let savedProject: ProjectFormDialogProject | null = null;
      if (editingProject) {
        const { data, error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', editingProject.id)
          .select('*')
          .single();
        if (error) throw error;
        savedProject = data;
        toast({ title: 'Project updated successfully' });
      } else {
        const { data, error } = await supabase
          .from('projects')
          .insert(projectData)
          .select('*')
          .single();
        if (error) throw error;
        savedProject = data;
        toast({ title: 'Project created successfully' });
        notifyStartGuideRefresh();
      }

      resetAndClose();
      if (savedProject) onSaved?.(savedProject);
    } catch (error: any) {
      toast({
        title: "Couldn't save project",
        description: 'Try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : resetAndClose())}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProject ? 'Edit Project' : 'Create New Project'}</DialogTitle>
            <DialogDescription>
              {editingProject ? 'Update project details' : 'Set up a new project'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-dialog-name">Project Name *</Label>
              <Input
                id="project-dialog-name"
                name="name"
                defaultValue={editingProject?.name}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="project-dialog-client">Client</Label>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-sm"
                  onClick={() => setCreateClientOpen(true)}
                >
                  Create new client
                </Button>
              </div>
              <Select name="client_id" value={dialogClientId} onValueChange={setDialogClientId}>
                <SelectTrigger id="project-dialog-client">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client</SelectItem>
                  {availableClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-dialog-description">Description</Label>
              <Textarea
                id="project-dialog-description"
                name="description"
                defaultValue={editingProject?.description || ''}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project-dialog-budget">Budget</Label>
                <Input
                  id="project-dialog-budget"
                  name="budget"
                  type="number"
                  step="0.01"
                  defaultValue={editingProject?.budget || ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-dialog-hourly-rate">Hourly Rate</Label>
                <Input
                  id="project-dialog-hourly-rate"
                  name="hourly_rate"
                  type="number"
                  step="0.01"
                  defaultValue={editingProject?.hourly_rate || ''}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project-dialog-start-date">Start Date</Label>
                <Input
                  id="project-dialog-start-date"
                  name="start_date"
                  type="date"
                  defaultValue={editingProject?.start_date || ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-dialog-due-date">Due Date</Label>
                <Input
                  id="project-dialog-due-date"
                  name="due_date"
                  type="date"
                  defaultValue={editingProject?.due_date || ''}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-dialog-status">Status</Label>
              <Select name="status" defaultValue={editingProject?.status || 'active'}>
                <SelectTrigger id="project-dialog-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={resetAndClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" loading={saving} loadingText="Saving…">
                {editingProject ? 'Update' : 'Create'} Project
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ClientFormDialog
        open={createClientOpen}
        onOpenChange={setCreateClientOpen}
        onSaved={handleClientSaved}
      />
    </>
  );
}
