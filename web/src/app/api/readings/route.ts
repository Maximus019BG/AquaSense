import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "~/server/db";
import { waterReadingsTable } from "~/server/db/schema";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Ideally, you would validate the device_key here

    // Map your gateway data to your database schema
    // Adjust fields based on what columns actually exist in waterReadingsTable
    await db.insert(waterReadingsTable).values({
      temperature: body.temperature?.toString() || "0",
      ph: body.ph?.toString() || "0",
      turbidity: body.turbidity?.toString() || "0",
      // Since dissolved_oxygen and water_level might not map directly from the gateway, we'll provide defaults
      // or you can add them to your hardware payload.
      dissolved_oxygen: "0",
      water_level: "0",
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}

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
