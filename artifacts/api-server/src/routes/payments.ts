import { Router, type IRouter } from "express";
import { eq, and, type SQL } from "drizzle-orm";
import { db, paymentsTable, invoicesTable } from "@workspace/db";
import {
  ListPaymentsResponse,
  ListPaymentsQueryParams,
  RecordPaymentBody,
  DeletePaymentParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatPayment(p: typeof paymentsTable.$inferSelect) {
  return { ...p, amount: parseFloat(p.amount), createdAt: p.createdAt.toISOString() };
}

router.get("/payments", async (req, res): Promise<void> => {
  const qp = ListPaymentsQueryParams.safeParse(req.query);
  if (!qp.success) { res.status(400).json({ error: qp.error.message }); return; }
  const { tenantId, invoiceId } = qp.data;
  const conditions: SQL[] = [];
  if (tenantId) conditions.push(eq(paymentsTable.tenantId, tenantId));
  if (invoiceId) conditions.push(eq(paymentsTable.invoiceId, invoiceId));
  const payments = await db.select().from(paymentsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(paymentsTable.createdAt);
  res.json(ListPaymentsResponse.parse(payments.map(formatPayment)));
});

router.post("/payments", async (req, res): Promise<void> => {
  const parsed = RecordPaymentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [payment] = await db.insert(paymentsTable).values(parsed.data).returning();

  // Recalculate invoice status
  const allPayments = await db.select().from(paymentsTable).where(eq(paymentsTable.invoiceId, parsed.data.invoiceId));
  const [inv] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, parsed.data.invoiceId));
  if (inv) {
    const paidAmount = allPayments.reduce((s, p) => s + parseFloat(p.amount), 0);
    const rentAmount = parseFloat(inv.rentAmount);
    let newStatus = inv.status;
    if (paidAmount >= rentAmount) newStatus = "paid";
    else if (paidAmount > 0) newStatus = "partial";
    else newStatus = "unpaid";
    await db.update(invoicesTable).set({ status: newStatus }).where(eq(invoicesTable.id, inv.id));
  }

  res.status(201).json(formatPayment(payment));
});

router.delete("/payments/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeletePaymentParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(paymentsTable).where(eq(paymentsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
