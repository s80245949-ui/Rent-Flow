import { Layout } from "@/components/layout";
import { useListTenants, useCreateInvoice, getListInvoicesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "wouter";
import { Textarea } from "@/components/ui/textarea";

const invoiceSchema = z.object({
  tenantId: z.coerce.number().min(1, "Tenant is required"),
  billingPeriodStart: z.string().min(1, "Start date is required"),
  billingPeriodEnd: z.string().min(1, "End date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  rentAmount: z.coerce.number().min(0, "Rent amount is required"),
  notes: z.string().optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

export default function NewInvoice() {
  const [, setLocation] = useLocation();
  const { data: tenants, isLoading: loadingTenants } = useListTenants({ status: "active" });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateInvoice();

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      tenantId: 0,
      billingPeriodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      billingPeriodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
      dueDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 5).toISOString().split('T')[0],
      rentAmount: 0,
      notes: "",
    },
  });

  const onTenantChange = (id: number) => {
    form.setValue("tenantId", id);
    const tenant = tenants?.find((t) => t.id === id);
    if (tenant) {
      form.setValue("rentAmount", tenant.rentAmount);
    }
  };

  const onSubmit = (data: InvoiceFormValues) => {
    createMutation.mutate(
      { data },
      {
        onSuccess: (invoice) => {
          queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
          toast({ title: "Invoice created successfully" });
          setLocation(`/invoices/${invoice.id}`);
        },
      }
    );
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/invoices">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create Manual Invoice</h1>
            <p className="text-muted-foreground mt-1">Generate a custom invoice for a tenant.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="tenantId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tenant</FormLabel>
                      <Select 
                        disabled={loadingTenants} 
                        onValueChange={(val) => onTenantChange(parseInt(val))} 
                        value={field.value ? field.value.toString() : ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingTenants ? "Loading tenants..." : "Select tenant"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tenants?.map((t) => (
                            <SelectItem key={t.id} value={t.id.toString()}>
                              {t.fullName} - {t.propertyName} (Unit {t.roomNumber})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="billingPeriodStart"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Billing Period Start</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="billingPeriodEnd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Billing Period End</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="rentAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rent Amount (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Any additional notes for this invoice" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end pt-4 border-t">
                  <Button type="button" variant="outline" className="mr-2" asChild>
                    <Link href="/invoices">Cancel</Link>
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    {createMutation.isPending ? "Creating..." : "Create Invoice"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
