import { Layout } from "@/components/layout";
import { useListProperties, useCreateProperty, useUpdateProperty, useDeleteProperty, getListPropertiesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Building2, Plus, Home, MapPin, MoreVertical, Edit, Trash, Users } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";

const propertySchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  description: z.string().optional(),
  totalUnits: z.coerce.number().min(1, "Must have at least 1 unit"),
});

type PropertyFormValues = z.infer<typeof propertySchema>;

export default function Properties() {
  const { data: properties, isLoading } = useListProperties();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const createMutation = useCreateProperty();
  const updateMutation = useUpdateProperty();
  const deleteMutation = useDeleteProperty();

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      name: "",
      address: "",
      description: "",
      totalUnits: 1,
    },
  });

  const onSubmit = (data: PropertyFormValues) => {
    if (editId) {
      updateMutation.mutate(
        { id: editId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListPropertiesQueryKey() });
            setIsCreateOpen(false);
            setEditId(null);
            form.reset();
            toast({ title: "Property updated successfully" });
          },
        }
      );
    } else {
      createMutation.mutate(
        { data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListPropertiesQueryKey() });
            setIsCreateOpen(false);
            form.reset();
            toast({ title: "Property created successfully" });
          },
        }
      );
    }
  };

  const handleEdit = (property: any) => {
    setEditId(property.id);
    form.reset({
      name: property.name,
      address: property.address,
      description: property.description || "",
      totalUnits: property.totalUnits,
    });
    setIsCreateOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this property?")) {
      deleteMutation.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListPropertiesQueryKey() });
            toast({ title: "Property deleted successfully" });
          },
        }
      );
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Properties</h1>
            <p className="text-muted-foreground mt-1">Manage your rental properties and units.</p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) {
              setEditId(null);
              form.reset({ name: "", address: "", description: "", totalUnits: 1 });
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Property
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editId ? 'Edit Property' : 'Add New Property'}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Sunrise Apartments" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Full address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="totalUnits"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Units/Rooms</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Any notes about the property" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                      {editId ? 'Update' : 'Save'} Property
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-24 bg-muted" />
                <CardContent className="h-32" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties?.map((property) => (
              <Card key={property.id} className="overflow-hidden">
                <div className="h-2 bg-primary" />
                <CardHeader className="pb-4 relative">
                  <div className="absolute right-4 top-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(property)}>
                          <Edit className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(property.id)} className="text-destructive">
                          <Trash className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{property.name}</CardTitle>
                      <CardDescription className="flex items-center mt-1">
                        <MapPin className="w-3 h-3 mr-1" />
                        <span className="truncate max-w-[200px]">{property.address}</span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 py-2 border-y my-2">
                    <div className="flex flex-col items-center p-2 bg-muted/50 rounded-md">
                      <span className="text-xs text-muted-foreground flex items-center mb-1">
                        <Home className="w-3 h-3 mr-1" /> Units
                      </span>
                      <span className="font-semibold text-lg">{property.totalUnits}</span>
                    </div>
                    <div className="flex flex-col items-center p-2 bg-muted/50 rounded-md">
                      <span className="text-xs text-muted-foreground flex items-center mb-1">
                        <Users className="w-3 h-3 mr-1" /> Status
                      </span>
                      <span className="font-medium text-sm text-green-600 mt-1">Active</span>
                    </div>
                  </div>
                  {property.description && (
                    <p className="text-sm text-muted-foreground mt-4 line-clamp-2">
                      {property.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
            
            {properties?.length === 0 && (
              <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium">No properties yet</h3>
                <p className="text-muted-foreground mt-1 mb-4">Add your first property to get started.</p>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Property
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
