import { Layout } from "@/components/layout";
import { 
  useGetInvoice, 
  useRecordPayment, 
  useAddCharge,
  getGetInvoiceQueryKey,
  getListInvoicesQueryKey,
  getListPaymentsQueryKey
} from "@workspace/api-client-react";
import { useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Printer, Share2, Plus, Receipt, IndianRupee, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const paymentSchema = z.object({
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  paymentDate: z.string().min(1, "Date is required"),
  paymentMethod: z.string().min(1, "Method is required"),
  transactionRef: z.string().optional(),
  notes: z.string().optional(),
});

const chargeSchema = z.object({
  chargeType: z.string().min(1, "Type is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().min(1, "Amount is required"),
  isRecurring: z.boolean().default(false),
});

export default function InvoiceDetail() {
  const { id } = useParams();
  const invoiceId = parseInt(id || "0");
  
  const { data: invoice, isLoading } = useGetInvoice(invoiceId, { query: { enabled: !!invoiceId } });
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isChargeOpen, setIsChargeOpen] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const paymentMutation = useRecordPayment();
  const chargeMutation = useAddCharge();

  const paymentForm = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: "bank transfer",
      transactionRef: "",
      notes: "",
    },
  });

  const chargeForm = useForm<z.infer<typeof chargeSchema>>({
    resolver: zodResolver(chargeSchema),
    defaultValues: {
      chargeType: "electricity",
      description: "",
      amount: 0,
      isRecurring: false,
    },
  });

  // Effect to update payment amount default once invoice loads
  if (invoice && paymentForm.getValues("amount") === 0) {
    paymentForm.setValue("amount", invoice.totalAmount - invoice.paidAmount);
  }

  const onPaymentSubmit = (data: z.infer<typeof paymentSchema>) => {
    if (!invoice) return;
    paymentMutation.mutate(
      { data: { ...data, invoiceId, tenantId: invoice.tenantId } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetInvoiceQueryKey(invoiceId) });
          queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
          setIsPaymentOpen(false);
          toast({ title: "Payment recorded successfully" });
        },
      }
    );
  };

  const onChargeSubmit = (data: z.infer<typeof chargeSchema>) => {
    chargeMutation.mutate(
      { id: invoiceId, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetInvoiceQueryKey(invoiceId) });
          setIsChargeOpen(false);
          chargeForm.reset();
          toast({ title: "Charge added successfully" });
        },
      }
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (!invoice) return;
    const text = `Invoice #${invoice.invoiceNumber} for ${invoice.propertyName} Unit ${invoice.roomNumber}\nAmount Due: ${formatCurrency(invoice.totalAmount - invoice.paidAmount)}\nDue Date: ${formatDate(invoice.dueDate)}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${invoice.invoiceNumber}`,
          text: text,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  if (isLoading) {
    return <Layout><div className="animate-pulse space-y-8"><div className="h-32 bg-muted rounded-lg" /><div className="h-64 bg-muted rounded-lg" /></div></Layout>;
  }

  if (!invoice) return <Layout><div>Invoice not found</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-start print:hidden">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/invoices">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                Invoice {invoice.invoiceNumber}
                <Badge variant={
                  invoice.status === "paid" ? "default" :
                  invoice.status === "overdue" ? "destructive" :
                  invoice.status === "partial" ? "outline" :
                  "secondary"
                } className={invoice.status === "paid" ? "bg-green-600 hover:bg-green-700" : ""}>
                  {invoice.status}
                </Badge>
              </h1>
              <p className="text-muted-foreground mt-1">
                For {invoice.tenantName} • {invoice.propertyName} Unit {invoice.roomNumber}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print PDF
            </Button>
            {invoice.status !== "paid" && (
              <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    <IndianRupee className="w-4 h-4 mr-2" />
                    Record Payment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Payment for {invoice.invoiceNumber}</DialogTitle>
                  </DialogHeader>
                  <Form {...paymentForm}>
                    <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-4">
                      <FormField control={paymentForm.control} name="amount" render={({ field }) => (
                        <FormItem><FormLabel>Amount (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={paymentForm.control} name="paymentDate" render={({ field }) => (
                        <FormItem><FormLabel>Payment Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={paymentForm.control} name="paymentMethod" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Method</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="bank transfer">Bank Transfer</SelectItem>
                              <SelectItem value="upi">UPI</SelectItem>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="cheque">Cheque</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={paymentForm.control} name="transactionRef" render={({ field }) => (
                        <FormItem><FormLabel>Transaction Reference (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <div className="flex justify-end pt-4 border-t">
                        <Button type="submit" disabled={paymentMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white">
                          Save Payment
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="print:shadow-none print:border-none">
              <CardHeader className="border-b bg-muted/20">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="font-bold text-xl text-primary">RentEase</h2>
                    <p className="text-sm text-muted-foreground mt-1">Landlord Dashboard</p>
                  </div>
                  <div className="text-right">
                    <h3 className="font-semibold text-lg">INVOICE</h3>
                    <p className="text-sm text-muted-foreground">#{invoice.invoiceNumber}</p>
                    <p className="text-sm text-muted-foreground">Due: {formatDate(invoice.dueDate)}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex justify-between mb-8">
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-1">Billed To:</p>
                    <p className="font-medium text-lg">{invoice.tenantName}</p>
                    <p className="text-sm">{invoice.propertyName} - Unit {invoice.roomNumber}</p>
                    {invoice.tenantPhone && <p className="text-sm mt-1">{invoice.tenantPhone}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-muted-foreground mb-1">Billing Period:</p>
                    <p className="text-sm">{formatDate(invoice.billingPeriodStart)} - {formatDate(invoice.billingPeriodEnd)}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center mb-4 print:hidden">
                  <h4 className="font-semibold text-lg">Charges</h4>
                  {invoice.status !== "paid" && (
                    <Dialog open={isChargeOpen} onOpenChange={setIsChargeOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Plus className="w-4 h-4 mr-2" /> Add Charge
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Custom Charge</DialogTitle>
                        </DialogHeader>
                        <Form {...chargeForm}>
                          <form onSubmit={chargeForm.handleSubmit(onChargeSubmit)} className="space-y-4">
                            <FormField control={chargeForm.control} name="chargeType" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="electricity">Electricity</SelectItem>
                                    <SelectItem value="water">Water</SelectItem>
                                    <SelectItem value="maintenance">Maintenance</SelectItem>
                                    <SelectItem value="parking">Parking</SelectItem>
                                    <SelectItem value="internet">Internet</SelectItem>
                                    <SelectItem value="late fee">Late Fee</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={chargeForm.control} name="description" render={({ field }) => (
                              <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={chargeForm.control} name="amount" render={({ field }) => (
                              <FormItem><FormLabel>Amount (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <div className="flex justify-end pt-4">
                              <Button type="submit" disabled={chargeMutation.isPending}>Add Charge</Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Rent for {formatDate(invoice.billingPeriodStart)} - {formatDate(invoice.billingPeriodEnd)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(invoice.rentAmount)}</TableCell>
                    </TableRow>
                    {invoice.charges?.map((charge) => (
                      <TableRow key={charge.id}>
                        <TableCell>
                          <span className="capitalize">{charge.chargeType}</span>
                          {charge.description && <span className="text-muted-foreground text-sm ml-2">- {charge.description}</span>}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(charge.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="mt-8 flex justify-end">
                  <div className="w-64 space-y-3">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">{formatCurrency(invoice.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2 text-green-600">
                      <span>Amount Paid</span>
                      <span>-{formatCurrency(invoice.paidAmount)}</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="font-bold text-lg">Balance Due</span>
                      <span className="font-bold text-lg text-primary">{formatCurrency(invoice.totalAmount - invoice.paidAmount)}</span>
                    </div>
                  </div>
                </div>

                {invoice.notes && (
                  <div className="mt-12 p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm font-semibold mb-1">Notes:</p>
                    <p className="text-sm text-muted-foreground">{invoice.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 print:hidden">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Payment History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {invoice.payments && invoice.payments.length > 0 ? (
                  <div className="space-y-4">
                    {invoice.payments.map((payment) => (
                      <div key={payment.id} className="border-b last:border-0 pb-4 last:pb-0">
                        <div className="flex justify-between mb-1">
                          <span className="font-semibold text-green-600">{formatCurrency(payment.amount)}</span>
                          <span className="text-sm text-muted-foreground">{formatDate(payment.paymentDate)}</span>
                        </div>
                        <p className="text-sm capitalize">{payment.paymentMethod}</p>
                        {payment.transactionRef && (
                          <p className="text-xs text-muted-foreground mt-1">Ref: {payment.transactionRef}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No payments recorded yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
