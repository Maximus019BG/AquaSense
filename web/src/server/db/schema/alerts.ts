import { pgTable, uuid, text, timestamp, numeric, boolean, pgEnum } from "drizzle-orm/pg-core";

export const alertTypeEnum = pgEnum("alert_type", ["critical", "warning", "info"]);

export const alertsTable = pgTable("alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: alertTypeEnum("type").notNull(),
  message: text("message").notNull(),
  parameter: text("parameter").notNull(),
  value: numeric("value"),
  threshold: numeric("threshold"),
  acknowledged: boolean("acknowledged").default(false),
  created_at: timestamp("created_at").defaultNow(),
});

export type Alert = typeof alertsTable.$inferSelect;
export type NewAlert = typeof alertsTable.$inferInsert;