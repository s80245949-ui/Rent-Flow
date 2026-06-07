import { Router, type IRouter } from "express";
import { eq, ilike, and, type SQL } from "drizzle-orm";
import { db, tenantsTable, propertiesTable } from "@workspace/db";
import {
  ListTenantsResponse,
  ListTenantsQueryParams,
  GetTenantParams,
  GetTenantResponse,
  UpdateTenantParams,
  UpdateTenantBody,
  UpdateTenantResponse,
  DeleteTenantParams,
  CreateTenantBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatTenant(t: typeof tenantsTable.$inferSelect, propertyName?: string | null) {
  return {
    ...t,
    rentAmount: parseFloat(t.rentAmount),
    securityDeposit: parseFloat(t.securityDeposit),
    propertyName: propertyName ?? null,
    createdAt: t.createdAt.toISOString(),
  };
}

router.get("/tenants", async (req, res): Promise<void> => {
  const qp = ListTenantsQueryParams.safeParse(req.query);
  if (!qp.success) { res.status(400).json({ error: qp.error.message }); return; }

  const { propertyId, search, status } = qp.data;
  const conditions: SQL[] = [];
  if (propertyId) conditions.push(eq(tenantsTable.propertyId, propertyId));
  if (status) conditions.push(eq(tenantsTable.status, status));
  if (search) conditions.push(ilike(tenantsTable.fullName, `%${search}%`));

  const rows = await db
    .select({
      tenant: tenantsTable,
      propertyName: propertiesTable.name,
    })
    .from(tenantsTable)
    .leftJoin(propertiesTable, eq(tenantsTable.propertyId, propertiesTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(tenantsTable.fullName);

  res.json(ListTenantsResponse.parse(rows.map(r => formatTenant(r.tenant, r.propertyName))));
});

router.post("/tenants", async (req, res): Promise<void> => {
  const parsed = CreateTenantBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [tenant] = await db.insert(tenantsTable).values(parsed.data).returning();
  let propertyName: string | null = null;
  if (tenant.propertyId) {
    const [prop] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, tenant.propertyId));
    propertyName = prop?.name ?? null;
  }
  res.status(201).json(GetTenantResponse.parse(formatTenant(tenant, propertyName)));
});

router.get("/tenants/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetTenantParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db
    .select({ tenant: tenantsTable, propertyName: propertiesTable.name })
    .from(tenantsTable)
    .leftJoin(propertiesTable, eq(tenantsTable.propertyId, propertiesTable.id))
    .where(eq(tenantsTable.id, params.data.id));
  if (!row) { res.status(404).json({ error: "Tenant not found" }); return; }
  res.json(GetTenantResponse.parse(formatTenant(row.tenant, row.propertyName)));
});

router.patch("/tenants/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateTenantParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateTenantBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [tenant] = await db.update(tenantsTable).set(parsed.data).where(eq(tenantsTable.id, params.data.id)).returning();
  if (!tenant) { res.status(404).json({ error: "Tenant not found" }); return; }
  let propertyName: string | null = null;
  if (tenant.propertyId) {
    const [prop] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, tenant.propertyId));
    propertyName = prop?.name ?? null;
  }
  res.json(UpdateTenantResponse.parse(formatTenant(tenant, propertyName)));
});

router.delete("/tenants/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteTenantParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(tenantsTable).where(eq(tenantsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
