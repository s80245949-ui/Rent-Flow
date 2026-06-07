import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, propertiesTable } from "@workspace/db";
import {
  ListPropertiesResponse,
  GetPropertyParams,
  GetPropertyResponse,
  UpdatePropertyParams,
  UpdatePropertyBody,
  UpdatePropertyResponse,
  DeletePropertyParams,
  CreatePropertyBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/properties", async (_req, res): Promise<void> => {
  const props = await db.select().from(propertiesTable).orderBy(propertiesTable.name);
  res.json(ListPropertiesResponse.parse(props.map(p => ({
    ...p,
    totalUnits: p.totalUnits,
    createdAt: p.createdAt.toISOString(),
  }))));
});

router.post("/properties", async (req, res): Promise<void> => {
  const parsed = CreatePropertyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [prop] = await db.insert(propertiesTable).values(parsed.data).returning();
  res.status(201).json(GetPropertyResponse.parse({ ...prop, createdAt: prop.createdAt.toISOString() }));
});

router.get("/properties/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetPropertyParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [prop] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, params.data.id));
  if (!prop) { res.status(404).json({ error: "Property not found" }); return; }
  res.json(GetPropertyResponse.parse({ ...prop, createdAt: prop.createdAt.toISOString() }));
});

router.patch("/properties/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdatePropertyParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdatePropertyBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [prop] = await db.update(propertiesTable).set(parsed.data).where(eq(propertiesTable.id, params.data.id)).returning();
  if (!prop) { res.status(404).json({ error: "Property not found" }); return; }
  res.json(UpdatePropertyResponse.parse({ ...prop, createdAt: prop.createdAt.toISOString() }));
});

router.delete("/properties/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeletePropertyParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(propertiesTable).where(eq(propertiesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
