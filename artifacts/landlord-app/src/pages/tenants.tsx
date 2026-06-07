import { Layout } from "@/components/layout";
import { useListTenants, useCreateTenant, useListProperties, getListTenantsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Users, Plus, Search, MapPin, Phone, Mail, Building2 } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Link } from "wouter";

const tenantSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  phone: z.string().min(10, "Valid phone required"),
  email: z.string().email("Valid email required").optional().or(z.literal("")),
  propertyId: z.coerce.number().optional(),
  roomNumber: z.string().min(1, "Room number is required"),
  address: z.string().optional(),
  moveInDate: z.string().min(1, "Move-in date is required"),
  rentAmount: z.coerce.number().min(1, "Rent is required"),
  securityDeposit: z.coerce.number().min(0),
  status: z.enum(["active", "inactive"]).default("active"),
});

type TenantFormValues = z.infer<typeof tenantSchema>;

export default function Tenants() {
  const [search, setSearch] = useState("");
  const { data: tenants, isLoading } = useListTenants({ search });
  const { data: properties } = useListProperties();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const createMutation = useCreateTenant();

  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      roomNumber: "",
      address: "",
      moveInDate: new Date().toISOString().split('T')[0],
      rentAmount: 0,
      securityDeposit: 0,
      status: "active",
    },
  });

  const onSubmit = (data: TenantFormValues) => {
    createMutation.mutate(
      { data: { ...data, email: data.email || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTenantsQueryKey() });
          setIsCreateOpen(false);
          form.reset();
          toast({ title: "Tenant added successfully" });
        },
      }
    );
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
            <p className="text-muted-foreground mt-1">Manage your tenants across all properties.</p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Tenant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Tenant</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="fullName" render={({ field }) => (
                    <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email (Optional)</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="propertyId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property</FormLabel>
                      <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value?.toString() || ""}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {properties?.map(p => (
                            <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="roomNumber" render={({ field }) => (
                    <FormItem><FormLabel>Room/Unit Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="moveInDate" render={({ field }) => (
                    <FormItem><FormLabel>Move In Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="rentAmount" render={({ field }) => (
                    <FormItem><FormLabel>Rent Amount (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="securityDeposit" render={({ field }) => (
                    <FormItem><FormLabel>Security Deposit (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="col-span-2 flex justify-end pt-4">
                    <Button type="submit" disabled={createMutation.isPending}>Save Tenant</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search tenants by name, phone..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse h-48 bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tenants?.map((tenant) => (
              <Link key={tenant.id} href={`/tenants/${tenant.id}`} className="block">
                <Card className="hover:border-primary/50 transition-colors h-full flex flex-col">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {tenant.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{tenant.fullName}</CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <Badge variant={tenant.status === "active" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 h-4">
                              {tenant.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">• Unit {tenant.roomNumber}</span>
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        <span className="truncate">{tenant.propertyName || "No Property Assigned"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{tenant.phone}</span>
                      </div>
                      <div className="pt-2 border-t mt-2 flex justify-between">
                        <div>
                          <p className="text-xs">Rent</p>
                          <p className="font-semibold text-foreground">{formatCurrency(tenant.rentAmount)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs">Move-in</p>
                          <p className="font-medium text-foreground">{formatDate(tenant.moveInDate)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            
            {tenants?.length === 0 && (
              <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium">No tenants found</h3>
                <p className="text-muted-foreground mt-1">Try adjusting your search or add a new tenant.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
