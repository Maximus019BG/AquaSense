import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { sensorsTable, sensorReadingsTable } from "~/server/db/schema";
import { validateSensorApiKey } from "~/lib/auth-sensor";

export async function POST(request: NextRequest) {
  try {
    const authError = validateSensorApiKey(request);
    if (authError) return authError;

    const body = await request.json();
    const { id: sensor_id, value, ts } = body;

    if (!sensor_id || value === undefined || ts === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: id, value, ts" },
        { status: 400 },
      );
    }

    let sensor = await db
      .select({ id: sensorsTable.id })
      .from(sensorsTable)
      .where(eq(sensorsTable.id, sensor_id))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!sensor) {
      sensor = await db
        .insert(sensorsTable)
        .values({
          id: sensor_id,
          name: sensor_id,
          type: "unknown",
        })
        .returning({ id: sensorsTable.id })
        .then((rows) => rows[0]!);
    }

    const [reading] = await db
      .insert(sensorReadingsTable)
      .values({
        sensor_id: sensor!.id,
        value: Math.round(Number(value)),
        recorded_at: new Date(Number(ts) * 1000),
      })
      .returning();

    return NextResponse.json({ success: true, data: reading }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
