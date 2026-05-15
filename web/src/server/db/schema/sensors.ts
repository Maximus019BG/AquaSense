import { pgTable, uuid, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const sensorsTable = pgTable("sensors", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  status: text("status").default("online"),
  last_reading: text("last_reading"),
  location: text("location"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export type Sensor = typeof sensorsTable.$inferSelect;
export type NewSensor = typeof sensorsTable.$inferInsert;