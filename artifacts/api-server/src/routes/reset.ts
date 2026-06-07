import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

const router: IRouter = Router();

router.post("/reset", async (req, res): Promise<void> => {
  const { mode } = req.body as { mode?: string };

  await db.execute(sql`TRUNCATE payments, charges, invoices, tenants, properties RESTART IDENTITY CASCADE`);

  if (mode === "sample") {
    await db.execute(sql`
      INSERT INTO properties (name, address, description, total_units) VALUES
      ('Sharma Residency', '42, MG Road, Koramangala, Bengaluru - 560034', 'Modern 4-floor residential building with parking', 12),
      ('Green Valley Apartments', '15, Nehru Nagar, Pune - 411015', 'Gated community with security and amenities', 8)
    `);

    await db.execute(sql`
      INSERT INTO tenants (property_id, full_name, phone, email, room_number, address, move_in_date, rent_amount, security_deposit, notes, status)
      SELECT p.id, t.full_name, t.phone, t.email, t.room_number, t.address, t.move_in_date, t.rent_amount, t.security_deposit, t.notes, t.status
      FROM properties p
      JOIN (VALUES
        ('Sharma Residency', 'Rajesh Kumar', '+91 98765 43210', 'rajesh.kumar@gmail.com', '101', 'Flat 101, Sharma Residency, Koramangala', '2024-01-15', 18000, 36000, 'Reliable tenant, pays on time', 'active'),
        ('Sharma Residency', 'Priya Sharma', '+91 99887 65432', 'priya.sharma@yahoo.com', '202', 'Flat 202, Sharma Residency, Koramangala', '2024-03-01', 15000, 30000, 'Works at IT company nearby', 'active'),
        ('Sharma Residency', 'Amit Patel', '+91 87654 32109', 'amit.patel@gmail.com', '303', 'Flat 303, Sharma Residency, Koramangala', '2023-11-01', 20000, 40000, 'Family of 3', 'active'),
        ('Green Valley Apartments', 'Sunita Verma', '+91 76543 21098', 'sunita.v@gmail.com', 'A101', 'A101, Green Valley Apartments, Pune', '2024-02-15', 12000, 24000, 'Single professional', 'active'),
        ('Green Valley Apartments', 'Vikram Singh', '+91 65432 10987', 'vikram.singh@outlook.com', 'B205', 'B205, Green Valley Apartments, Pune', '2023-08-01', 13500, 27000, null, 'inactive')
      ) AS t(property_name, full_name, phone, email, room_number, address, move_in_date, rent_amount, security_deposit, notes, status)
      ON (p.name = t.property_name)
    `);

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const pm = now.getMonth() === 0 ? 12 : now.getMonth();
    const py = now.getMonth() === 0 ? y - 1 : y;
    const pms = String(pm).padStart(2, "0");
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const pLastDay = new Date(py, pm, 0).getDate();

    await db.execute(sql`
      INSERT INTO invoices (invoice_number, tenant_id, billing_period_start, billing_period_end, due_date, rent_amount, status)
      SELECT inv.inv_num, t.id, inv.start_date, inv.end_date, inv.due_date, inv.rent, inv.status
      FROM tenants t
      JOIN (VALUES
        ('Rajesh Kumar', ${`INV-${y}${m}-0001`}, ${`${y}-${m}-01`}, ${`${y}-${m}-${String(lastDay).padStart(2,"0")}`}, ${`${y}-${m}-10`}, 18000, 'paid'),
        ('Priya Sharma',  ${`INV-${y}${m}-0002`}, ${`${y}-${m}-01`}, ${`${y}-${m}-${String(lastDay).padStart(2,"0")}`}, ${`${y}-${m}-10`}, 15000, 'unpaid'),
        ('Amit Patel',    ${`INV-${y}${m}-0003`}, ${`${y}-${m}-01`}, ${`${y}-${m}-${String(lastDay).padStart(2,"0")}`}, ${`${y}-${m}-10`}, 20000, 'partial'),
        ('Sunita Verma',  ${`INV-${y}${m}-0004`}, ${`${y}-${m}-01`}, ${`${y}-${m}-${String(lastDay).padStart(2,"0")}`}, ${`${y}-${m}-10`}, 12000, 'unpaid'),
        ('Rajesh Kumar',  ${`INV-${py}${pms}-0001`}, ${`${py}-${pms}-01`}, ${`${py}-${pms}-${String(pLastDay).padStart(2,"0")}`}, ${`${py}-${pms}-10`}, 18000, 'paid'),
        ('Priya Sharma',  ${`INV-${py}${pms}-0002`}, ${`${py}-${pms}-01`}, ${`${py}-${pms}-${String(pLastDay).padStart(2,"0")}`}, ${`${py}-${pms}-10`}, 15000, 'paid'),
        ('Amit Patel',    ${`INV-${py}${pms}-0003`}, ${`${py}-${pms}-01`}, ${`${py}-${pms}-${String(pLastDay).padStart(2,"0")}`}, ${`${py}-${pms}-10`}, 20000, 'overdue')
      ) AS inv(tenant_name, inv_num, start_date, end_date, due_date, rent, status)
      ON (t.full_name = inv.tenant_name)
    `);

    await db.execute(sql`
      INSERT INTO payments (invoice_id, tenant_id, amount, payment_date, payment_method, transaction_ref, notes)
      SELECT i.id, t.id, p.amount, p.pay_date, p.method, p.ref, p.notes
      FROM invoices i
      JOIN tenants t ON t.id = i.tenant_id
      JOIN (VALUES
        ('Rajesh Kumar', ${`${y}-${m}-03`}, 18000, 'UPI',           ${`UPI${y}${m}001`}, 'Rent paid in full'),
        ('Amit Patel',   ${`${y}-${m}-05`}, 10000, 'bank transfer', ${`NEFT${y}${m}002`}, 'Partial payment'),
        ('Rajesh Kumar', ${`${py}-${pms}-02`}, 18000, 'UPI',        ${`UPI${py}${pms}001`}, 'Last month rent paid'),
        ('Priya Sharma', ${`${py}-${pms}-04`}, 15000, 'cash',       null, 'Cash payment received'),
        ('Amit Patel',   ${`${py}-${pms}-15`}, 5000, 'cheque',      'CHQ001234', 'Partial payment only')
      ) AS p(tenant_name, pay_date, amount, method, ref, notes)
      ON (t.full_name = p.tenant_name AND i.billing_period_start LIKE
        CASE WHEN p.pay_date LIKE ${`${y}-${m}%`} THEN ${`${y}-${m}%`} ELSE ${`${py}-${pms}%`} END)
    `);

    await db.execute(sql`
      INSERT INTO charges (invoice_id, charge_type, description, amount, is_recurring)
      SELECT i.id, c.charge_type, c.description, c.amount, c.recurring
      FROM invoices i
      JOIN tenants t ON t.id = i.tenant_id
      JOIN (VALUES
        ('Rajesh Kumar', ${`${y}-${m}-01`}, 'electricity', 'Electricity charges', 1850, true),
        ('Rajesh Kumar', ${`${y}-${m}-01`}, 'water',       'Water charges',        200, true),
        ('Priya Sharma', ${`${y}-${m}-01`}, 'electricity', 'Electricity charges', 2100, true),
        ('Amit Patel',   ${`${y}-${m}-01`}, 'electricity', 'Electricity bill',    1600, true),
        ('Amit Patel',   ${`${y}-${m}-01`}, 'maintenance', 'AC servicing',         500, false),
        ('Sunita Verma', ${`${y}-${m}-01`}, 'water',       'Water charges',         150, true),
        ('Amit Patel',   ${`${py}-${pms}-01`}, 'electricity', 'Electricity charges', 1400, true),
        ('Amit Patel',   ${`${py}-${pms}-01`}, 'late fee',    'Late payment penalty',  500, false)
      ) AS c(tenant_name, billing_start, charge_type, description, amount, recurring)
      ON (t.full_name = c.tenant_name AND i.billing_period_start = c.billing_start)
    `);

    req.log.info("Data reset to sample state");
    res.json({ ok: true, message: "Data restored to sample state." });
    return;
  }

  req.log.info("Data cleared to zero");
  res.json({ ok: true, message: "All data has been cleared." });
});

export default router;
