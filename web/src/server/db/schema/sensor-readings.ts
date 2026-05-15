import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sensorsTable } from "./sensors";

export const sensorReadingsTable = pgTable("sensor_readings", {
  id: uuid("id").defaultRandom().primaryKey(),
  sensor_id: text("sensor_id")
    .notNull()
    .references(() => sensorsTable.id),
  value: integer("value").notNull(),
  recorded_at: timestamp("recorded_at").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export type SensorReading = typeof sensorReadingsTable.$inferSelect;
export type NewSensorReading = typeof sensorReadingsTable.$inferInsert;
