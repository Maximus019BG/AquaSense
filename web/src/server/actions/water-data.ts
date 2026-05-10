"use server";

import { desc, gte } from "drizzle-orm";
import { db } from "~/server/db";
import { waterReadingsTable } from "~/server/db/schema";

export async function getLatestReading() {
  try {
    const result = await db
      .select()
      .from(waterReadingsTable)
      .orderBy(desc(waterReadingsTable.created_at))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error("Error fetching latest reading:", error);
    return null;
  }
}

export async function getHistoricalReadings(hours: number = 24) {
  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const results = await db
      .select()
      .from(waterReadingsTable)
      .where(gte(waterReadingsTable.created_at, since))
      .orderBy(waterReadingsTable.created_at);

    return results;
  } catch (error) {
    console.error("Error fetching historical readings:", error);
    return [];
  }
}
