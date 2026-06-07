import { Layout } from "@/components/layout";
import { useListInvoices, useGenerateMonthlyInvoices, getListInvoicesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Link } from "wouter";
import { FileText, Plus, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function Invoices() {
  const [status, setStatus] = useState<any>(undefined);
  const { data: invoices, isLoading } = useListInvoices({ status });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const generateMutation = useGenerateMonthlyInvoices();

  const handleGenerate = () => {
    const today = new Date();
    generateMutation.mutate(
      { data: { month: today.getMonth() + 1, year: today.getFullYear() } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
          toast({ title: "Monthly invoices generated" });
        }
      }
    );
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
            <p className="text-muted-foreground mt-1">Manage billing and collections.</p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleGenerate} disabled={generateMutation.isPending}>
              <RefreshCw className={`w-4 h-4 mr-2 ${generateMutation.isPending ? "animate-spin" : ""}`} />
              Auto-Generate Monthly
            </Button>
            <Button asChild>
              <Link href="/invoices/new">
                <Plus className="w-4 h-4 mr-2" />
                New Invoice
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-48">
            <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? undefined : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Property/Unit</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">Loading...</TableCell>
                </TableRow>
              ) : invoices?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No invoices found.
                  </TableCell>
                </TableRow>
              ) : (
                invoices?.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                    <TableCell>{inv.tenantName}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{inv.propertyName}</div>
                        <div className="text-xs text-muted-foreground">Unit {inv.roomNumber}</div>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(inv.dueDate)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(inv.totalAmount)}</TableCell>
                    <TableCell>
                      <Badge variant={
                        inv.status === "paid" ? "default" :
                        inv.status === "overdue" ? "destructive" :
                        inv.status === "partial" ? "outline" :
                        "secondary"
                      } className={inv.status === "paid" ? "bg-green-600 hover:bg-green-700" : ""}>
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/invoices/${inv.id}`}>View Details</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </Layout>
  );
}
