import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { propertiesTable } from "./properties";

export const tenantsTable = pgTable("tenants", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => propertiesTable.id, { onDelete: "set null" }),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  roomNumber: text("room_number").notNull(),
  address: text("address"),
  moveInDate: text("move_in_date").notNull(),
  rentAmount: numeric("rent_amount", { precision: 12, scale: 2 }).notNull(),
  securityDeposit: numeric("security_deposit", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTenantSchema = createInsertSchema(tenantsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenantsTable.$inferSelect;
