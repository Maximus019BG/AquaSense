import { pgTable, uuid, text, timestamp, numeric, integer } from "drizzle-orm/pg-core";

export const forecastTable = pgTable("forecasts", {
  id: uuid("id").defaultRandom().primaryKey(),
  parameter: text("parameter").notNull(),
  current_value: numeric("current_value"),
  predicted_value: numeric("predicted_value"),
  confidence: integer("confidence"),
  predicted_for: timestamp("predicted_for"),
  created_at: timestamp("created_at").defaultNow(),
});

export type Forecast = typeof forecastTable.$inferSelect;
export type NewForecast = typeof forecastTable.$inferInsert;