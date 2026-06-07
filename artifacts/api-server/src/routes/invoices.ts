import { Router, type IRouter } from "express";
import { eq, and, sql, type SQL } from "drizzle-orm";
import { db, invoicesTable, tenantsTable, propertiesTable, chargesTable, paymentsTable } from "@workspace/db";
import {
  ListInvoicesResponse,
  ListInvoicesQueryParams,
  GetInvoiceParams,
  GetInvoiceResponse,
  UpdateInvoiceParams,
  UpdateInvoiceBody,
  UpdateInvoiceResponse,
  DeleteInvoiceParams,
  CreateInvoiceBody,
  GenerateMonthlyInvoicesBody,
  GenerateMonthlyInvoicesResponse,
  ListInvoiceChargesParams,
  ListInvoiceChargesResponse,
  AddChargeParams,
  AddChargeBody,
  UpdateChargeParams,
  UpdateChargeBody,
  UpdateChargeResponse,
  DeleteChargeParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function padDate(n: number) { return String(n).padStart(2, "0"); }

async function buildInvoiceSummary(inv: typeof invoicesTable.$inferSelect) {
  const [tenantRow] = await db
    .select({ tenant: tenantsTable, propertyName: propertiesTable.name })
    .from(tenantsTable)
    .leftJoin(propertiesTable, eq(tenantsTable.propertyId, propertiesTable.id))
    .where(eq(tenantsTable.id, inv.tenantId));

  const charges = await db.select().from(chargesTable).where(eq(chargesTable.invoiceId, inv.id));
  const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.invoiceId, inv.id));

  const totalCharges = charges.reduce((s, c) => s + parseFloat(c.amount), 0);
  const paidAmount = payments.reduce((s, p) => s + parseFloat(p.amount), 0);
  const rentAmount = parseFloat(inv.rentAmount);
  const totalAmount = rentAmount + totalCharges;

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
    totalCharges,
    totalAmount,
    paidAmount,
    status: inv.status,
    createdAt: inv.createdAt.toISOString(),
  };
}

