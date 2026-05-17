import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const FALLBACK_CSV_PATH = path.resolve(process.cwd(), "..", "docs", "data", "processed", "burgas_final.csv");

async function getFallbackReading() {
  const csv = await readFile(FALLBACK_CSV_PATH, "utf-8");
  const lines = csv.trim().split(/\r?\n/);

  if (lines.length < 2) {
    throw new Error("No fallback readings available");
  }

  const headers = lines[0].split(",");
  const values = lines[lines.length - 1].split(",");
  const row: Record<string, string> = {};

  headers.forEach((header, index) => {
    row[header] = values[index] ?? "";
  });

  return {
    success: true,
    data: {
      temperature: Number(row.temperature_C),
      ph: Number(row.ph),
      turbidity: Number(row.turbidity_kd),
      dissolvedOxygen: Number(row.dissolved_o2),
      waterLevel: Number(row.sea_level_m),
      salinity: Number(row.salinity_psu),
      currentSpeed: Number(row.current_speed_m_s),
      timestamp: row.time,
      source: "fallback_csv",
    },
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { db } = await import("~/server/db");
    const { waterReadingsTable } = await import("~/server/db/schema");

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
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(await getFallbackReading());
    }

    const { desc } = await import("drizzle-orm");
    const { db } = await import("~/server/db");
    const { waterReadingsTable } = await import("~/server/db/schema");

    const result = await db
      .select()
      .from(waterReadingsTable)
      .orderBy(desc(waterReadingsTable.created_at))
      .limit(1);

    const data = result[0];

    if (!data) {
      return NextResponse.json(await getFallbackReading());
    }

    return NextResponse.json({
      success: true,
      data: {
        temperature: Number(data.temperature),
        ph: Number(data.ph),
        turbidity: Number(data.turbidity),
        dissolvedOxygen: Number(data.dissolved_oxygen),
        waterLevel: Number(data.water_level),
        salinity: null,
        currentSpeed: null,
        timestamp: data.created_at,
      },
    });
  } catch {
    try {
      return NextResponse.json(await getFallbackReading());
    } catch (fallbackError) {
      const errorMessage =
        fallbackError instanceof Error ? fallbackError.message : "Unknown error";
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 },
      );
    }
  }
}
