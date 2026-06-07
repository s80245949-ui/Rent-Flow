import { Router, type IRouter } from "express";
import { eq, sql, and } from "drizzle-orm";
import { db, tenantsTable, invoicesTable, paymentsTable, propertiesTable } from "@workspace/db";
import {
  GetDashboardStatsResponse,
  GetRecentActivityResponse,
  GetOverdueInvoicesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [totalTenantsRow] = await db.select({ count: sql<number>`count(*)` }).from(tenantsTable);
  const [activeTenantsRow] = await db.select({ count: sql<number>`count(*)` }).from(tenantsTable).where(eq(tenantsTable.status, "active"));
  const [totalPropertiesRow] = await db.select({ count: sql<number>`count(*)` }).from(propertiesTable);

  const activeTenants = await db.select().from(tenantsTable).where(eq(tenantsTable.status, "active"));
  const monthlyIncome = activeTenants.reduce((s, t) => s + parseFloat(t.rentAmount), 0);

  const thisMonthInvoices = await db.select().from(invoicesTable)
    .where(sql`${invoicesTable.billingPeriodStart} LIKE ${monthStr + '%'}`);

  const paidThisMonth = thisMonthInvoices.filter(i => i.status === "paid").length;
  const allPayments = await db.select().from(paymentsTable);

  // Payments made this month
  const thisMonthPayments = allPayments.filter(p => p.paymentDate.startsWith(monthStr));
  const collectedThisMonth = thisMonthPayments.reduce((s, p) => s + parseFloat(p.amount), 0);

  const unpaidInvoices = await db.select().from(invoicesTable).where(eq(invoicesTable.status, "unpaid"));
  const partialInvoices = await db.select().from(invoicesTable).where(eq(invoicesTable.status, "partial"));
  const overdueInvoices = await db.select().from(invoicesTable).where(eq(invoicesTable.status, "overdue"));

  const pendingAmount = [...unpaidInvoices, ...partialInvoices].reduce((s, i) => {
    const paid = allPayments.filter(p => p.invoiceId === i.id).reduce((x, p) => x + parseFloat(p.amount), 0);
    return s + Math.max(0, parseFloat(i.rentAmount) - paid);
  }, 0);

  const overdueAmount = overdueInvoices.reduce((s, i) => {
    const paid = allPayments.filter(p => p.invoiceId === i.id).reduce((x, p) => x + parseFloat(p.amount), 0);
    return s + Math.max(0, parseFloat(i.rentAmount) - paid);
  }, 0);

  res.json(GetDashboardStatsResponse.parse({
    totalTenants: Number(totalTenantsRow.count),
    activeTenants: Number(activeTenantsRow.count),
    totalProperties: Number(totalPropertiesRow.count),
    monthlyIncome,
    collectedThisMonth,
    pendingAmount,
    overdueAmount,
    overdueCount: overdueInvoices.length,
    unpaidCount: unpaidInvoices.length,
    paidThisMonth,
  }));
});

router.get("/dashboard/recent-activity", async (_req, res): Promise<void> => {
  // Recent payments
  const recentPayments = await db
    .select({ payment: paymentsTable, tenant: tenantsTable })
    .from(paymentsTable)
    .leftJoin(tenantsTable, eq(paymentsTable.tenantId, tenantsTable.id))
    .orderBy(sql`${paymentsTable.createdAt} DESC`)
    .limit(10);

  // Recent invoices
  const recentInvoices = await db
    .select({ invoice: invoicesTable, tenant: tenantsTable })
    .from(invoicesTable)
    .leftJoin(tenantsTable, eq(invoicesTable.tenantId, tenantsTable.id))
    .orderBy(sql`${invoicesTable.createdAt} DESC`)
    .limit(10);

  const activities = [
    ...recentPayments.map(r => ({
      id: r.payment.id * 1000,
      type: "payment",
      description: `Payment of ₹${parseFloat(r.payment.amount).toFixed(0)} recorded`,
      amount: parseFloat(r.payment.amount),
      tenantName: r.tenant?.fullName ?? "Unknown",
      createdAt: r.payment.createdAt.toISOString(),
    })),
    ...recentInvoices.map(r => ({
      id: r.invoice.id * 1000 + 1,
      type: "invoice",
      description: `Invoice ${r.invoice.invoiceNumber} generated`,
      amount: parseFloat(r.invoice.rentAmount),
      tenantName: r.tenant?.fullName ?? "Unknown",
      createdAt: r.invoice.createdAt.toISOString(),
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 15);

  res.json(GetRecentActivityResponse.parse(activities));
});

router.get("/dashboard/overdue", async (_req, res): Promise<void> => {
  const now = new Date().toISOString().split("T")[0];
  const invs = await db.select().from(invoicesTable)
    .where(and(eq(invoicesTable.status, "overdue")));

  // Also auto-mark unpaid invoices past due date as overdue
  const unpaid = await db.select().from(invoicesTable).where(eq(invoicesTable.status, "unpaid"));
  const nowOverdue = unpaid.filter(i => i.dueDate < now);
  for (const inv of nowOverdue) {
    await db.update(invoicesTable).set({ status: "overdue" }).where(eq(invoicesTable.id, inv.id));
  }
  const allOverdue = [...invs, ...nowOverdue];

  const result = await Promise.all(allOverdue.map(async inv => {
    const [tenantRow] = await db
      .select({ tenant: tenantsTable, propertyName: propertiesTable.name })
      .from(tenantsTable)
      .leftJoin(propertiesTable, eq(tenantsTable.propertyId, propertiesTable.id))
      .where(eq(tenantsTable.id, inv.tenantId));
    const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.invoiceId, inv.id));
    const paidAmount = payments.reduce((s, p) => s + parseFloat(p.amount), 0);
    const rentAmount = parseFloat(inv.rentAmount);
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      tenantId: inv.tenantId,
      tenantName: tenantRow?.tenant.fullName ?? "Unknown",
      roomNumber: tenantRow?.tenant.roomNumber ?? "",
      propertyName: tenantRow?.propertyName ?? null,
      billingPeriodStart: inv.billingPeriodStart,
      billingPeriodEnd: inv.billingPeriodEnd,
      dueDate: inv.dueDate,
      rentAmount,
      totalCharges: 0,
      totalAmount: rentAmount,
      paidAmount,
      status: "overdue",
      createdAt: inv.createdAt.toISOString(),
    };
  }));

  res.json(GetOverdueInvoicesResponse.parse(result));
});

export default router;