router.get("/invoices", async (req, res): Promise<void> => {
  const qp = ListInvoicesQueryParams.safeParse(req.query);
  if (!qp.success) { res.status(400).json({ error: qp.error.message }); return; }

  const { tenantId, status, month } = qp.data;
  const conditions: SQL[] = [];
  if (tenantId) conditions.push(eq(invoicesTable.tenantId, tenantId));
  if (status) conditions.push(eq(invoicesTable.status, status));
  if (month) conditions.push(sql`${invoicesTable.billingPeriodStart} LIKE ${month + '%'}`);

  const invs = await db.select().from(invoicesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(invoicesTable.createdAt);

  const result = await Promise.all(invs.map(buildInvoiceSummary));
  res.json(ListInvoicesResponse.parse(result));
});

router.post("/invoices/generate", async (req, res): Promise<void> => {
  const parsed = GenerateMonthlyInvoicesBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { month, year, propertyId } = parsed.data;
  const conditions: SQL[] = [eq(tenantsTable.status, "active")];
  if (propertyId) conditions.push(eq(tenantsTable.propertyId, propertyId));

  const activeTenants = await db.select().from(tenantsTable).where(and(...conditions));

  const startDate = `${year}-${padDate(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${padDate(month)}-${padDate(lastDay)}`;
  const dueDate = `${year}-${padDate(month)}-10`;

  const newInvoices = [];
  for (const tenant of activeTenants) {
    const existing = await db.select().from(invoicesTable)
      .where(and(eq(invoicesTable.tenantId, tenant.id), eq(invoicesTable.billingPeriodStart, startDate)));
    if (existing.length > 0) continue;

    const count = await db.select({ count: sql<number>`count(*)` }).from(invoicesTable);
    const invNum = `INV-${year}${padDate(month)}-${String(Number(count[0].count) + 1).padStart(4, "0")}`;

    const [inv] = await db.insert(invoicesTable).values({
      invoiceNumber: invNum,
      tenantId: tenant.id,
      billingPeriodStart: startDate,
      billingPeriodEnd: endDate,
      dueDate,
      rentAmount: tenant.rentAmount,
      status: "unpaid",
    }).returning();

    newInvoices.push(inv);
  }

  const result = await Promise.all(newInvoices.map(buildInvoiceSummary));
  res.json(GenerateMonthlyInvoicesResponse.parse(result));
});

router.post("/invoices", async (req, res): Promise<void> => {
  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const count = await db.select({ count: sql<number>`count(*)` }).from(invoicesTable);
  const d = new Date();
  const invNum = `INV-${d.getFullYear()}${padDate(d.getMonth() + 1)}-${String(Number(count[0].count) + 1).padStart(4, "0")}`;

  const [inv] = await db.insert(invoicesTable).values({
    ...parsed.data,
    invoiceNumber: invNum,
    status: "unpaid",
  }).returning();

  const summary = await buildInvoiceSummary(inv);
  res.status(201).json(GetInvoiceResponse.parse(summary));
});

router.get("/invoices/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetInvoiceParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [inv] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, params.data.id));
  if (!inv) { res.status(404).json({ error: "Invoice not found" }); return; }

  const [tenantRow] = await db
    .select({ tenant: tenantsTable, propertyName: propertiesTable.name, propertyAddress: propertiesTable.address })
    .from(tenantsTable)
    .leftJoin(propertiesTable, eq(tenantsTable.propertyId, propertiesTable.id))
    .where(eq(tenantsTable.id, inv.tenantId));

  const charges = await db.select().from(chargesTable).where(eq(chargesTable.invoiceId, inv.id));
  const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.invoiceId, inv.id));

  const totalCharges = charges.reduce((s, c) => s + parseFloat(c.amount), 0);
  const paidAmount = payments.reduce((s, p) => s + parseFloat(p.amount), 0);
  const rentAmount = parseFloat(inv.rentAmount);
  const totalAmount = rentAmount + totalCharges;

  res.json(GetInvoiceResponse.parse({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    tenantId: inv.tenantId,
    tenantName: tenantRow?.tenant.fullName ?? "Unknown",
    tenantPhone: tenantRow?.tenant.phone ?? "",
    tenantEmail: tenantRow?.tenant.email ?? null,
    roomNumber: tenantRow?.tenant.roomNumber ?? "",
    propertyName: tenantRow?.propertyName ?? null,
    propertyAddress: tenantRow?.propertyAddress ?? null,
    billingPeriodStart: inv.billingPeriodStart,
    billingPeriodEnd: inv.billingPeriodEnd,
    dueDate: inv.dueDate,
    rentAmount,
    charges: charges.map(c => ({
      ...c,
      amount: parseFloat(c.amount),
      createdAt: c.createdAt.toISOString(),
    })),
    totalCharges,
    totalAmount,
    paidAmount,
    status: inv.status,
    payments: payments.map(p => ({
      ...p,
      amount: parseFloat(p.amount),
      createdAt: p.createdAt.toISOString(),
    })),
    notes: inv.notes,
    createdAt: inv.createdAt.toISOString(),
  }));
});

router.patch("/invoices/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateInvoiceParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateInvoiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [inv] = await db.update(invoicesTable).set(parsed.data).where(eq(invoicesTable.id, params.data.id)).returning();
  if (!inv) { res.status(404).json({ error: "Invoice not found" }); return; }
  const summary = await buildInvoiceSummary(inv);
  res.json(UpdateInvoiceResponse.parse(summary));
});

router.delete("/invoices/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteInvoiceParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(invoicesTable).where(eq(invoicesTable.id, params.data.id));
  res.sendStatus(204);
});

// Charges
router.get("/invoices/:id/charges", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ListInvoiceChargesParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const charges = await db.select().from(chargesTable).where(eq(chargesTable.invoiceId, params.data.id));
  res.json(ListInvoiceChargesResponse.parse(charges.map(c => ({
    ...c, amount: parseFloat(c.amount), createdAt: c.createdAt.toISOString(),
  }))));
});

router.post("/invoices/:id/charges", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = AddChargeParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = AddChargeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [charge] = await db.insert(chargesTable).values({ ...parsed.data, invoiceId: params.data.id }).returning();
  res.status(201).json({ ...charge, amount: parseFloat(charge.amount), createdAt: charge.createdAt.toISOString() });
});

router.patch("/charges/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateChargeParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateChargeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [charge] = await db.update(chargesTable).set(parsed.data).where(eq(chargesTable.id, params.data.id)).returning();
  if (!charge) { res.status(404).json({ error: "Charge not found" }); return; }
  res.json(UpdateChargeResponse.parse({ ...charge, amount: parseFloat(charge.amount), createdAt: charge.createdAt.toISOString() }));
});

router.delete("/charges/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteChargeParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(chargesTable).where(eq(chargesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
