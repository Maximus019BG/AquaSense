import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "~/server/db";
import { waterReadingsTable } from "~/server/db/schema";

export async function GET() {
  try {
    const result = await db
      .select()
      .from(waterReadingsTable)
      .orderBy(desc(waterReadingsTable.created_at))
      .limit(1);

    const data = result[0];

    if (!data) {
      return NextResponse.json(
        { success: false, error: "No readings found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        temperature: Number(data.temperature),
        ph: Number(data.ph),
        turbidity: Number(data.turbidity),
        dissolvedOxygen: Number(data.dissolved_oxygen),
        waterLevel: Number(data.water_level),
        timestamp: data.created_at,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}
