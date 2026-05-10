import {
  pgTable,
  serial,
  text,
  timestamp,
  numeric,
  boolean,
} from "drizzle-orm/pg-core";

export const waterReadingsTable = pgTable("water_readings", {
  id: serial("id").primaryKey(),
  sensor_id: text("sensor_id"),
  temperature: numeric("temperature", { precision: 10, scale: 2 }).notNull(),
  ph: numeric("ph", { precision: 10, scale: 2 }).notNull(),
  turbidity: numeric("turbidity", { precision: 10, scale: 2 }).notNull(),
  dissolved_oxygen: numeric("dissolved_oxygen", {
    precision: 10,
    scale: 2,
  }).notNull(),
  water_level: numeric("water_level", { precision: 10, scale: 2 }).notNull(),
  is_anomaly: boolean("is_anomaly").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export type WaterReading = typeof waterReadingsTable.$inferSelect;
export type NewWaterReading = typeof waterReadingsTable.$inferInsert;
