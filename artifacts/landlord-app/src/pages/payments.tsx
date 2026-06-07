import { Layout } from "@/components/layout";
import { useListPayments } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CreditCard } from "lucide-react";
import { Link } from "wouter";

export default function Payments() {
  const { data: payments, isLoading } = useListPayments();

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments Log</h1>
          <p className="text-muted-foreground mt-1">History of all payments received.</p>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">Loading...</TableCell>
                </TableRow>
              ) : payments?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No payments found.
                  </TableCell>
                </TableRow>
              ) : (
                payments?.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{formatDate(payment.paymentDate)}</TableCell>
                    <TableCell>
                      <Link href={`/invoices/${payment.invoiceId}`} className="text-primary hover:underline">
                        Invoice #{payment.invoiceId}
                      </Link>
                    </TableCell>
                    <TableCell className="capitalize">{payment.paymentMethod}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{payment.transactionRef || "-"}</TableCell>
                    <TableCell className="text-right font-bold text-green-600">{formatCurrency(payment.amount)}</TableCell>
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
