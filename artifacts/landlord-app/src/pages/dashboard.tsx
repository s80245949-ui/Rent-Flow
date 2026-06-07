import { Layout } from "@/components/layout";
import { useGetDashboardStats, useGetRecentActivity, useGetOverdueInvoices } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Building2, Users, Receipt, IndianRupee, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity();
  const { data: overdue, isLoading: overdueLoading } = useGetOverdueInvoices();

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your properties and finances.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Income (Monthly)</CardTitle>
              <IndianRupee className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="h-8 w-32 bg-muted animate-pulse rounded" />
              ) : (
                <div className="text-2xl font-bold">{formatCurrency(stats?.monthlyIncome || 0)}</div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Collected This Month</CardTitle>
              <Receipt className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="h-8 w-32 bg-muted animate-pulse rounded" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{formatCurrency(stats?.collectedThisMonth || 0)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats?.paidThisMonth || 0} invoices paid
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overdue Amount</CardTitle>
              <AlertCircle className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="h-8 w-32 bg-muted animate-pulse rounded" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-destructive">{formatCurrency(stats?.overdueAmount || 0)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats?.overdueCount || 0} invoices overdue
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Tenants</CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.activeTenants || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Across {stats?.totalProperties || 0} properties
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex gap-4">
                      <div className="w-2 h-2 rounded-full bg-muted mt-2" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                        <div className="h-3 w-1/4 bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {activity?.map((item) => (
                    <div key={item.id} className="flex gap-4 relative">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0 z-10 relative" />
                      <div className="absolute left-[3px] top-4 bottom-[-24px] w-[2px] bg-border last:hidden" />
                      <div>
                        <p className="text-sm">
                          <span className="font-medium">{item.tenantName}</span>{" "}
                          {item.description}
                          {item.amount && <span className="font-bold ml-1">{formatCurrency(item.amount)}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {activity?.length === 0 && (
                    <p className="text-sm text-muted-foreground">No recent activity.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Overdue Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {overdueLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-16 w-full bg-muted animate-pulse rounded" />)}
                </div>
              ) : (
                <div className="space-y-4">
                  {overdue?.map((invoice) => (
                    <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="block">
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="font-medium">{invoice.tenantName}</p>
                          <p className="text-sm text-muted-foreground">
                            {invoice.invoiceNumber} • {invoice.propertyName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-destructive">{formatCurrency(invoice.totalAmount - invoice.paidAmount)}</p>
                          <p className="text-xs text-muted-foreground">
                            Due {formatDate(invoice.dueDate)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                  {overdue?.length === 0 && (
                    <p className="text-sm text-muted-foreground">No overdue invoices.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
