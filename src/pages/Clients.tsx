import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { Plus, Search, Users, Mail, Phone, Building2, MoreVertical, Pencil, Trash2, Grid, List } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PhoneInput } from '@/components/ui/phone-input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Client {
  id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  tax_id: string | null;
  street: string | null;
  street2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  avatar_color: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  project_count?: number;
}

const AVATAR_COLORS = [
  '#10B981', // Green
  '#3B82F6', // Blue
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
];

export default function Clients() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientPhone, setClientPhone] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[4]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewingClient, setViewingClient] = useState<Client | null>(null);

  useEffect(() => {
    if (user) {
      fetchClients();
    }
  }, [user]);

  useEffect(() => {
    setClientPhone(editingClient?.phone || '');
    setSelectedColor(editingClient?.avatar_color || AVATAR_COLORS[4]);
  }, [editingClient]);

  const fetchClients = async () => {
    try {
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      // Fetch project counts
      const { data: projectCounts, error: projectError } = await supabase
        .from('projects')
        .select('client_id');

      if (!projectError && projectCounts) {
        const countMap = projectCounts.reduce((acc, p) => {
          if (p.client_id) {
            acc[p.client_id] = (acc[p.client_id] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);

        const clientsWithCounts = (clientsData || []).map(c => ({
          ...c,
          project_count: countMap[c.id] || 0
        }));
        setClients(clientsWithCounts);
      } else {
        setClients(clientsData || []);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const firstName = formData.get('first_name') as string;
    const lastName = formData.get('last_name') as string;
    const fullName = `${firstName} ${lastName}`.trim();
    
    const clientData = {
      name: fullName,
      first_name: firstName || null,
      last_name: lastName || null,
      email: formData.get('email') as string || null,
      phone: clientPhone || null,
      company: formData.get('company') as string || null,
      tax_id: formData.get('tax_id') as string || null,
      street: formData.get('street') as string || null,
      street2: formData.get('street2') as string || null,
      city: formData.get('city') as string || null,
      state: formData.get('state') as string || null,
      postal_code: formData.get('postal_code') as string || null,
      country: formData.get('country') as string || null,
      avatar_color: selectedColor,
      status: formData.get('status') as string,
      notes: formData.get('notes') as string || null,
      user_id: user!.id,
    };

    try {
      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', editingClient.id);
        if (error) throw error;
        toast({ title: 'Client updated successfully' });
      } else {
        const { error } = await supabase
          .from('clients')
          .insert(clientData);
        if (error) throw error;
        toast({ title: 'Client created successfully' });
      }
      
      setIsDialogOpen(false);
      setEditingClient(null);
      setClientPhone('');
      setSelectedColor(AVATAR_COLORS[4]);
      fetchClients();
    } catch (error: any) {
      toast({
        title: 'Error saving client',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;
    
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Client deleted successfully' });
      fetchClients();
    } catch (error: any) {
      toast({
        title: 'Error deleting client',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setIsDialogOpen(true);
  };

  const filteredClients = clients.filter(
    (client) => {
      const matchesSearch =
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.company?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
      return matchesSearch && matchesStatus;
    }
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success/10 text-success';
      case 'inactive':
        return 'bg-muted text-muted-foreground';
      case 'lead':
        return 'bg-warning/10 text-warning';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getInitials = (client: Client) => {
    if (client.first_name && client.last_name) {
      return `${client.first_name[0]}${client.last_name[0]}`.toUpperCase();
    }
    return client.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
            <p className="text-muted-foreground">
              Manage your client relationships
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingClient(null);
              setClientPhone('');
              setSelectedColor(AVATAR_COLORS[4]);
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] w-[95vw]">
              <DialogHeader>
                <DialogTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        name="first_name"
                        defaultValue={editingClient?.first_name || editingClient?.name.split(' ')[0] || ''}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input
                        id="last_name"
                        name="last_name"
                        defaultValue={editingClient?.last_name || editingClient?.name.split(' ').slice(1).join(' ') || ''}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        defaultValue={editingClient?.email || ''}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input
                        id="company"
                        name="company"
                        defaultValue={editingClient?.company || ''}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <PhoneInput
                      id="phone"
                      value={clientPhone}
                      onChange={setClientPhone}
                      placeholder="Phone number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax_id">Tax Identification Number</Label>
                    <Input
                      id="tax_id"
                      name="tax_id"
                      defaultValue={editingClient?.tax_id || ''}
                      placeholder="Tax ID / VAT number"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input
                      name="street"
                      defaultValue={editingClient?.street || ''}
                      placeholder="Street"
                    />
                  </div>
                  <Input
                    name="street2"
                    defaultValue={editingClient?.street2 || ''}
                    placeholder="Street 2"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      name="city"
                      defaultValue={editingClient?.city || ''}
                      placeholder="City"
                    />
                    <Input
                      name="state"
                      defaultValue={editingClient?.state || ''}
                      placeholder="State/Province"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      name="postal_code"
                      defaultValue={editingClient?.postal_code || ''}
                      placeholder="ZIP/Postal Code"
                    />
                    <Input
                      name="country"
                      defaultValue={editingClient?.country || ''}
                      placeholder="Country"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue={editingClient?.status || 'active'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="lead">Lead</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Avatar Color</Label>
                    <div className="flex gap-2 flex-wrap">
                      {AVATAR_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded-full transition-all ${
                            selectedColor === color ? 'ring-2 ring-offset-2 ring-primary' : ''
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setSelectedColor(color)}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      defaultValue={editingClient?.notes || ''}
                      rows={3}
                      placeholder="Internal notes about this client..."
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingClient ? 'Update' : 'Add'} Client
                    </Button>
                  </div>
                </form>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search, Status Filter & View Toggle */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          </div>
        </div>

        {/* Clients Grid/List */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredClients.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-1">No clients yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get started by adding your first client
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Client
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className={viewMode === 'grid' ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
              {filteredClients.map((client) => (
                <Card
                  key={client.id}
                  className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => viewMode === 'grid' && setViewingClient(client)}
                >
                  <CardContent className={viewMode === 'grid' ? "p-5 relative" : "p-4 flex items-center justify-between"}>
                    {viewMode === 'grid' && (
                      <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(client)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(client.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                    <div className={viewMode === 'grid' ? "space-y-3" : "flex items-center gap-4"}>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm shrink-0"
                          style={{ backgroundColor: client.avatar_color || '#8B5CF6' }}
                        >
                          {getInitials(client)}
                        </div>
                        <div>
                          <p className="font-semibold">{client.name}</p>
                          {client.company && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {client.company}
                            </p>
                          )}
                        </div>
                      </div>
                      {viewMode === 'grid' && (
                        <>
                          {client.email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-4 w-4" />
                              <a href={`mailto:${client.email}`} className="hover:text-primary truncate" onClick={(e) => e.stopPropagation()}>
                                {client.email}
                              </a>
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              <a href={`tel:${client.phone}`} className="hover:text-primary" onClick={(e) => e.stopPropagation()}>
                                {client.phone}
                              </a>
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-2">
                            <Badge className={getStatusColor(client.status)}>
                              {client.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {client.project_count || 0} projects
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                    {viewMode === 'list' && (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <span className="text-sm text-muted-foreground hidden md:block">
                          {client.email}
                        </span>
                        <Badge className={getStatusColor(client.status)}>
                          {client.status}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(client)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(client.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Sheet open={!!viewingClient} onOpenChange={(open) => !open && setViewingClient(null)}>
              <SheetContent className="sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Client details</SheetTitle>
                </SheetHeader>
                {viewingClient && (
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium"
                        style={{ backgroundColor: viewingClient.avatar_color || '#8B5CF6' }}
                      >
                        {getInitials(viewingClient)}
                      </div>
                      <div>
                        <p className="font-semibold text-lg">{viewingClient.name}</p>
                        {viewingClient.company && (
                          <p className="text-sm text-muted-foreground">{viewingClient.company}</p>
                        )}
                        <Badge className={getStatusColor(viewingClient.status)}>
                          {viewingClient.status}
                        </Badge>
                      </div>
                    </div>
                    {viewingClient.email && (
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <a href={`mailto:${viewingClient.email}`} className="text-primary hover:underline">
                          {viewingClient.email}
                        </a>
                      </div>
                    )}
                    {viewingClient.phone && (
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <a href={`tel:${viewingClient.phone}`} className="text-primary hover:underline">
                          {viewingClient.phone}
                        </a>
                      </div>
                    )}
                    {(viewingClient.street || viewingClient.city) && (
                      <div>
                        <p className="text-sm text-muted-foreground">Address</p>
                        <p className="text-sm">
                          {[viewingClient.street, viewingClient.street2, viewingClient.city, viewingClient.state, viewingClient.postal_code, viewingClient.country].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {viewingClient.project_count || 0} projects
                    </p>
                    <div className="flex gap-2 pt-4">
                      <Button onClick={() => { openEditDialog(viewingClient); setViewingClient(null); }}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button variant="outline" onClick={() => setViewingClient(null)}>
                        Close
                      </Button>
                    </div>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </>
        )}
      </div>
    </AppLayout>
  );
}
