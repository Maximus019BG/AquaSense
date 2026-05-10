import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { waterReadingsTable } from "~/server/db/schema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      temperature,
      ph,
      turbidity,
      dissolved_oxygen,
      water_level,
      sensor_id,
    } = body;

    if (
      temperature === undefined ||
      ph === undefined ||
      turbidity === undefined ||
      dissolved_oxygen === undefined ||
      water_level === undefined
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const result = await db
      .insert(waterReadingsTable)
      .values({
        temperature: String(temperature),
        ph: String(ph),
        turbidity: String(turbidity),
        dissolved_oxygen: String(dissolved_oxygen),
        water_level: String(water_level),
        sensor_id: sensor_id || null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: result[0],
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
