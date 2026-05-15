import { pgTable, uuid, text, timestamp, numeric } from "drizzle-orm/pg-core";
import { sensorsTable } from "./sensors";

export const waterReadingsTable = pgTable("water_readings", {
  id: uuid("id").defaultRandom().primaryKey(),
  sensor_id: uuid("sensor_id").references(() => sensorsTable.id),
  temperature: numeric("temperature"),
  ph: numeric("ph"),
  turbidity: numeric("turbidity"),
  dissolved_oxygen: numeric("dissolved_oxygen"),
  water_level: numeric("water_level"),
  created_at: timestamp("created_at").defaultNow(),
});

export type WaterReading = typeof waterReadingsTable.$inferSelect;
export type NewWaterReading = typeof waterReadingsTable.$inferInsert;